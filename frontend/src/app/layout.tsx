import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/hooks/useAuth";
import Providers from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Medora - Professional healthcare SaaS",
    template: "%s | Medora",
  },
  description:
    "Medora is a professional healthcare platform that turns blood test reports into clear, AI-powered insights.",
  openGraph: {
    title: "Medora - Professional healthcare SaaS",
    description:
      "Medora is a professional healthcare platform that turns blood test reports into clear, AI-powered insights.",
    siteName: "Medora",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Medora - Professional healthcare SaaS",
    description:
      "Medora is a professional healthcare platform that turns blood test reports into clear, AI-powered insights.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
