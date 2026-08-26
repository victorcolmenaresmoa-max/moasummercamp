export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="skeleton h-44 w-full rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-44 w-full rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
