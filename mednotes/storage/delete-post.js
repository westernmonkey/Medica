/**
 * Reasoning: Delete must remove both copies. Leaving the mirror would confuse
 * recovery and leave orphaned private notes on disk.
 */
const fs = require("fs");
const { getPostPaths } = require("./paths");

function removeDirIfExists(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function deletePost(id) {
  const paths = getPostPaths(id);
  removeDirIfExists(paths.working);
  removeDirIfExists(paths.mirror);
}

module.exports = {
  deletePost: deletePost,
};
