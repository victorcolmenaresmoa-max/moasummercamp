import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthShell } from '@/components/auth/AuthShell';

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const nextPath = typeof searchParams.next === 'string' && searchParams.next.startsWith('/')
    ? searchParams.next
    : undefined;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Your workbook is waiting where you left it."
      footer={
        <>
          First time here?{' '}
          <Link href="/signup" className="font-bold text-teal-600 underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}
