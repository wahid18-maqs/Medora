import type { Metadata } from "next";
import DashboardAuthGuard from "@/components/layout/DashboardAuthGuard";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | Medora",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardAuthGuard>{children}</DashboardAuthGuard>;
}
