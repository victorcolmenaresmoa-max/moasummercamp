import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './server';
import type { Profile } from '@/types/database';

/** Returns the authenticated user's profile or redirects to /login. */
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
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
