/**
 * Reasoning: Manual encrypted export is separate from the automatic mirror.
 * AES-GCM with a PBKDF2-derived key means the file is useless without the
 * password, even if someone copies it off the machine.
 */
const fs = require("fs");
const path = require("path");
const nodeCrypto = require("crypto");
const JSZip = require("jszip");
const { getWorkingRoot, ensureRootsExist } = require("../storage/paths");

const webcrypto = nodeCrypto.webcrypto;
const PBKDF2_ITERATIONS = 210000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

async function zipWorkingFolder() {
  ensureRootsExist();
  const root = getWorkingRoot();
  const zip = new JSZip();

  function addDir(dir, zipFolder) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        addDir(full, zipFolder.folder(entry.name));
      } else {
        zipFolder.file(entry.name, fs.readFileSync(full));
      }
    }
  }

  addDir(root, zip);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function deriveKey(password, salt) {
  const passwordBytes = new TextEncoder().encode(password);
  const baseKey = await webcrypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return webcrypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptZipBuffer(zipBuffer, password) {
  const salt = webcrypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = webcrypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const cipher = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    zipBuffer
  );
  const packed = Buffer.concat([
    Buffer.from(salt),
    Buffer.from(iv),
    Buffer.from(cipher),
  ]);
  return packed;
}

async function decryptBackupBuffer(packed, password) {
  const salt = packed.subarray(0, SALT_BYTES);
  const iv = packed.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const cipher = packed.subarray(SALT_BYTES + IV_BYTES);
  const key = await deriveKey(password, salt);
  const plain = await webcrypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    cipher
  );
  return Buffer.from(plain);
}

async function exportBackup(password, destinationPath) {
  if (!password) {
    throw new Error("Password is required");
  }
  const zipBuffer = await zipWorkingFolder();
  const packed = await encryptZipBuffer(zipBuffer, password);
  fs.writeFileSync(destinationPath, packed);
  return destinationPath;
}

module.exports = {
  exportBackup: exportBackup,
  encryptZipBuffer: encryptZipBuffer,
  decryptBackupBuffer: decryptBackupBuffer,
  zipWorkingFolder: zipWorkingFolder,
};
