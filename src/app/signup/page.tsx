import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignupForm } from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <AuthShell
      title="Create my account"
      subtitle="Select your campus and the route assigned by your moderator."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-teal-600 underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
