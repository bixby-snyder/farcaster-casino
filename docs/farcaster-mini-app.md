# Farcaster Mini App

This repo is staged as a Farcaster Mini App and an Overtime Casino affiliate wrapper.

## Wired

- `@farcaster/miniapp-sdk` is installed.
- `app/farcaster-miniapp-ready.tsx` calls `sdk.actions.ready()` after the client app loads inside a Mini App host.
- `public/.well-known/farcaster.json` exists with placeholder-safe metadata and `noindex: true`.
- Root metadata includes `fc:miniapp` and backward-compatible `fc:frame` embed tags with placeholder URLs.
- The home UI includes a share-to-cast placeholder using `sdk.actions.composeCast()`.

## Placeholder

The manifest and embed URLs intentionally use `https://example.com` until the final Vercel or custom domain and production image assets are confirmed. Do not treat the current manifest as production-ready.

No Farcaster API keys, signer credentials, webhook secrets, notification tokens, or production manifest values are committed.

## Required Before Launch

- Final app domain.
- Final 1024x1024 PNG icon URL.
- Final Mini App card/OG image URL.
- Optional webhook URL if notifications are added.
- Farcaster Developer Tools validation of `/.well-known/farcaster.json`.

