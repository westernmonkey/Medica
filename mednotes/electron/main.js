/**
 * Starts Electron and owns the application lifecycle.
 */
const { app, BrowserWindow, session } = require("electron");
const path = require("path");

const { createMainWindow } = require("./create-window");
const { registerIpcHandlers, refreshPostsCache } = require("./register-ipc");

let mainWindow = null;

function registerProtocol() {
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient(
      "mednotes",
      process.execPath,
      [path.resolve(process.argv[1])]
    );
    return;
  }

  app.setAsDefaultProtocolClient("mednotes");
}

function registerMediaPermissions() {
  session.defaultSession.setPermissionRequestHandler(function handlePermission(
    _webContents,
    permission,
    callback
  ) {
    const isMediaPermission = permission === "media" || permission === "mediaKeySystem";
    callback(isMediaPermission);
  });
}

app.whenReady().then(async function startApplication() {
  registerProtocol();
  registerMediaPermissions();
  registerIpcHandlers();
  await refreshPostsCache();

  mainWindow = createMainWindow();

  app.on("activate", function reopenApplication() {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("window-all-closed", function closeApplication() {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
