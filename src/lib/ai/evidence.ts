export const AI_EVIDENCE_BUCKET = 'ai-evidence';

export type ExternalAiEvidence = {
  version: 1;
  kind: 'external_ai_evidence';
  provider: string;
  text: string | null;
  imagePath: string | null;
  imageName: string | null;
  imageMime: string | null;
};

export function encodeExternalAiEvidence(value: Omit<ExternalAiEvidence, 'version' | 'kind'>): string {
  return JSON.stringify({ version: 1, kind: 'external_ai_evidence', ...value } satisfies ExternalAiEvidence);
}

export function parseExternalAiEvidence(raw: string | null | undefined): ExternalAiEvidence | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ExternalAiEvidence>;
    if (parsed?.kind !== 'external_ai_evidence' || parsed?.version !== 1) return null;
    return {
      version: 1,
      kind: 'external_ai_evidence',
      provider: typeof parsed.provider === 'string' && parsed.provider.trim() ? parsed.provider : 'External AI',
      text: typeof parsed.text === 'string' && parsed.text.trim() ? parsed.text : null,
      imagePath: typeof parsed.imagePath === 'string' && parsed.imagePath.trim() ? parsed.imagePath : null,
      imageName: typeof parsed.imageName === 'string' && parsed.imageName.trim() ? parsed.imageName : null,
      imageMime: typeof parsed.imageMime === 'string' && parsed.imageMime.trim() ? parsed.imageMime : null,
    };
  } catch {
    return null;
  }
}

export function evidenceSectionId(sectionId: string, fieldKey: string): string {
  return `${sectionId}:${fieldKey}`;
}
