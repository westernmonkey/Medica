/**
 * Reasoning: Electron needs one main-process entry that creates the window and
 * wires IPC. Disk, embedding, search, tags, and backup stay out of this file so
 * each can be tested without launching a window.
 */
const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const path = require("path");

const { savePost } = require("./storage/save-post");
const { editPost } = require("./storage/edit-post");
const { deletePost } = require("./storage/delete-post");
const { readPosts } = require("./storage/read-posts");
const { searchPosts } = require("./search/search-posts");
const { addTagToPost, listTagsForPost } = require("./tags/tag-store");
const { exportBackup } = require("./backup/export-backup");
const { embedTextAsync } = require("./embedding/embedding-worker");

let mainWindow = null;
let postsCache = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "ui", "index.html"));
}

async function refreshPostsCache() {
  postsCache = await readPosts();
  return postsCache;
}

function registerIpcHandlers() {
  ipcMain.handle("read-posts", async function handleReadPosts() {
    return refreshPostsCache();
  });

  ipcMain.handle("save-post", async function handleSavePost(_event, payload) {
    const vector = await embedTextAsync(payload.text);
    const post = await savePost({
      text: payload.text,
      imageBuffer: payload.imageBuffer ? Buffer.from(payload.imageBuffer) : null,
      voiceBuffer: payload.voiceBuffer ? Buffer.from(payload.voiceBuffer) : null,
      vector: vector,
    });
    await refreshPostsCache();
    return post;
  });

  ipcMain.handle("edit-post", async function handleEditPost(_event, payload) {
    const vector = await embedTextAsync(payload.text);
    const post = await editPost({
      id: payload.id,
      text: payload.text,
      vector: vector,
    });
    await refreshPostsCache();
    return post;
  });

  ipcMain.handle("delete-post", async function handleDeletePost(_event, id) {
    await deletePost(id);
    await refreshPostsCache();
    return { ok: true };
  });

  ipcMain.handle("search-posts", async function handleSearchPosts(_event, payload) {
    if (postsCache.length === 0) {
      await refreshPostsCache();
    }
    const queryVector = await embedTextAsync(payload.query);
    return searchPosts({
      posts: postsCache,
      queryVector: queryVector,
      dateFrom: payload.dateFrom || null,
      dateTo: payload.dateTo || null,
    });
  });

  ipcMain.handle("add-tag", async function handleAddTag(_event, payload) {
    const tags = await addTagToPost(payload.id, payload.tag);
    await refreshPostsCache();
    return tags;
  });

  ipcMain.handle("list-tags", async function handleListTags(_event, id) {
    return listTagsForPost(id);
  });

  ipcMain.handle("export-backup", async function handleExportBackup(_event, password) {
    const forcedPath = process.env.MEDNOTES_BACKUP_PATH;
    let destination = forcedPath || null;
    if (!destination) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Export MedNotes Backup",
        defaultPath: "mednotes-backup.enc",
        filters: [{ name: "Encrypted Backup", extensions: ["enc"] }],
      });
      if (result.canceled || !result.filePath) {
        return { ok: false, canceled: true };
      }
      destination = result.filePath;
    }
    await exportBackup(password, destination);
    return { ok: true, path: destination };
  });
}

app.whenReady().then(async function onReady() {
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient(
      "mednotes",
      process.execPath,
      [path.resolve(process.argv[1])]
    );
  } else {
    app.setAsDefaultProtocolClient("mednotes");
  }

  session.defaultSession.setPermissionRequestHandler(function handlePermission(
    _webContents,
    permission,
    callback
  ) {
    if (permission === "media" || permission === "mediaKeySystem") {
      callback(true);
      return;
    }
    callback(false);
  });

  registerIpcHandlers();
  await refreshPostsCache();
  createWindow();

  app.on("activate", function onActivate() {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", function onWindowAllClosed() {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
