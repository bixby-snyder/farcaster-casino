import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";
import { FarcasterMiniAppReady } from "./farcaster-miniapp-ready";

const miniAppEmbed = {
  version: "1",
  imageUrl: "https://example.com/farcaster-casino-card.png",
  button: {
    title: "Open Casino",
    action: {
      type: "launch_miniapp",
      name: "Farcaster Casino",
      url: "https://example.com",
      splashImageUrl: "https://example.com/farcaster-casino-icon.png",
      splashBackgroundColor: "#06030B",
    },
  },
};

export const metadata: Metadata = {
  title: "Farcaster Casino",
  description: "Overtime Casino affiliate wrapper for Farcaster.",
  other: {
    "fc:miniapp": JSON.stringify(miniAppEmbed),
    "fc:frame": JSON.stringify({
      ...miniAppEmbed,
      button: {
        ...miniAppEmbed.button,
        action: {
          ...miniAppEmbed.button.action,
          type: "launch_frame",
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <FarcasterMiniAppReady />
          {children}
        </Providers>
      </body>
    </html>
  );
}
