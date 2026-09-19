/**
 * Reasoning: The renderer must not get Node or fs. preload.js is the only bridge.
 * Each method maps 1:1 to an ipcMain handler in register-ipc.js.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mednotes", {
  savePost: function savePost(payload) {
    return ipcRenderer.invoke("save-post", payload);
  },
  readPosts: function readPosts() {
    return ipcRenderer.invoke("read-posts");
  },
  editPost: function editPost(payload) {
    return ipcRenderer.invoke("edit-post", payload);
  },
  deletePost: function deletePost(id) {
    return ipcRenderer.invoke("delete-post", id);
  },
  readTrashPosts: function readTrashPosts() {
    return ipcRenderer.invoke("read-trash-posts");
  },
  restorePost: function restorePost(id) {
    return ipcRenderer.invoke("restore-post", id);
  },
  deletePostForever: function deletePostForever(id) {
    return ipcRenderer.invoke("delete-post-forever", id);
  },
  emptyTrash: function emptyTrash() {
    return ipcRenderer.invoke("empty-trash");
  },
  searchPosts: function searchPosts(payload) {
    return ipcRenderer.invoke("search-posts", payload);
  },
  addTag: function addTag(payload) {
    return ipcRenderer.invoke("add-tag", payload);
  },
  listTags: function listTags(id) {
    return ipcRenderer.invoke("list-tags", id);
  },
});
