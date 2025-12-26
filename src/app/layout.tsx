import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Header from '@/components/Header';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Camp Quiz Learner",
  description: "Interactive Bible quiz app for camp learning",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Camp Quiz Learner",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Camp Quiz Learner",
    title: "Camp Quiz Learner",
    description: "Interactive Bible quiz app for camp learning",
  },
  twitter: {
    card: "summary",
    title: "Camp Quiz Learner",
    description: "Interactive Bible quiz app for camp learning",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Camp Quiz Learner" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2563eb" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen bg-background text-foreground">
              <Header />
              <main className="grow p-4 sm:p-6 max-w-7xl mx-auto w-full">
                {children}
              </main>
              <footer className="text-center py-4 text-muted-foreground border-t border-border">
                © {new Date().getFullYear()} Camp Quiz Learner
              </footer>
            </div>
          </AuthProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                      console.log('SW registered: ', registration);
                      
                      // Check for updates every hour
                      setInterval(() => {
                        registration.update();
                      }, 3600000);
                      
                      // Check for updates on page focus
                      document.addEventListener('visibilitychange', () => {
                        if (!document.hidden) {
                          registration.update();
                        }
                      });
                      
                      // Listen for updates
                      registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                            // New service worker activated - reload the page
                            console.log('New service worker activated - reloading page');
                            window.location.reload();
                          }
                        });
                      });
                    })
                    .catch((registrationError) => {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
