export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 rounded-3xl" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-3xl" />
      <div className="skeleton h-96 rounded-3xl" />
    </div>
  );
}
