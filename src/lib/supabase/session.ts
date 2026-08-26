import { redirect } from 'next/navigation';
import { createClient } from './server';
import type { Profile } from '@/types/database';

/** Devuelve el perfil del usuario autenticado o redirige a /login. */
export async function requireProfile(): Promise<Profile> {
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
}

/** Igual que requireProfile pero exige rol moderator/admin. */
export async function requireStaff(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== 'moderator' && profile.role !== 'admin') redirect('/lab');
  return profile;
}
