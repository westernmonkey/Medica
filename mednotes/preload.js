/**
 * Reasoning: The renderer must not get Node or fs. preload.js is the only bridge.
 * Each method maps 1:1 to an ipcMain handler in main.js.
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
  searchPosts: function searchPosts(payload) {
    return ipcRenderer.invoke("search-posts", payload);
  },
  addTag: function addTag(payload) {
    return ipcRenderer.invoke("add-tag", payload);
  },
  listTags: function listTags(id) {
    return ipcRenderer.invoke("list-tags", id);
  },
  exportBackup: function exportBackup(password) {
    return ipcRenderer.invoke("export-backup", password);
  },
});
