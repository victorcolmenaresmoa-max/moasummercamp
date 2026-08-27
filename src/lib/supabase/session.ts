import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './server';
import { getVerifiedUserId } from './auth';
import type { Profile } from '@/types/database';

/** Returns the authenticated user's profile or redirects to /login. */
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, campus, role, group_name, workbook_route, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (!profile) redirect('/login?error=no-profile');
  return profile as Profile;
});

/** Same as requireProfile, but requires moderator/admin access. */
export const requireStaff = cache(async (): Promise<Profile> => {
  const profile = await requireProfile();
  if (profile.role !== 'moderator' && profile.role !== 'admin') redirect('/lab');
  return profile;
});
