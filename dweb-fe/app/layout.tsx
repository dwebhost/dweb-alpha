import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import {Header} from "@/components/header";
import ContextProvider from "@/context";
import {Toaster} from "@/components/ui/sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "dWeb - Deploy decentralized websites",
  description: "Deploy decentralized websites with dWeb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      <ContextProvider>
        <Header />
        <main className="mx-auto max-w-screen-xl px-4 py-8">
          {children}
        </main>
        <Toaster />
      </ContextProvider>
      </body>
    </html>
  );
}
