export default function DashboardHeader({ name }: { name: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold text-primary-dark mb-4">Dashboard</h1>
      <h2 className="text-xl font-semibold text-primary-dark">Welcome back, {name}!</h2>
      <p className="text-sm text-muted-foreground mt-1">Start by uploading your latest blood test.</p>
    </header>
  );
}
