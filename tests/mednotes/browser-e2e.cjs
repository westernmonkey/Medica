const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

const baseURL = "http://127.0.0.1:3100";
const browsers = [
  { name: "Chrome", executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" },
  { name: "Edge", executablePath: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" },
];

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function waitForServer(server) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error("Next.js test server stopped before startup.");
    try { const response = await fetch(`${baseURL}/mednotes`); if (response.ok) return; } catch {}
    await delay(500);
  }
  throw new Error("Next.js test server did not start.");
}

async function testBrowser(config) {
  const browser = await chromium.launch({
    executablePath: config.executablePath,
    headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const context = await browser.newContext({ acceptDownloads: true, permissions: ["microphone"], viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("console", message => console.log(`${config.name} console ${message.type()}: ${message.text()}`));
  page.on("pageerror", error => console.log(`${config.name} page error: ${error.stack || error.message}`));
  page.on("crash", () => console.log(`${config.name} page crashed`));
  page.on("close", () => console.log(`${config.name} page closed`));
  page.on("requestfailed", request => {
    if (/mednotes-models|mednotes-runtime/.test(request.url())) console.log(`${config.name} model request failed: ${request.url()} ${request.failure()?.errorText}`);
  });
  page.on("response", response => {
    if (/mednotes-models|mednotes-runtime/.test(response.url()) && !response.ok()) console.log(`${config.name} model response ${response.status()}: ${response.url()}`);
  });
  const serverWrites = [];
  page.on("request", request => {
    if (["POST", "PUT", "PATCH"].includes(request.method()) && new URL(request.url()).origin === baseURL) serverWrites.push(request.url());
  });
  await context.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: async ({ id }) => {
        const root = await navigator.storage.getDirectory();
        const prototype = Object.getPrototypeOf(root);
        if (!prototype.queryPermission) Object.defineProperty(prototype, "queryPermission", { configurable: true, value: async () => "granted" });
        if (!prototype.requestPermission) Object.defineProperty(prototype, "requestPermission", { configurable: true, value: async () => "granted" });
        return root.getDirectoryHandle(`MedNotes-E2E-${id}`, { create: true });
      },
    });
  });

  try {
    await page.goto(`${baseURL}/mednotes`);
    await page.getByRole("heading", { name: "MedNotes" }).waitFor();
    await page.getByRole("textbox", { name: "Post text" }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Search/ }).count(), 1);
    await page.getByRole("button", { name: "Choose notes folder" }).click();
    await page.evaluate(async () => {
      const fsRoot = await navigator.storage.getDirectory();
      const notes = await fsRoot.getDirectoryHandle("MedNotes-E2E-mednotes-posts");
      const oldRecovery = await notes.getDirectoryHandle("recovery", { create: true });
      const legacyPost = await oldRecovery.getDirectoryHandle("2025-01-01T00-00-00-000Z_abcd", { create: true });
      const file = await legacyPost.getFileHandle("text.md", { create: true });
      const writer = await file.createWritable();
      await writer.write("legacy recovery copy");
      await writer.close();
    });
    await page.getByRole("button", { name: "Choose recovery folder" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).waitFor({ state: "visible" });

    await page.getByRole("textbox", { name: "Post text" }).fill("A student had a productive day after completing a difficult assignment.");
    const upload = page.locator('input[type="file"][accept="image/*"]');
    await upload.setInputFiles({ name: "sample.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pWQAAAAASUVORK5CYII=", "base64") });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("status").filter({ hasText: /Post saved on this device|Could not save post:/ }).waitFor({ timeout: 180000 });
    const saveStatus = await page.getByRole("status").innerText();
    console.log(`${config.name} save status: ${saveStatus}`);
    assert.match(saveStatus, /Post saved on this device/);
    await page.locator('article[data-post-id]').filter({ hasText: "A student had a productive day" }).waitFor();
    console.log(`${config.name} files before reload: ${JSON.stringify(await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const notes = await root.getDirectoryHandle("MedNotes-E2E-mednotes-posts");
      const active = await notes.getDirectoryHandle("active");
      const recovery = await root.getDirectoryHandle("MedNotes-E2E-mednotes-backups");
      const names = [];
      const recoveryNames = [];
      for await (const [name, entry] of active.entries()) if (entry.kind === "directory") names.push(name);
      for await (const [name, entry] of recovery.entries()) if (entry.kind === "directory") recoveryNames.push(name);
      let legacyText = "";
      try { legacyText = await (await (await (await recovery.getDirectoryHandle("2025-01-01T00-00-00-000Z_abcd")).getFileHandle("text.md")).getFile()).text(); } catch {}
      let nestedRecovery = false;
      try { await notes.getDirectoryHandle("recovery"); nestedRecovery = true; } catch {}
      return { names, recoveryNames, legacyText, nestedRecovery, cards: document.querySelectorAll("article[data-post-id]").length, status: document.querySelector('[role="status"]')?.textContent };
    }))}`);
    const layout = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const notes = await root.getDirectoryHandle("MedNotes-E2E-mednotes-posts");
      const recovery = await root.getDirectoryHandle("MedNotes-E2E-mednotes-backups");
      const active = await notes.getDirectoryHandle("active");
      const activeNames = [];
      const recoveryNames = [];
      for await (const [name, entry] of active.entries()) if (entry.kind === "directory") activeNames.push(name);
      for await (const [name, entry] of recovery.entries()) if (entry.kind === "directory") recoveryNames.push(name);
      let legacyText = "";
      try { legacyText = await (await (await (await recovery.getDirectoryHandle("2025-01-01T00-00-00-000Z_abcd")).getFileHandle("text.md")).getFile()).text(); } catch {}
      let nestedRecovery = false;
      try { await notes.getDirectoryHandle("recovery"); nestedRecovery = true; } catch {}
      return { activeNames, recoveryNames, legacyText, nestedRecovery };
    });
    assert.equal(layout.nestedRecovery, false, `${config.name}: recovery must not remain inside the notes folder`);
    assert.equal(layout.legacyText, "legacy recovery copy", `${config.name}: old recovery files must be preserved in the separate folder`);
    assert.ok(layout.activeNames.some(id => layout.recoveryNames.includes(id)), `${config.name}: saved post must have a separate recovery copy`);
    await page.reload();
    await page.waitForTimeout(1000);
    console.log(`${config.name} reload check: ${await page.locator("main").last().innerText()}`);
    await page.locator('article[data-post-id]').filter({ hasText: "A student had a productive day" }).waitFor();

    await page.getByRole("button", { name: "Add tag" }).click();
    await page.getByLabel("Tag name").fill("Study");
    await page.getByRole("button", { name: "Add tag", exact: true }).last().click();
    await page.getByRole("article").getByText("Study", { exact: true }).waitFor();
    await page.getByLabel("Filter by tag").selectOption("Study");
    assert.equal(await page.locator("article[data-post-id]").count(), 1);

    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    await page.getByRole("searchbox", { name: "Search posts by meaning" }).fill("a student felt accomplished");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /productive day/ }).waitFor({ timeout: 180000 });
    await page.keyboard.press("Escape");

    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Trash" }).click();
    await page.getByRole("button", { name: "Restore", exact: true }).click();
    await page.locator('article[data-post-id]').filter({ hasText: "A student had a productive day" }).waitFor();
    await page.getByRole("dialog", { name: "Trash" }).getByRole("button", { name: "Esc" }).click();

    await page.getByRole("button", { name: "Create ZIP backup" }).click();
    await page.getByRole("status").filter({ hasText: /ZIP backup saved in your recovery folder:/ }).waitFor();
    const backupCheck = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const folder = await root.getDirectoryHandle("MedNotes-E2E-mednotes-backups");
      for await (const [name, entry] of folder.entries()) {
        if (entry.kind !== "file" || !name.endsWith(".zip")) continue;
        const bytes = new Uint8Array(await (await entry.getFile()).slice(0, 4).arrayBuffer());
        return { name, validZip: bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04 };
      }
      return null;
    });
    assert.ok(backupCheck?.validZip, `${config.name}: ZIP backup must be written in the separate recovery folder`);

    await page.setViewportSize({ width: 395, height: 800 });
    const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll("body *")].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(element => ({ tag: element.tagName, className: typeof element.className === "string" ? element.className : "", right: Math.round(element.getBoundingClientRect().right) })) }));
    assert.equal(overflow.scrollWidth <= overflow.width, true, `${config.name}: narrow layout overflow: ${JSON.stringify(overflow)}`);
    assert.equal(serverWrites.length, 0, `${config.name}: post content must not be sent to the server`);
    console.log(`${config.name}: browser UI, local save/reload, tag filter, semantic search, Trash, backup, and narrow layout passed.`);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  let server = null;
  try {
    try {
      const response = await fetch(`${baseURL}/mednotes`);
      if (!response.ok) throw new Error("MedNotes dev server returned an error.");
    } catch {
      server = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3100"], { stdio: "inherit" });
      await waitForServer(server);
    }
    let tested = 0;
    for (const config of browsers) {
      if (!fs.existsSync(config.executablePath)) {
        console.log(`${config.name} skipped: browser is not installed on this Mac.`);
        continue;
      }
      await testBrowser(config);
      tested++;
    }
    if (!tested) throw new Error("Install Chrome or Edge to run the MedNotes browser tests.");
  } finally {
    server?.kill("SIGTERM");
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
