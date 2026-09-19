/**
 * Normal deletion is reversible. Only an explicit permanent-delete action
 * removes both the Trash copy and its synchronized Recovery copy.
 */
const fs = require("fs");
const path = require("path");
const { ensureRootsExist, getPostPaths, validatePostId } = require("./paths");
const { readOnePost } = require("./read-posts");

function removeDirectoryIfPresent(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function requireDirectory(dir, message) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(message);
  }
}

function replaceRecoveryCopy(source, destination) {
  const temporary = destination + ".next";
  const previous = destination + ".previous";
  removeDirectoryIfPresent(temporary);
  removeDirectoryIfPresent(previous);
  fs.cpSync(source, temporary, { recursive: true, errorOnExist: true });
  try {
    if (fs.existsSync(destination)) {
      fs.renameSync(destination, previous);
    }
    fs.renameSync(temporary, destination);
    removeDirectoryIfPresent(previous);
  } catch (error) {
    if (!fs.existsSync(destination) && fs.existsSync(previous)) {
      fs.renameSync(previous, destination);
    }
    removeDirectoryIfPresent(temporary);
    throw error;
  }
}

async function deletePost(id) {
  const paths = getPostPaths(id);
  requireDirectory(paths.active, "Active post not found");
  if (fs.existsSync(paths.trash)) {
    throw new Error("A Trash copy already exists for this post");
  }
  fs.renameSync(paths.active, paths.trash);
  try {
    fs.writeFileSync(
      path.join(paths.trash, "deleted.json"),
      JSON.stringify({ deletedAt: new Date().toISOString() }),
      "utf8"
    );
  } catch (error) {
    fs.renameSync(paths.trash, paths.active);
    throw error;
  }
  return { ok: true };
}

async function restorePost(id) {
  const paths = getPostPaths(id);
  requireDirectory(paths.trash, "Trashed post not found");
  if (fs.existsSync(paths.active)) {
    throw new Error("An active post already exists with this ID");
  }
  const metadataPath = path.join(paths.trash, "deleted.json");
  const deletionMetadata = fs.existsSync(metadataPath) ? fs.readFileSync(metadataPath) : null;
  fs.rmSync(metadataPath, { force: true });
  fs.renameSync(paths.trash, paths.active);
  try {
    replaceRecoveryCopy(paths.active, paths.recovery);
  } catch (error) {
    fs.renameSync(paths.active, paths.trash);
    if (deletionMetadata) {
      fs.writeFileSync(path.join(paths.trash, "deleted.json"), deletionMetadata);
    }
    throw error;
  }
  return { ok: true };
}

async function deletePostForever(id) {
  const paths = getPostPaths(id);
  requireDirectory(paths.trash, "Trashed post not found");
  removeDirectoryIfPresent(paths.recovery);
  removeDirectoryIfPresent(paths.trash);
  return { ok: true };
}

async function emptyTrash() {
  const roots = ensureRootsExist();
  const ids = fs.readdirSync(roots.trash, { withFileTypes: true })
    .filter(function onlyPostDirectories(entry) {
      return entry.isDirectory();
    })
    .map(function postId(entry) {
      return validatePostId(entry.name);
    });
  for (const id of ids) {
    await deletePostForever(id);
  }
  return { ok: true, deleted: ids.length };
}

async function readTrashPosts() {
  const roots = ensureRootsExist();
  const posts = [];
  for (const entry of fs.readdirSync(roots.trash, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    validatePostId(entry.name);
    const post = readOnePost(entry.name, roots.trash);
    if (!post) {
      continue;
    }
    const metadataPath = path.join(roots.trash, entry.name, "deleted.json");
    let deletedAt = null;
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
      deletedAt = typeof metadata.deletedAt === "string" ? metadata.deletedAt : null;
    }
    posts.push({ ...post, deletedAt });
  }
  posts.sort(function newestDeletionFirst(a, b) {
    return String(b.deletedAt || b.id).localeCompare(String(a.deletedAt || a.id));
  });
  return posts;
}

module.exports = {
  deletePost,
  restorePost,
  deletePostForever,
  emptyTrash,
  readTrashPosts,
};
