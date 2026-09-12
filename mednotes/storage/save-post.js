/**
 * Reasoning: Each post is a folder so media and text stay together and stay
 * readable outside the app. Dual write to working + mirror happens here so every
 * caller gets both copies without repeating that logic.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getPostPaths, ensureRootsExist } = require("./paths");

function makePostId() {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = crypto.randomBytes(2).toString("hex");
  return iso + "_" + suffix;
}

function writePostFiles(dir, payload) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "text.md"), payload.text, "utf8");
  const vectorBuffer = Buffer.from(payload.vector.buffer, payload.vector.byteOffset, payload.vector.byteLength);
  fs.writeFileSync(path.join(dir, "vector.bin"), vectorBuffer);
  if (payload.imageBuffer) {
    fs.writeFileSync(path.join(dir, "image.jpg"), payload.imageBuffer);
  }
  if (payload.voiceBuffer) {
    fs.writeFileSync(path.join(dir, "voice.webm"), payload.voiceBuffer);
  }
  if (!fs.existsSync(path.join(dir, "tags.json"))) {
    fs.writeFileSync(path.join(dir, "tags.json"), JSON.stringify([]), "utf8");
  }
}

async function savePost(payload) {
  ensureRootsExist();
  const id = makePostId();
  const paths = getPostPaths(id);
  writePostFiles(paths.working, payload);
  writePostFiles(paths.mirror, payload);
  return {
    id: id,
    text: payload.text,
    hasImage: Boolean(payload.imageBuffer),
    hasVoice: Boolean(payload.voiceBuffer),
    tags: [],
  };
}

module.exports = {
  savePost: savePost,
  makePostId: makePostId,
  writePostFiles: writePostFiles,
};
