/**
 * Reasoning: Search needs every vector in memory once at startup. Reading from
 * the working folder is enough; the mirror is a backup, not a second index.
 */
const fs = require("fs");
const path = require("path");
const { getWorkingRoot, ensureRootsExist } = require("./paths");

function readTags(postDir) {
  const tagsPath = path.join(postDir, "tags.json");
  if (!fs.existsSync(tagsPath)) {
    return [];
  }
  const raw = fs.readFileSync(tagsPath, "utf8");
  return JSON.parse(raw);
}

function parseCreatedAtFromId(id) {
  const stamp = id.split("_")[0];
  const restored = stamp
    .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, "T$1:$2:$3.$4Z");
  const date = new Date(restored);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function readOnePost(postId, workingRoot) {
  const postDir = path.join(workingRoot, postId);
  const textPath = path.join(postDir, "text.md");
  const vectorPath = path.join(postDir, "vector.bin");
  if (!fs.existsSync(textPath) || !fs.existsSync(vectorPath)) {
    return null;
  }
  const text = fs.readFileSync(textPath, "utf8");
  const vectorBytes = fs.readFileSync(vectorPath);
  const vector = new Float32Array(
    vectorBytes.buffer,
    vectorBytes.byteOffset,
    vectorBytes.byteLength / 4
  );
  const imagePath = path.join(postDir, "image.jpg");
  const voicePath = path.join(postDir, "voice.webm");
  const hasImage = fs.existsSync(imagePath);
  const hasVoice = fs.existsSync(voicePath);
  return {
    id: postId,
    text: text,
    vector: vector,
    hasImage: hasImage,
    hasVoice: hasVoice,
    imagePath: hasImage ? imagePath : null,
    voicePath: hasVoice ? voicePath : null,
    tags: readTags(postDir),
    createdAt: parseCreatedAtFromId(postId),
  };
}

async function readPosts() {
  const roots = ensureRootsExist();
  const entries = fs.readdirSync(roots.working, { withFileTypes: true });
  const posts = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.isDirectory()) {
      continue;
    }
    const post = readOnePost(entry.name, roots.working);
    if (post) {
      posts.push(post);
    }
  }
  posts.sort(function sortByIdDesc(a, b) {
    if (a.id < b.id) {
      return 1;
    }
    if (a.id > b.id) {
      return -1;
    }
    return 0;
  });
  return posts;
}

module.exports = {
  readPosts: readPosts,
  readOnePost: readOnePost,
  parseCreatedAtFromId: parseCreatedAtFromId,
};
