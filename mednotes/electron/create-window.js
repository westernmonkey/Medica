/**
 * Creates the main MedNotes window and loads the local renderer.
 */
const { BrowserWindow } = require("electron");
const path = require("path");

function createMainWindow() {
  const window = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  return window;
}

module.exports = {
  createMainWindow: createMainWindow,
};
