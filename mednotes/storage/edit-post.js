/**
 * Reasoning: Edit changes only text and its embedding. Folder id and attachments
 * stay fixed so links and timestamps do not jump when a note is corrected.
 */
const fs = require("fs");
const path = require("path");
const { getPostPaths } = require("./paths");

function overwriteTextAndVector(dir, text, vector) {
  if (!fs.existsSync(dir)) {
    throw new Error("Post folder missing: " + dir);
  }
  fs.writeFileSync(path.join(dir, "text.md"), text, "utf8");
  const vectorBuffer = Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
  fs.writeFileSync(path.join(dir, "vector.bin"), vectorBuffer);
}

async function editPost(payload) {
  const paths = getPostPaths(payload.id);
  overwriteTextAndVector(paths.working, payload.text, payload.vector);
  overwriteTextAndVector(paths.mirror, payload.text, payload.vector);
  return {
    id: payload.id,
    text: payload.text,
  };
}

module.exports = {
  editPost: editPost,
};
