import type { Metadata } from "next";
import "./globals.css";
import "../styles/accerio.css";
import "../styles/workspace-shell.css";
import "../styles/workspace-patterns.css";

export const metadata: Metadata = {
  title: "Accerio HRMS | Employee operations and payroll",
  description: "Connect employee records, attendance, leave, approvals and payroll in one governed HRMS platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
