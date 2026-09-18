/**
 * Reasoning: tags.json lives inside each post folder so a post stays self
 * contained when copied. Dual write keeps Recovery synchronized with Active.
 */
const fs = require("fs");
const path = require("path");
const { getPostPaths } = require("../storage/paths");

function readTagsFile(dir) {
  const tagsPath = path.join(dir, "tags.json");
  if (!fs.existsSync(tagsPath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(tagsPath, "utf8"));
}

function writeTagsFile(dir, tags) {
  fs.writeFileSync(path.join(dir, "tags.json"), JSON.stringify(tags), "utf8");
}

async function listTagsForPost(id) {
  const paths = getPostPaths(id);
  return readTagsFile(paths.active);
}

async function addTagToPost(id, tagName) {
  const cleaned = String(tagName || "").trim();
  if (!cleaned) {
    throw new Error("Tag name is empty");
  }
  const paths = getPostPaths(id);
  const tags = readTagsFile(paths.active);
  const lower = cleaned.toLowerCase();
  let exists = false;
  for (let i = 0; i < tags.length; i++) {
    if (tags[i].toLowerCase() === lower) {
      exists = true;
      break;
    }
  }
  if (!exists) {
    tags.push(cleaned);
  }
  const previousActive = readTagsFile(paths.active);
  const previousRecovery = readTagsFile(paths.recovery);
  try {
    writeTagsFile(paths.recovery, tags);
    writeTagsFile(paths.active, tags);
  } catch (error) {
    writeTagsFile(paths.recovery, previousRecovery);
    writeTagsFile(paths.active, previousActive);
    throw error;
  }
  return tags;
}

module.exports = {
  listTagsForPost: listTagsForPost,
  addTagToPost: addTagToPost,
};
