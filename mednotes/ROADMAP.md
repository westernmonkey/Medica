# MedNotes release roadmap

After the macOS DMG is ready:

1. Replace `/api/mednotes/download` so it downloads the built DMG instead of a source-code archive.
2. Replace `/api/mednotes/open` so the website never runs `npm start`.
3. Make **Open App** request `mednotes://open` for an installed app.
4. If macOS cannot open that protocol, show: **You need to download the app.**
5. Offer the DMG download beside that message.
