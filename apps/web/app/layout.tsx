import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./app-shell";

export const metadata: Metadata = {
  title: "Sales Agent",
  description: "Clay-like GTM platform for B2B sales reps",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
