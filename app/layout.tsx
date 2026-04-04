import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { siteConfig } from "@/lib/config/site";
import { cn } from "@/lib/utils";
import { Agentation } from "agentation";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description || "Ecommerce platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("font-sans", geist.variable)}
      style={{
        "--color-primary": process.env.NEXT_PUBLIC_COLOR_PRIMARY || "#f28b0d",
        "--color-secondary": process.env.NEXT_PUBLIC_COLOR_SECONDARY || "#2d6a4f",
        "--color-background-light": process.env.NEXT_PUBLIC_COLOR_BG_LIGHT || "#f8f7f5",
        "--color-background-dark": process.env.NEXT_PUBLIC_COLOR_BG_DARK || "#221a10",
      } as React.CSSProperties}
    >
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
