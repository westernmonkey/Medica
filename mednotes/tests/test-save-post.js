/**
 * Storage must prove synchronized Active and Recovery copies, reversible Trash,
 * permanent deletion, exact round trips, and rejection of forged post IDs.
 * MEDNOTES_HOME points everything at a temp tree so tests stay isolated.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mednotes-storage-"));
process.env.MEDNOTES_HOME = tmpRoot;

const { savePost } = require("../services/storage/save-post");
const { editPost } = require("../services/storage/edit-post");
const { deletePost, restorePost, deletePostForever, emptyTrash, readTrashPosts } = require("../services/storage/delete-post");
const { readPosts } = require("../services/storage/read-posts");
const { ensureRootsExist, getPostPaths } = require("../services/storage/paths");

function makeFakeJpeg() {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0xff, 0xd9,
  ]);
}

function makeFakeWebm() {
  return Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02, 0x03, 0x04]);
}

function makeVector(seed) {
  const vector = new Float32Array(384);
  for (let i = 0; i < 384; i++) {
    vector[i] = (seed + i) * 0.001;
  }
  return vector;
}

test("save writes text image voice and vector to active and recovery", async function testSaveDualWrite() {
  const image = makeFakeJpeg();
  const voice = makeFakeWebm();
  const vector = makeVector(1);
  const text = "Acute chest pain differential includes ACS and PE.";
  const post = await savePost({
    text: text,
    imageBuffer: image,
    voiceBuffer: voice,
    vector: vector,
  });
  const paths = getPostPaths(post.id);

  const workingText = fs.readFileSync(path.join(paths.active, "text.md"), "utf8");
  const mirrorText = fs.readFileSync(path.join(paths.recovery, "text.md"), "utf8");
  assert.equal(workingText, text);
  assert.equal(mirrorText, text);

  const workingImage = fs.readFileSync(path.join(paths.active, "image.jpg"));
  const mirrorImage = fs.readFileSync(path.join(paths.recovery, "image.jpg"));
  assert.deepEqual(workingImage, image);
  assert.deepEqual(mirrorImage, image);
  assert.equal(workingImage[0], 0xff);
  assert.equal(workingImage[1], 0xd8);

  const workingVoice = fs.readFileSync(path.join(paths.active, "voice.webm"));
  const mirrorVoice = fs.readFileSync(path.join(paths.recovery, "voice.webm"));
  assert.deepEqual(workingVoice, voice);
  assert.deepEqual(mirrorVoice, voice);
  assert.equal(workingVoice[0], 0x1a);
  assert.equal(workingVoice[1], 0x45);

  const workingVector = fs.readFileSync(path.join(paths.active, "vector.bin"));
  assert.equal(workingVector.byteLength, 1536);
  console.log("save-post: text match=true imageBytes=" + image.length + " voiceBytes=" + voice.length + " vectorBytes=1536");
});

test("edit updates text and vector in both folders", async function testEditBothFolders() {
  const vector = makeVector(2);
  const post = await savePost({
    text: "Original note about meningitis signs.",
    imageBuffer: null,
    voiceBuffer: null,
    vector: vector,
  });
  const newVector = makeVector(9);
  const newText = "Edited note about meningitis Kernig Brudzinski.";
  await editPost({ id: post.id, text: newText, vector: newVector });
  const paths = getPostPaths(post.id);

  assert.equal(fs.readFileSync(path.join(paths.active, "text.md"), "utf8"), newText);
  assert.equal(fs.readFileSync(path.join(paths.recovery, "text.md"), "utf8"), newText);

  const workingBytes = fs.readFileSync(path.join(paths.active, "vector.bin"));
  const mirrorBytes = fs.readFileSync(path.join(paths.recovery, "vector.bin"));
  const workingVec = new Float32Array(
    workingBytes.buffer,
    workingBytes.byteOffset,
    workingBytes.byteLength / 4
  );
  const mirrorVec = new Float32Array(
    mirrorBytes.buffer,
    mirrorBytes.byteOffset,
    mirrorBytes.byteLength / 4
  );
  assert.equal(workingVec.length, 384);
  assert.equal(mirrorVec[0], newVector[0]);
  assert.equal(workingVec[10], newVector[10]);
  console.log("edit-post: both folders updated text+vector");
});

test("delete moves active post to Trash and restore returns it", async function testTrashRestore() {
  const post = await savePost({
    text: "Temporary note to delete.",
    imageBuffer: null,
    voiceBuffer: null,
    vector: makeVector(3),
  });
  const paths = getPostPaths(post.id);
  await deletePost(post.id);
  assert.equal(fs.existsSync(paths.active), false);
  assert.equal(fs.existsSync(paths.trash), true);
  assert.equal(fs.existsSync(paths.recovery), true);
  assert.equal((await readTrashPosts())[0].id, post.id);
  await restorePost(post.id);
  assert.equal(fs.existsSync(paths.active), true);
  assert.equal(fs.existsSync(paths.trash), false);
  assert.equal(fs.existsSync(paths.recovery), true);
  console.log("delete-post: Trash move and restore passed");
});

test("delete forever removes Trash and Recovery copies", async function testDeleteForever() {
  const post = await savePost({ text: "Permanent deletion test.", imageBuffer: null, voiceBuffer: null, vector: makeVector(7) });
  const paths = getPostPaths(post.id);
  await deletePost(post.id);
  await deletePostForever(post.id);
  assert.equal(fs.existsSync(paths.trash), false);
  assert.equal(fs.existsSync(paths.recovery), false);
});

test("forged post IDs cannot escape the data root", async function testRejectsTraversal() {
  await assert.rejects(() => deletePost("../../outside"), /Invalid post ID/);
});

test("legacy post folders migrate into active and recovery", function testLegacyMigration() {
  const id = "2025-01-02T03-04-05-006Z_abcd";
  const legacy = path.join(tmpRoot, id);
  fs.mkdirSync(legacy);
  fs.writeFileSync(path.join(legacy, "text.md"), "Legacy post", "utf8");
  fs.writeFileSync(path.join(legacy, "vector.bin"), Buffer.alloc(1536));
  fs.writeFileSync(path.join(legacy, "tags.json"), "[]", "utf8");
  const roots = ensureRootsExist();
  assert.equal(fs.existsSync(legacy), false);
  assert.equal(fs.existsSync(path.join(roots.active, id, "text.md")), true);
  assert.equal(fs.existsSync(path.join(roots.recovery, id, "text.md")), true);
});

test("empty Trash permanently removes every trashed post and recovery", async function testEmptyTrash() {
  const first = await savePost({ text: "First Trash post", imageBuffer: null, voiceBuffer: null, vector: makeVector(8) });
  const second = await savePost({ text: "Second Trash post", imageBuffer: null, voiceBuffer: null, vector: makeVector(9) });
  await deletePost(first.id);
  await deletePost(second.id);
  const result = await emptyTrash();
  assert.equal(result.deleted, 2);
  assert.equal((await readTrashPosts()).length, 0);
  assert.equal(fs.existsSync(getPostPaths(first.id).recovery), false);
  assert.equal(fs.existsSync(getPostPaths(second.id).recovery), false);
});

test("readPosts returns saved posts with vectors", async function testReadPosts() {
  await savePost({
    text: "Readable post about asthma inhalers.",
    imageBuffer: null,
    voiceBuffer: null,
    vector: makeVector(4),
  });
  const posts = await readPosts();
  assert.ok(posts.length >= 1);
  assert.equal(posts[0].vector.length, 384);
  assert.ok(typeof posts[0].text === "string");
  console.log("read-posts: count=" + posts.length + " vectorLength=" + posts[0].vector.length);
});
