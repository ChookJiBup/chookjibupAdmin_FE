"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

export function GlobalFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/console") || pathname.startsWith("/staff")) return null;
  return <Footer />;
}
