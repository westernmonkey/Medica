/**
 * Reasoning: Edit changes only text and its embedding. Folder id and attachments
 * stay fixed so links and timestamps do not jump when a post is corrected.
 */
const fs = require("fs");
const path = require("path");
const { getPostPaths } = require("./paths");

function overwriteTextAndVector(dir, text, vector) {
  if (!fs.existsSync(dir)) {
    throw new Error("Post folder missing: " + dir);
  }
  const textPath = path.join(dir, "text.md");
  const vectorPath = path.join(dir, "vector.bin");
  const previousText = fs.readFileSync(textPath);
  const previousVector = fs.readFileSync(vectorPath);
  const vectorBuffer = Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
  try {
    fs.writeFileSync(textPath, text, "utf8");
    fs.writeFileSync(vectorPath, vectorBuffer);
  } catch (error) {
    fs.writeFileSync(textPath, previousText);
    fs.writeFileSync(vectorPath, previousVector);
    throw error;
  }
  return { text: previousText, vector: previousVector };
}

function restoreTextAndVector(dir, previous) {
  fs.writeFileSync(path.join(dir, "text.md"), previous.text);
  fs.writeFileSync(path.join(dir, "vector.bin"), previous.vector);
}

async function editPost(payload) {
  const paths = getPostPaths(payload.id);
  const previousRecovery = overwriteTextAndVector(paths.recovery, payload.text, payload.vector);
  try {
    overwriteTextAndVector(paths.active, payload.text, payload.vector);
  } catch (error) {
    restoreTextAndVector(paths.recovery, previousRecovery);
    throw error;
  }
  return {
    id: payload.id,
    text: payload.text,
  };
}

module.exports = {
  editPost: editPost,
};
