# Verify 1v1 on a Vercel Preview

1v1 uses Vercel Functions WebSockets and Redis. It intentionally returns an unavailable response when `REDIS_URL` is missing; it has no process-memory fallback.

Vercel's June 2026 WebSocket guide and support article describe WebSocket support as available, while the general limits page still says Functions do not support WebSockets. The guide also calls `experimental_upgradeWebSocket()` experimental. Treat a real Preview handshake and two-session test as a release gate; do not assume local tests prove it works.

## Configure Preview Redis

1. Link this repository to its Vercel project with `vercel link`.
2. Add Upstash Redis from the Vercel Marketplace and expose its `REDIS_URL` in the **Preview** environment. Add it to **Development** only if you also want to try `vercel dev`.
3. Confirm Preview has `REDIS_URL` without printing or committing its value. Create a Preview deployment from a branch or pull request.

Vercel documents `experimental_upgradeWebSocket()` as a Preview/Function feature. Plain `next dev` does not provide its upgrade runtime, so it is not a WebSocket acceptance test.

## Two-browser check

Use two independent Chrome or Edge profiles on the Preview URL:

1. Profile A creates a room and shares its six-character code.
2. Profile B joins. Both should show the same question and player list.
3. Answer from both profiles. The score and next question should update in both without refreshing.
4. Refresh one profile. It should reconnect and load the current match snapshot.
5. Finish the 10 questions and verify both profiles show the same result.

If the WebSocket handshake fails or messages do not cross profiles, stop here and inspect the Preview Function and Redis logs before choosing another provider.
