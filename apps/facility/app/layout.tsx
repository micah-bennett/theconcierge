import type { Metadata, Viewport } from "next";
import "@hop/shared/styles/portal.css";

export const metadata: Metadata = {
  title: "Facility View · HOP",
  description: "Radical Hospitality for the people who keep healthcare running.",
  icons: { icon: "/logo.png" }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#012f6c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="desk-app">{children}</body>
    </html>
  );
}
