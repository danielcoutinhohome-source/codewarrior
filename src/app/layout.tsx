import type { Metadata, Viewport } from "next";
import "@fontsource/lilita-one/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "@fontsource/nunito/900.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeWarrior",
  description: "Battle your way from AP CSA basics to real LeetCode problems.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#DFF2FF",
};

// Fonts are bundled with the site, so nothing loads from outside servers.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
