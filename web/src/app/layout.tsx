import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PeopleOps Control Center",
  description: "ESS and MSS workspace for the HRMS SaaS platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
