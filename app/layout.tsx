import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lyrio Analytics",
  description: "Unified PostHog + RevenueCat analytics dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
