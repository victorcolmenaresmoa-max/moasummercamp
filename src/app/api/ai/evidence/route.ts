import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import {
  AI_EVIDENCE_BUCKET,
  encodeExternalAiEvidence,
  evidenceSectionId,
  parseExternalAiEvidence,
} from '@/lib/ai/evidence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 3_500_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

async function ensureEvidenceBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.storage.getBucket(AI_EVIDENCE_BUCKET);
  if (data) return;

  const { error } = await admin.storage.createBucket(AI_EVIDENCE_BUCKET, {
    public: false,
    fileSizeLimit: `${MAX_IMAGE_BYTES}`,
    allowedMimeTypes: Array.from(ALLOWED_IMAGE_TYPES),
  });

  // Another first request may have created it at the same moment.
  if (error) {
    const { data: retry } = await admin.storage.getBucket(AI_EVIDENCE_BUCKET);
    if (!retry) throw error;
  }
}

function cleanString(value: FormDataEntryValue | null, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(req: Request) {
  const supabase = createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server storage is not configured.' }, { status: 500 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid evidence form.' }, { status: 400 });

  const day = Number(cleanString(form.get('day'), 2));
  const sectionId = cleanString(form.get('sectionId'), 160);
  const fieldKey = cleanString(form.get('fieldKey'), 160);
  const prompt = cleanString(form.get('prompt'), 12_000);
  const responseText = cleanString(form.get('responseText'), 40_000);
  const provider = cleanString(form.get('provider'), 80) || 'Google Gemini';
  const imageEntry = form.get('image');
  const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;

  if (![1, 2, 3, 4].includes(day) || !sectionId || !fieldKey || !prompt) {
    return NextResponse.json({ error: 'Day, section, field, and prompt are required.' }, { status: 400 });
  }

  if (!responseText && !imageFile) {
    return NextResponse.json({ error: 'Add the AI response as text or upload a screenshot.' }, { status: 400 });
  }

  if (imageFile && (!ALLOWED_IMAGE_TYPES.has(imageFile.type) || imageFile.size > MAX_IMAGE_BYTES)) {
    return NextResponse.json(
      { error: 'The screenshot must be PNG, JPG, or WebP and smaller than 3.5 MB.' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  let imagePath: string | null = null;

  try {
    if (imageFile) {
      await ensureEvidenceBucket(admin);
      const ext = imageFile.type === 'image/png' ? 'png' : imageFile.type === 'image/webp' ? 'webp' : 'jpg';
      imagePath = `${userId}/day-${day}/${Date.now()}-${randomUUID()}.${ext}`;
      const bytes = Buffer.from(await imageFile.arrayBuffer());
      const { error: uploadError } = await admin.storage.from(AI_EVIDENCE_BUCKET).upload(imagePath, bytes, {
        contentType: imageFile.type,
        upsert: false,
        cacheControl: '3600',
      });
      if (uploadError) throw uploadError;
    }

    const encodedResponse = encodeExternalAiEvidence({
      provider,
      text: responseText || null,
      imagePath,
      imageName: imageFile ? imageFile.name.slice(0, 240) : null,
      imageMime: imageFile ? imageFile.type : null,
    });

    const { data: interaction, error: insertError } = await admin
      .from('ai_interactions')
      .insert({
        user_id: userId,
        day,
        section_id: evidenceSectionId(sectionId, fieldKey),
        prompt,
        response: encodedResponse,
      })
      .select('id, day, section_id, prompt, response, created_at')
      .single();

    if (insertError) throw insertError;

    let imageUrl: string | null = null;
    if (imagePath) {
      const { data: signed } = await admin.storage.from(AI_EVIDENCE_BUCKET).createSignedUrl(imagePath, 60 * 60);
      imageUrl = signed?.signedUrl ?? null;
    }

    return NextResponse.json({
      evidence: {
        ...interaction,
        parsed: parseExternalAiEvidence(interaction.response),
        imageUrl,
      },
    });
  } catch (error: any) {
    if (imagePath) await admin.storage.from(AI_EVIDENCE_BUCKET).remove([imagePath]).catch(() => undefined);
    console.error('[ai/evidence]', error);
    return NextResponse.json({ error: error?.message ?? 'Could not save AI evidence.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const supabase = createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server storage is not configured.' }, { status: 500 });
  }

  const url = new URL(req.url);
  const day = Number(url.searchParams.get('day'));
  const sectionId = (url.searchParams.get('sectionId') ?? '').slice(0, 160);
  const fieldKey = (url.searchParams.get('fieldKey') ?? '').slice(0, 160);
  if (![1, 2, 3, 4].includes(day) || !sectionId || !fieldKey) {
    return NextResponse.json({ error: 'Invalid evidence query.' }, { status: 400 });
  }

  const { data: interactions, error } = await supabase
    .from('ai_interactions')
    .select('id, day, section_id, prompt, response, created_at')
    .eq('user_id', userId)
    .eq('day', day)
    .eq('section_id', evidenceSectionId(sectionId, fieldKey))
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient();
  const evidence = await Promise.all(
    (interactions ?? []).map(async (interaction) => {
      const parsed = parseExternalAiEvidence(interaction.response);
      let imageUrl: string | null = null;
      if (parsed?.imagePath) {
        const { data: signed } = await admin.storage
          .from(AI_EVIDENCE_BUCKET)
          .createSignedUrl(parsed.imagePath, 60 * 60);
        imageUrl = signed?.signedUrl ?? null;
      }
      return { ...interaction, parsed, imageUrl };
    }),
  );

  return NextResponse.json({ evidence });
}
