import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import Navbar from "@/components/Navbar/Navbar";
import MobileBottomNav from "@/components/Landing/MobileNav";
import PageShell from "@/components/PageShell";
import IdentityVerificationModal from "@/components/VerificationModal";
import { ThemeProvider } from "@/components/Landing/ThemeProvider";
import { AuthProvider } from "@/lib/auth";
import { IdentityVerificationProvider } from "@/lib/IdentityVerification";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Airbnb",
  description: "Find places to stay and experiences to enjoy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <IdentityVerificationProvider>
              <Navbar />
              <PageShell>{children}</PageShell>
              <MobileBottomNav />
              <IdentityVerificationModal />
              <Toaster position="bottom-right" richColors closeButton />
            </IdentityVerificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
