import type { Metadata, Viewport } from "next";
import "@fontsource/lilita-one/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "@fontsource/nunito/900.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/800.css";
import "./globals.css";
import DbStatus from "@/components/DbStatus";

export const metadata: Metadata = {
  title: "CodeWarrior",
  description: "Battle your way from AP CSA basics to real LeetCode problems.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#DFF2FF",
};

// Right after a deploy, a browser can hold a cached page that points at code files the new
// deploy replaced, which leaves a blank screen. When one of the site's own files fails to load,
// reload once to fetch the current page. The timestamp stops reload loops.
const RECOVER = `(function(){function r(){try{var k="cw.recover",t=+sessionStorage.getItem(k)||0;if(Date.now()-t<30000)return;sessionStorage.setItem(k,String(Date.now()))}catch(e){}location.reload()}
addEventListener("error",function(e){var n=e.target;var u=n&&(n.src||n.href);if(u&&u.indexOf("/_next/")>-1)r()},true);
addEventListener("unhandledrejection",function(e){var m=String(e.reason&&(e.reason.name+" "+e.reason.message)||"");if(/ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module/i.test(m))r()});})();`;

// Fonts are bundled with the site, so nothing loads from outside servers.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: RECOVER }} />
      </head>
      <body>
        {children}
        <DbStatus />
      </body>
    </html>
  );
}
