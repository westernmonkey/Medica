/**
 * Reasoning: Posts live in two places so a accidental wipe of ~/MedNotes can be
 * recovered from the OS application-support mirror. Tests set MEDNOTES_HOME so
 * they never write into the real user folders.
 */
const os = require("os");
const path = require("path");
const fs = require("fs");

function getWorkingRoot() {
  if (process.env.MEDNOTES_HOME) {
    return path.join(process.env.MEDNOTES_HOME, "working");
  }
  return path.join(os.homedir(), "MedNotes");
}

function getMirrorRoot() {
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

function ensureRootsExist() {
  const working = getWorkingRoot();
  const mirror = getMirrorRoot();
  fs.mkdirSync(working, { recursive: true });
  fs.mkdirSync(mirror, { recursive: true });
  return { working: working, mirror: mirror };
}

function getPostPaths(postId) {
  const roots = ensureRootsExist();
  return {
    working: path.join(roots.working, postId),
    mirror: path.join(roots.mirror, postId),
  };
}

module.exports = {
  getWorkingRoot: getWorkingRoot,
  getMirrorRoot: getMirrorRoot,
  ensureRootsExist: ensureRootsExist,
  getPostPaths: getPostPaths,
};
