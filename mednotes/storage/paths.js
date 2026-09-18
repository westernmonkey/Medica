/**
 * Post IDs cross the renderer-to-main IPC boundary. Keep every resolved path
 * below the MedNotes data root so a forged ID cannot address arbitrary files.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const RESERVED_DIRECTORIES = new Set(["active", ".trash", "recovery"]);
const POST_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_[a-f0-9]{4}$/;

function getDataRoot() {
  return process.env.MEDNOTES_HOME || path.join(os.homedir(), "MedNotes");
}

function getLegacyRecoveryRoot() {
  if (process.env.MEDNOTES_HOME) {
    return path.join(process.env.MEDNOTES_HOME, "mirror");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, ".mednotes");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", ".mednotes");
  }
  return path.join(os.homedir(), ".config", ".mednotes");
}

function validatePostId(postId) {
  if (typeof postId !== "string" || !POST_ID_PATTERN.test(postId)) {
    throw new TypeError("Invalid post ID");
  }
  return postId;
}

function isPostDirectory(dir) {
  return fs.existsSync(path.join(dir, "text.md")) && fs.existsSync(path.join(dir, "vector.bin"));
}

function copyDirectoryIfMissing(source, destination) {
  if (!fs.existsSync(source) || fs.existsSync(destination)) {
    return;
  }
  fs.cpSync(source, destination, { recursive: true, errorOnExist: true });
}

function migrateLegacyPosts(root, active, recovery) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || RESERVED_DIRECTORIES.has(entry.name)) {
      continue;
    }
    const source = path.join(root, entry.name);
    if (!isPostDirectory(source)) {
      continue;
    }
    validatePostId(entry.name);
    const destination = path.join(active, entry.name);
    if (fs.existsSync(destination)) {
      throw new Error("Cannot migrate duplicate active post: " + entry.name);
    }
    fs.renameSync(source, destination);
    copyDirectoryIfMissing(destination, path.join(recovery, entry.name));
  }

  const legacyRecovery = getLegacyRecoveryRoot();
  if (!fs.existsSync(legacyRecovery) || path.resolve(legacyRecovery) === path.resolve(recovery)) {
    return;
  }
  for (const entry of fs.readdirSync(legacyRecovery, { withFileTypes: true })) {
    if (!entry.isDirectory() || !POST_ID_PATTERN.test(entry.name)) {
      continue;
    }
    copyDirectoryIfMissing(path.join(legacyRecovery, entry.name), path.join(recovery, entry.name));
  }
}

function ensureRootsExist() {
  const root = getDataRoot();
  const active = path.join(root, "active");
  const trash = path.join(root, ".trash");
  const recovery = path.join(root, "recovery");
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(active, { recursive: true });
  fs.mkdirSync(trash, { recursive: true });
  fs.mkdirSync(recovery, { recursive: true });
  migrateLegacyPosts(root, active, recovery);
  return { root, active, trash, recovery };
}

function getPostPaths(postId) {
  const id = validatePostId(postId);
  const roots = ensureRootsExist();
  return {
    active: path.join(roots.active, id),
    trash: path.join(roots.trash, id),
    recovery: path.join(roots.recovery, id),
  };
}

module.exports = {
  getDataRoot,
  ensureRootsExist,
  getPostPaths,
  validatePostId,
};
