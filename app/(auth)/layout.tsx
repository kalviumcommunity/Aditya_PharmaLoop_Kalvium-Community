import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="flex-1 flex flex-col">{children}</main>;
}
