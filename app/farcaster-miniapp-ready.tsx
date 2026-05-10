"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export function FarcasterMiniAppReady() {
  useEffect(() => {
    let cancelled = false;

    async function markReady() {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        if (!cancelled && isMiniApp) {
          await sdk.actions.ready();
        }
      } catch {
        // Regular browser sessions should continue without Mini App host APIs.
      }
    }

    markReady();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

