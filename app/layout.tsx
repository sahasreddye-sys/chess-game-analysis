import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chess Game Analysis",
  description:
    "Free game review from a pasted PGN — find your mistakes, strengths, and what to study next.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
