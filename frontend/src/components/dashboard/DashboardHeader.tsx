export default function DashboardHeader({
  name,
  hasResult = false,
}: {
  name: string;
  hasResult?: boolean;
}) {
  return (
    <header className="mb-6">
      <h1 className="mb-4 text-2xl font-semibold text-primary-dark">Dashboard</h1>
      <h2 className="text-xl font-semibold text-primary-dark">Welcome back, {name}!</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasResult
          ? "Review your latest blood test insights below."
          : "Start by uploading your latest blood test."}
      </p>
    </header>
  );
}
