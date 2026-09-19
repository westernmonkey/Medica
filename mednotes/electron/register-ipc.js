/**
 * Connects renderer requests to local MedNotes services.
 */
const { ipcMain } = require("electron");

const { savePost } = require("../services/storage/save-post");
const { editPost } = require("../services/storage/edit-post");
const {
  deletePost,
  restorePost,
  deletePostForever,
  emptyTrash,
  readTrashPosts,
} = require("../services/storage/delete-post");
const { readPosts } = require("../services/storage/read-posts");
const { searchPosts } = require("../services/search/search-posts");
const { addTagToPost, listTagsForPost } = require("../services/tags/tag-store");
const { embedTextAsync } = require("../services/embedding/embedding-worker");

let postsCache = [];

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

  ipcMain.handle("read-trash-posts", async function handleReadTrashPosts() {
    return readTrashPosts();
  });

  ipcMain.handle("restore-post", async function handleRestorePost(_event, id) {
    await restorePost(id);
    await refreshPostsCache();
    return { ok: true };
  });

  ipcMain.handle("delete-post-forever", async function handleDeleteForever(_event, id) {
    await deletePostForever(id);
    return { ok: true };
  });

  ipcMain.handle("empty-trash", async function handleEmptyTrash() {
    return emptyTrash();
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
}

module.exports = {
  refreshPostsCache: refreshPostsCache,
  registerIpcHandlers: registerIpcHandlers,
};
