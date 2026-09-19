# MedNotes architecture

`electron/` starts the desktop application, creates its window, and receives approved renderer requests.

`renderer/` contains the interface shown inside the Electron window. It cannot access Node.js or the filesystem directly.

`services/` contains the application work:

- `storage/` saves, edits, reads, trashes, restores, and permanently deletes posts.
- `embedding/` turns post and search text into vectors using the local model.
- `search/` ranks posts with cosine similarity.
- `tags/` reads and writes post tags.

`models/` contains the local embedding model. It is never loaded by the renderer.

`tests/` verifies storage, embeddings, search, and the real Electron interface.

Runtime flow:

```text
renderer -> preload bridge -> IPC handlers -> services -> ~/MedNotes
```

The Next.js website is a separate application in the repository root. Its temporary download and open routes are tracked in `ROADMAP.md` and will be replaced after the DMG exists.
