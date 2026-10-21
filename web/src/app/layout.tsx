import type { Metadata } from "next";
import "./globals.css";
import "../styles/accerio.css";
import "../styles/workspace-shell.css";
import "../styles/workspace-patterns.css";

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
