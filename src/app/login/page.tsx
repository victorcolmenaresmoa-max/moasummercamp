import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthShell } from '@/components/auth/AuthShell';

const ERROR_MESSAGES: Record<string, string> = {
  'google-callback': 'Google did not return a valid authorization code. Please try again.',
  'google-session': 'Google verified the account, but the session could not be created. Please try again.',
  'no-profile': 'Your MOA profile could not be loaded. Please contact the moderator.',
};

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const nextPath = typeof searchParams.next === 'string' && searchParams.next.startsWith('/')
    ? searchParams.next
    : undefined;
  const errorMessage = typeof searchParams.error === 'string' ? ERROR_MESSAGES[searchParams.error] : undefined;

  return (
    <AuthShell
      title="Sign in with Google"
      subtitle="One click, no password. Your workbook opens where you left it."
      footer={
        <>
          First time here?{' '}
          <Link href="/signup" className="font-bold text-teal-600 underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {errorMessage && (
        <p className="mb-5 rounded-2xl border-2 border-coral-200 bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-700">
          {errorMessage}
        </p>
      )}
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}
