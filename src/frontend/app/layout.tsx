import type { Metadata } from "next";
import { Playfair_Display, Roboto } from "next/font/google";
import "./globals.css";

const headingFont = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
});

const normalFont = Roboto({
  variable: "--font-normal",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Research Showcase Portal",
  description: "Software Engineering 1 - Research Showcase Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${headingFont.variable} ${normalFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
