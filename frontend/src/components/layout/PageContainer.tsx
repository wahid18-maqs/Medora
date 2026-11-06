import { cn } from "@/lib/utils";

const WIDTHS = {
  narrow: "max-w-3xl",
  wide: "max-w-7xl",
  full: "max-w-none",
} as const;

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  width?: keyof typeof WIDTHS;
}

export default function PageContainer({
  children,
  className,
  width = "narrow",
}: PageContainerProps) {
  return (
    <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className={cn("w-full text-left", WIDTHS[width], className)}>
        {children}
      </div>
    </main>
  );
}
