import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </>
  );
}
