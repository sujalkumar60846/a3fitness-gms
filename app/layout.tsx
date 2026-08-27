import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gym Management System",
  description: "Member management, attendance, and billing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
