import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Crowd Carry — Deliver Smarter. Travel Together.",
  description: "AI-powered crowdshipping platform that connects package senders with travelers already going to the same destination. Reduce delivery costs, minimize carbon emissions, and create a sustainable logistics ecosystem.",
  keywords: "crowdshipping, package delivery, peer to peer delivery, sustainable logistics, travel together, AI matching",
  openGraph: {
    title: "Crowd Carry — Deliver Smarter. Travel Together.",
    description: "Connect package senders with travelers already going to the same destination.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased font-inter`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
