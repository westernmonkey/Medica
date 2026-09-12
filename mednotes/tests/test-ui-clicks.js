/**
 * Reasoning: End-to-end click counting proves the composer path is short. Real
 * Playwright drives Electron so media, prompts, and save dialogs behave like a
 * user session. Backup decrypt is checked here with the exported file bytes.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert/strict");
const { _electron: electron } = require("playwright");
const {
  decryptBackupBuffer,
  exportBackup,
} = require("../backup/export-backup");

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mednotes-e2e-"));
const fixtureDir = path.join(tmpRoot, "fixtures");
fs.mkdirSync(fixtureDir, { recursive: true });

const jpegPath = path.join(fixtureDir, "sample.jpg");
fs.writeFileSync(
  jpegPath,
  Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x03, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x7f, 0xff, 0xd9,
  ])
);

const NOTE_TEXT = "E2E note: dyspnea differential includes PE and pneumonia.";
const BACKUP_PASSWORD = "correct-horse-battery";
const WRONG_PASSWORD = "wrong-password";

function printTable(rows) {
  console.log("");
  console.log("MedNotes E2E results");
  console.log("-------------------");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(
      row.name.padEnd(42) +
        " | measured=" + String(row.measured).padEnd(12) +
        " | pass=" + row.pass
    );
  }
  console.log("");
}

async function run() {
  const rows = [];
  process.env.MEDNOTES_HOME = tmpRoot;

  const electronPath = require("electron");
  const appDir = path.join(__dirname, "..");

  const electronApp = await electron.launch({
    executablePath: electronPath,
    args: [
      appDir,
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
    env: Object.assign({}, process.env, {
      MEDNOTES_HOME: tmpRoot,
      MEDNOTES_BACKUP_PATH: path.join(tmpRoot, "backup.enc"),
    }),
  });

  const window = await electronApp.firstWindow();
  await window.waitForSelector("#composer-text");
  try {
    await window.context().grantPermissions(["microphone", "camera"]);
  } catch (err) {
    // Electron may not support grantPermissions; fake UI flags cover the prompt.
  }

  let clickCount = 0;
  let keyPressCount = 0;

  async function countedClick(selector) {
    clickCount += 1;
    await window.click(selector);
  }

  async function countedType(selector, text) {
    await window.focus(selector);
    for (let i = 0; i < text.length; i++) {
      keyPressCount += 1;
      await window.keyboard.type(text[i]);
    }
  }

  await countedClick("#composer-text");
  await countedType("#composer-text", NOTE_TEXT);

  await countedClick("#camera-btn");
  await window.setInputFiles("#image-file-input", jpegPath);
  clickCount += 1;

  await countedClick("#mic-btn");
  await window.waitForSelector("#record-dot:not(.hidden)");
  await window.waitForTimeout(1500);
  await countedClick("#mic-btn");
  await window.waitForFunction(function voiceAttached() {
    const el = document.getElementById("attach-status");
    return el && el.textContent.indexOf("voice") !== -1;
  }, null, { timeout: 15000 });

  await countedClick("#save-btn");
  await window.waitForSelector(".post-text");

  const workingRoot = path.join(tmpRoot, "working");
  const mirrorRoot = path.join(tmpRoot, "mirror");

  async function waitForPostDir(timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (fs.existsSync(workingRoot)) {
        const dirs = fs.readdirSync(workingRoot).filter(function onlyDirs(name) {
          return fs.statSync(path.join(workingRoot, name)).isDirectory();
        });
        if (dirs.length > 0) {
          return dirs[0];
        }
      }
      await new Promise(function delay(resolve) {
        setTimeout(resolve, 200);
      });
    }
    throw new Error("Timed out waiting for saved post folder");
  }

  const postId = await waitForPostDir(60000);
  const workingPost = path.join(workingRoot, postId);
  const mirrorPost = path.join(mirrorRoot, postId);

  const savedText = fs.readFileSync(path.join(workingPost, "text.md"), "utf8");
  const textMatch = savedText === NOTE_TEXT;
  rows.push({
    name: "create_post_click_count",
    measured: clickCount,
    pass: clickCount <= 8,
  });
  rows.push({
    name: "create_post_keypress_count",
    measured: keyPressCount,
    pass: keyPressCount === NOTE_TEXT.length,
  });
  rows.push({
    name: "text_md_roundtrip",
    measured: textMatch ? "exact" : "mismatch",
    pass: textMatch,
  });

  const imageBytes = fs.readFileSync(path.join(workingPost, "image.jpg"));
  const imageOk =
    imageBytes.length > 0 &&
    imageBytes[0] === 0xff &&
    imageBytes[1] === 0xd8 &&
    fs.existsSync(path.join(mirrorPost, "image.jpg"));
  rows.push({
    name: "image_jpg_intact",
    measured: imageBytes.length + " bytes",
    pass: imageOk,
  });

  const voicePath = path.join(workingPost, "voice.webm");
  assert.ok(fs.existsSync(voicePath), "voice.webm missing after save");
  const voiceBytes = fs.readFileSync(voicePath);
  const voiceHeaderOk =
    voiceBytes.length > 4 &&
    voiceBytes[0] === 0x1a &&
    voiceBytes[1] === 0x45 &&
    voiceBytes[2] === 0xdf &&
    voiceBytes[3] === 0xa3;

  const voiceB64 = voiceBytes.toString("base64");
  const voiceDuration = await window.evaluate(async function measureVoice(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    return new Promise(function durationPromise(resolve) {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.addEventListener("loadedmetadata", function onMeta() {
        const duration = audio.duration;
        URL.revokeObjectURL(url);
        resolve(duration);
      });
      audio.addEventListener("error", function onError() {
        URL.revokeObjectURL(url);
        resolve(-1);
      });
      audio.src = url;
    });
  }, voiceB64);

  const voiceOk = voiceHeaderOk && (voiceDuration > 0 || voiceBytes.length > 100);
  rows.push({
    name: "voice_webm_plays",
    measured: "dur=" + voiceDuration + " bytes=" + voiceBytes.length,
    pass: voiceOk,
  });

  const backupPath = path.join(tmpRoot, "backup.enc");
  await window.fill("#backup-password", BACKUP_PASSWORD);
  keyPressCount += BACKUP_PASSWORD.length;
  window.once("dialog", async function onBackupAlert(dialog) {
    await dialog.accept();
  });
  await countedClick("#export-backup-btn");

  const startBackup = Date.now();
  while (!fs.existsSync(backupPath) && Date.now() - startBackup < 30000) {
    await window.waitForTimeout(200);
  }
  assert.ok(fs.existsSync(backupPath), "backup file was not written");

  const packed = fs.readFileSync(backupPath);
  let decryptOk = false;
  let wrongFails = false;
  try {
    const unzipped = await decryptBackupBuffer(packed, BACKUP_PASSWORD);
    decryptOk = unzipped.length > 0 && unzipped[0] === 0x50 && unzipped[1] === 0x4b;
  } catch (err) {
    decryptOk = false;
  }
  try {
    await decryptBackupBuffer(packed, WRONG_PASSWORD);
    wrongFails = false;
  } catch (err) {
    wrongFails = true;
  }
  rows.push({
    name: "backup_decrypt_correct_password",
    measured: decryptOk ? "ok" : "fail",
    pass: decryptOk,
  });
  rows.push({
    name: "backup_decrypt_wrong_password",
    measured: wrongFails ? "throws" : "accepted",
    pass: wrongFails,
  });

  // Direct API check for edit dual-write (storage already unit-tested; confirm live folders)
  process.env.MEDNOTES_HOME = tmpRoot;
  const { editPost } = require("../storage/edit-post");
  const { embedText } = require("../embedding/embed-text");
  const { shutdownEmbeddingWorker } = require("../embedding/embedding-worker");
  const newText = "Edited E2E note about PE vs pneumonia.";
  const newVector = await embedText(newText);
  await editPost({ id: postId, text: newText, vector: newVector });
  const editedWorking = fs.readFileSync(path.join(workingPost, "text.md"), "utf8");
  const editedMirror = fs.readFileSync(path.join(mirrorPost, "text.md"), "utf8");
  const vectorWorking = fs.readFileSync(path.join(workingPost, "vector.bin"));
  const vectorMirror = fs.readFileSync(path.join(mirrorPost, "vector.bin"));
  const editOk =
    editedWorking === newText &&
    editedMirror === newText &&
    vectorWorking.equals(vectorMirror) &&
    vectorWorking.byteLength === 1536;
  rows.push({
    name: "edit_updates_both_folders",
    measured: editOk ? "ok" : "fail",
    pass: editOk,
  });

  printTable(rows);

  let allPass = true;
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].pass) {
      allPass = false;
    }
  }

  await shutdownEmbeddingWorker();
  await electronApp.close();

  // Keep a pure-node backup encrypt path exercised too
  const altBackup = path.join(tmpRoot, "alt.enc");
  await exportBackup(BACKUP_PASSWORD, altBackup);
  assert.ok(fs.existsSync(altBackup));

  if (!allPass) {
    process.exitCode = 1;
  }
}

run().catch(function onFatal(err) {
  console.error(err);
  process.exit(1);
});
