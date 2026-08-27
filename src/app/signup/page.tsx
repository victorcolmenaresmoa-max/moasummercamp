import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignupForm } from '@/components/auth/SignupForm';

export default function SignupPage({ searchParams }: { searchParams: { complete?: string } }) {
  const completing = searchParams.complete === '1';

  return (
    <AuthShell
      title={completing ? 'Finish your registration' : 'Create my account'}
      subtitle={
        completing
          ? 'Google is verified. Choose your campus and assigned workbook route to continue.'
          : 'Choose your campus and route, then register instantly with Google.'
      }
      footer={
        completing ? (
          <>This step protects the camp with the moderator code.</>
        ) : (
          <>
            Already registered?{' '}
            <Link href="/login" className="font-bold text-teal-600 underline-offset-4 hover:underline">
              Sign in with Google
            </Link>
          </>
        )
      }
    >
      <SignupForm completingExistingSession={completing} />
    </AuthShell>
  );
}
