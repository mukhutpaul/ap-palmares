import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "../components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "App Palmares",
  description: "Generated MKG",
};

// Layout enfant adapté : pas de <html> ni <body>
export default function ChildLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <NavBar />
      <div className="mx-[5%] mt-8">
        {children}
      </div>
    </div>
  );
}
