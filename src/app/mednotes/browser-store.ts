import { unzipSync, zipSync } from "fflate";

export type Post = {
  id: string;
  text: string;
  vector: Float32Array;
  tags: string[];
  createdAt: string;
  deletedAt: string | null;
  image: Blob | null;
  voice: Blob | null;
};

export type StoreState = "folder-required" | "permission-required" | "unsupported" | "ready";
export type BackupState = "folder-required" | "permission-required" | "ready";
type PostPayload = { text: string; vector: Float32Array; image?: Blob | null; voice?: Blob | null };
type DirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission(options?: { mode?: "readwrite" }): Promise<PermissionState>;
  requestPermission(options?: { mode?: "readwrite" }): Promise<PermissionState>;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
};
type Roots = { root: DirectoryHandle; active: DirectoryHandle; trash: DirectoryHandle; recovery: DirectoryHandle };

const ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_[a-f0-9]{4}$/;
const STORE_NAME = "mednotes-browser";
const STORE_VERSION = 2;
let roots: Roots | null = null;
let backupDirectory: DirectoryHandle | null = null;
let state: StoreState = "folder-required";
let backupState: BackupState = "folder-required";
let backend: "folder" | null = null;

function isDirectoryPickerAvailable() {
  return typeof window !== "undefined" && typeof (window as Window & { showDirectoryPicker?: unknown }).showDirectoryPicker === "function";
}

function openHandleDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORE_NAME, STORE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("handles")) request.result.createObjectStore("handles");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open browser storage."));
  });
}

async function storedHandle(key: "root" | "backup"): Promise<DirectoryHandle | null> {
  const database = await openHandleDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction("handles", "readonly").objectStore("handles").get(key);
    request.onsuccess = () => { database.close(); resolve((request.result as DirectoryHandle | undefined) || null); };
    request.onerror = () => { database.close(); reject(request.error || new Error("Could not read the saved folder.")); };
  });
}

async function saveHandle(key: "root" | "backup", handle: DirectoryHandle) {
  const database = await openHandleDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("handles", "readwrite");
    transaction.objectStore("handles").put(handle, key);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error("Could not remember the selected folder.")); };
  });
}

async function childDirectory(root: DirectoryHandle, name: string, create = false): Promise<DirectoryHandle> {
  return await root.getDirectoryHandle(name, { create }) as DirectoryHandle;
}

async function ensureRoots(root: DirectoryHandle): Promise<Roots> {
  const active = await childDirectory(root, "active", true);
  const trash = await childDirectory(root, ".trash", true);
  const recovery = await childDirectory(root, "recovery", true);
  return { root, active, trash, recovery };
}

async function permission(handle: DirectoryHandle, request: boolean) {
  if (typeof handle.queryPermission !== "function" || typeof handle.requestPermission !== "function") return false;
  const options = { mode: "readwrite" as const };
  const current = await handle.queryPermission(options);
  if (current === "granted") return true;
  return request && await handle.requestPermission(options) === "granted";
}

export async function initializeStore(): Promise<{ state: StoreState; backupState: BackupState; backend: "folder" | null; notesFolderName: string; backupFolderName: string }> {
  backend = null;
  roots = null;
  backupDirectory = null;
  if (!isDirectoryPickerAvailable()) {
    state = "unsupported";
    backupState = "folder-required";
    return { state, backupState, backend, notesFolderName: "", backupFolderName: "" };
  }

  backend = "folder";
  const handle = await storedHandle("root");
  if (!handle) state = "folder-required";
  else if (await permission(handle, false)) {
    roots = await ensureRoots(handle);
    state = "ready";
  } else state = "permission-required";

  const backup = await storedHandle("backup");
  if (!backup) backupState = "folder-required";
  else if (await permission(backup, false)) {
    backupDirectory = backup;
    backupState = "ready";
  } else backupState = "permission-required";
  return { state, backupState, backend, notesFolderName: roots?.root.name || "", backupFolderName: backupDirectory?.name || "" };
}

export async function connectFolder() {
  const picker = (window as Window & { showDirectoryPicker?: (options?: { id?: string; mode?: "readwrite" }) => Promise<DirectoryHandle> }).showDirectoryPicker;
  if (!picker) throw new Error("Folder saving is unavailable in this browser.");
  const handle = await picker({ id: "mednotes-posts", mode: "readwrite" });
  if (!await permission(handle, true)) throw new Error("MedNotes needs permission to use that folder.");
  await saveHandle("root", handle);
  roots = await ensureRoots(handle);
  backend = "folder";
  state = "ready";
  let migratedPosts = 0;
  let migrationError = "";
  try { migratedPosts = await copyLegacyBrowserPosts(roots); }
  catch (error) { migrationError = (error as Error).message; }
  return { ...await initializeStore(), migratedPosts, migrationError };
}

export async function connectBackupFolder() {
  const picker = (window as Window & { showDirectoryPicker?: (options?: { id?: string; mode?: "readwrite" }) => Promise<DirectoryHandle> }).showDirectoryPicker;
  if (!picker) throw new Error("Folder access is unavailable in this browser.");
  const handle = await picker({ id: "mednotes-backups", mode: "readwrite" });
  if (!await permission(handle, true)) throw new Error("MedNotes needs permission to use the backup folder.");
  await saveHandle("backup", handle);
  backupDirectory = handle;
  backupState = "ready";
  return { backupState, backupFolderName: handle.name };
}

export async function reconnectFolder() {
  const handle = await storedHandle("root");
  if (!handle) return connectFolder();
  if (!await permission(handle, true)) throw new Error("Folder permission was not granted.");
  await saveHandle("root", handle);
  roots = await ensureRoots(handle);
  state = "ready";
  return initializeStore();
}

export async function reconnectBackupFolder() {
  const handle = await storedHandle("backup");
  if (!handle) return connectBackupFolder();
  if (!await permission(handle, true)) throw new Error("Backup-folder permission was not granted.");
  backupDirectory = handle;
  backupState = "ready";
  return { backupState, backupFolderName: handle.name };
}

function currentRoots(): Roots {
  if (!roots || state !== "ready") throw new Error("Connect your MedNotes folder before continuing.");
  return roots;
}

async function writeBytes(directory: DirectoryHandle, name: string, bytes: Uint8Array) {
  const file = await directory.getFileHandle(name, { create: true });
  const writer = await file.createWritable();
  await writer.write(bytes.slice().buffer as ArrayBuffer);
  await writer.close();
}

async function readBytes(directory: DirectoryHandle, name: string) {
  const file = await directory.getFileHandle(name);
  return new Uint8Array(await (await file.getFile()).arrayBuffer());
}

async function readText(directory: DirectoryHandle, name: string) {
  return new TextDecoder().decode(await readBytes(directory, name));
}

async function listDirectories(directory: DirectoryHandle) {
  const entries: Array<[string, DirectoryHandle]> = [];
  for await (const [name, entry] of directory.entries()) {
    if (entry.kind === "directory") entries.push([name, entry as DirectoryHandle]);
  }
  return entries;
}

async function optionalBlob(directory: DirectoryHandle, filename: string) {
  try { return await (await directory.getFileHandle(filename)).getFile(); }
  catch (error) { if ((error as DOMException).name === "NotFoundError") return null; throw error; }
}

function createdAtFromId(id: string) {
  const date = new Date(id.split("_")[0].replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, "T$1:$2:$3.$4Z"));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

async function readPost(directory: DirectoryHandle, id: string, deleted: boolean): Promise<Post | null> {
  if (!ID_PATTERN.test(id)) return null;
  try {
    const text = await readText(directory, "text.md");
    const vectorBytes = await readBytes(directory, "vector.bin");
    if (vectorBytes.byteLength !== 384 * 4) return null;
    const vector = new Float32Array(vectorBytes.buffer.slice(vectorBytes.byteOffset, vectorBytes.byteOffset + vectorBytes.byteLength));
    let tags: unknown = [];
    try { tags = JSON.parse(await readText(directory, "tags.json")); } catch { tags = []; }
    if (!Array.isArray(tags) || !tags.every(tag => typeof tag === "string")) tags = [];
    let deletedAt: string | null = null;
    if (deleted) {
      try { deletedAt = JSON.parse(await readText(directory, "deleted.json")).deletedAt || null; } catch { deletedAt = null; }
    }
    return { id, text, vector, tags: tags as string[], createdAt: createdAtFromId(id), deletedAt, image: await optionalBlob(directory, "image.jpg"), voice: await optionalBlob(directory, "voice.webm") };
  } catch (error) {
    if ((error as DOMException).name === "NotFoundError") return null;
    throw error;
  }
}

async function readFrom(directory: DirectoryHandle, deleted: boolean) {
  const posts: Post[] = [];
  for (const [id, child] of await listDirectories(directory)) {
    const post = await readPost(child, id, deleted);
    if (post) posts.push(post);
  }
  return posts;
}

export async function readPosts() {
  const values = await readFrom(currentRoots().active, false);
  return values.sort((a, b) => b.id.localeCompare(a.id));
}

export async function readTrash() {
  const values = await readFrom(currentRoots().trash, true);
  return values.sort((a, b) => String(b.deletedAt || b.id).localeCompare(String(a.deletedAt || a.id)));
}

async function removeDirectory(parent: DirectoryHandle, name: string) {
  try { await parent.removeEntry(name, { recursive: true }); }
  catch (error) { if ((error as DOMException).name !== "NotFoundError") throw error; }
}

async function copyDirectory(source: DirectoryHandle, parent: DirectoryHandle, name: string) {
  const destination = await childDirectory(parent, name, true);
  for await (const [entryName, entry] of source.entries()) {
    if (entry.kind === "directory") await copyDirectory(entry as DirectoryHandle, destination, entryName);
    else {
      const bytes = await readBytes(source, entryName);
      await writeBytes(destination, entryName, bytes);
    }
  }
}

async function copyLegacyBrowserPosts(destination: Roots) {
  if (!navigator.storage?.getDirectory) return 0;
  let legacyRoot: DirectoryHandle;
  try {
    const browserRoot = await navigator.storage.getDirectory() as DirectoryHandle;
    legacyRoot = await childDirectory(browserRoot, "MedNotes");
  } catch (error) {
    if ((error as DOMException).name === "NotFoundError") return 0;
    throw error;
  }

  let copied = 0;
  for (const area of ["active", ".trash", "recovery"] as const) {
    let sourceArea: DirectoryHandle;
    try { sourceArea = await childDirectory(legacyRoot, area); }
    catch (error) { if ((error as DOMException).name === "NotFoundError") continue; throw error; }
    const targetArea = area === "active" ? destination.active : area === ".trash" ? destination.trash : destination.recovery;
    for (const [id, sourcePost] of await listDirectories(sourceArea)) {
      if (!ID_PATTERN.test(id)) continue;
      const existing = await childDirectory(targetArea, id).catch(error => {
        if ((error as DOMException).name === "NotFoundError") return null;
        throw error;
      });
      if (!existing) {
        await copyDirectory(sourcePost, targetArea, id);
        if (area === "active") copied++;
      }
    }
  }
  return copied;
}

async function writePost(parent: DirectoryHandle, id: string, payload: PostPayload, tags: string[] = []) {
  const directory = await childDirectory(parent, id, true);
  const vectorBytes = new Uint8Array(payload.vector.buffer, payload.vector.byteOffset, payload.vector.byteLength);
  await writeBytes(directory, "text.md", new TextEncoder().encode(payload.text));
  await writeBytes(directory, "vector.bin", vectorBytes);
  await writeBytes(directory, "tags.json", new TextEncoder().encode(JSON.stringify(tags)));
  if (payload.image) await writeBytes(directory, "image.jpg", new Uint8Array(await payload.image.arrayBuffer()));
  if (payload.voice) await writeBytes(directory, "voice.webm", new Uint8Array(await payload.voice.arrayBuffer()));
}

export async function savePost(payload: PostPayload) {
  const store = currentRoots();
  const id = new Date().toISOString().replace(/[:.]/g, "-") + "_" + crypto.getRandomValues(new Uint16Array(1))[0].toString(16).padStart(4, "0").slice(-4);
  try {
    await writePost(store.active, id, payload);
    await copyDirectory(await childDirectory(store.active, id), store.recovery, id);
  } catch (error) {
    await removeDirectory(store.active, id);
    await removeDirectory(store.recovery, id);
    throw error;
  }
  const posts = await readPosts();
  return posts.find(post => post.id === id) || null;
}

export async function editPost(id: string, payload: PostPayload) {
  if (!ID_PATTERN.test(id)) throw new Error("Invalid post ID.");
  const store = currentRoots();
  const old = await readPost(await childDirectory(store.active, id), id, false);
  if (!old) throw new Error("Post not found.");
  const tags = old.tags;
  try {
    await writePost(store.active, id, payload, tags);
    await removeDirectory(store.recovery, id);
    await copyDirectory(await childDirectory(store.active, id), store.recovery, id);
  } catch (error) {
    await writePost(store.active, id, { text: old.text, vector: old.vector, image: old.image, voice: old.voice }, tags);
    await removeDirectory(store.recovery, id);
    await copyDirectory(await childDirectory(store.active, id), store.recovery, id);
    throw error;
  }
}

export async function addTag(id: string, tag: string) {
  if (!ID_PATTERN.test(id)) throw new Error("Invalid post ID.");
  const cleaned = tag.trim();
  if (!cleaned || cleaned.length > 100) throw new Error("Enter a tag under 100 characters.");
  const store = currentRoots();
  const post = await readPost(await childDirectory(store.active, id), id, false);
  if (!post) throw new Error("Post not found.");
  const tags = post.tags.some(item => item.toLowerCase() === cleaned.toLowerCase()) ? post.tags : [...post.tags, cleaned];
  const bytes = new TextEncoder().encode(JSON.stringify(tags));
  const previous = new TextEncoder().encode(JSON.stringify(post.tags));
  try {
    await writeBytes(await childDirectory(store.recovery, id, true), "tags.json", bytes);
    await writeBytes(await childDirectory(store.active, id), "tags.json", bytes);
  } catch (error) {
    await writeBytes(await childDirectory(store.active, id, true), "tags.json", previous).catch(() => undefined);
    await writeBytes(await childDirectory(store.recovery, id, true), "tags.json", previous).catch(() => undefined);
    throw error;
  }
  return tags;
}

export async function moveToTrash(id: string) {
  if (!ID_PATTERN.test(id)) throw new Error("Invalid post ID.");
  const store = currentRoots();
  await copyDirectory(await childDirectory(store.active, id), store.trash, id);
  try {
    await writeBytes(await childDirectory(store.trash, id), "deleted.json", new TextEncoder().encode(JSON.stringify({ deletedAt: new Date().toISOString() })));
    await removeDirectory(store.active, id);
  } catch (error) {
    await removeDirectory(store.trash, id);
    throw error;
  }
}

export async function restorePost(id: string) {
  if (!ID_PATTERN.test(id)) throw new Error("Invalid post ID.");
  const store = currentRoots();
  const trashed = await childDirectory(store.trash, id);
  const active = await childDirectory(store.active, id).catch(() => null);
  if (active) throw new Error("An active post already exists with this ID.");
  const deleted = await readBytes(trashed, "deleted.json").catch(() => null);
  await trashed.removeEntry("deleted.json").catch(() => undefined);
  try {
  await copyDirectory(trashed, store.active, id);
    await removeDirectory(store.trash, id);
    await removeDirectory(store.recovery, id);
    await copyDirectory(await childDirectory(store.active, id), store.recovery, id);
  } catch (error) {
    await removeDirectory(store.active, id);
    await copyDirectory(trashed, store.trash, id);
    if (deleted) await writeBytes(await childDirectory(store.trash, id), "deleted.json", deleted);
    throw error;
  }
}

export async function deleteForever(id: string) {
  if (!ID_PATTERN.test(id)) throw new Error("Invalid post ID.");
  const store = currentRoots();
  await childDirectory(store.trash, id);
  await removeDirectory(store.trash, id);
  await removeDirectory(store.recovery, id);
}

export async function emptyTrash() {
  const ids = (await listDirectories(currentRoots().trash)).map(([id]) => id).filter(id => ID_PATTERN.test(id));
  for (const id of ids) await deleteForever(id);
  return ids.length;
}

export async function exportBackup() {
  const store = currentRoots();
  if (!backupDirectory || backupState !== "ready") throw new Error("Choose a backup folder before creating a backup.");
  const files: Record<string, Uint8Array> = {
    "manifest.json": new TextEncoder().encode(JSON.stringify({ format: "mednotes-backup", version: 1, createdAt: new Date().toISOString() })),
  };
  let total = 0;
  for (const [area, directory] of [["active", store.active], ["trash", store.trash]] as const) {
    for (const [id, postDir] of await listDirectories(directory)) {
      if (!ID_PATTERN.test(id)) continue;
      for await (const [filename, entry] of postDir.entries()) {
        if (entry.kind !== "file" || !["text.md", "vector.bin", "tags.json", "image.jpg", "voice.webm", "deleted.json"].includes(filename)) continue;
        const data = await readBytes(postDir, filename);
        total += data.byteLength;
        if (total > 250 * 1024 * 1024) throw new Error("Backup is larger than 250 MB.");
        files[`${area}/${id}/${filename}`] = data;
      }
    }
  }
  const archive = zipSync(files, { level: 1 });
  const filename = `MedNotes-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
  await writeBytes(backupDirectory, filename, archive);
  return filename;
}

export async function importBackup(file: File) {
  if (file.size > 250 * 1024 * 1024) throw new Error("Backup is larger than 250 MB.");
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const manifest = JSON.parse(new TextDecoder().decode(archive["manifest.json"] || new Uint8Array()));
  if (manifest.format !== "mednotes-backup" || manifest.version !== 1) throw new Error("This is not a supported MedNotes backup.");
  const store = currentRoots();
  const grouped = new Map<string, { area: "active" | "trash"; files: Record<string, Uint8Array> }>();
  for (const [name, bytes] of Object.entries(archive)) {
    if (name === "manifest.json") continue;
    const match = /^(active|trash)\/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_[a-f0-9]{4})\/(text\.md|vector\.bin|tags\.json|image\.jpg|voice\.webm|deleted\.json)$/.exec(name);
    if (!match) throw new Error("Backup contains an invalid file path.");
    const [, area, id, filename] = match;
    const key = `${area}/${id}`;
    if (!grouped.has(key)) grouped.set(key, { area: area as "active" | "trash", files: {} });
    grouped.get(key)!.files[filename] = bytes;
  }
  const conflicts: string[] = [];
  let imported = 0;
  for (const [key, item] of grouped) {
    const [, id] = key.split("/");
    const destination = item.area === "active" ? store.active : store.trash;
    if ((await childDirectory(destination, id).catch(() => null)) || (await childDirectory(item.area === "active" ? store.trash : store.active, id).catch(() => null))) {
      conflicts.push(id);
      continue;
    }
    if (!item.files["text.md"] || item.files["vector.bin"]?.byteLength !== 1536) throw new Error(`Backup post ${id} is incomplete.`);
    const postDir = await childDirectory(destination, id, true);
    try {
      for (const [filename, bytes] of Object.entries(item.files)) await writeBytes(postDir, filename, bytes);
      await removeDirectory(store.recovery, id);
      await copyDirectory(postDir, store.recovery, id);
      imported++;
    } catch (error) {
      await removeDirectory(destination, id);
      await removeDirectory(store.recovery, id);
      throw error;
    }
  }
  return { imported, conflicts };
}
