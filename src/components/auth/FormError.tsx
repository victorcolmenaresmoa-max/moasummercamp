export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-2xl border-2 border-coral-200 bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-700"
    >
      <span aria-hidden="true">!</span>
      <span>{children}</span>
    </p>
  );
}
