// Sharp chooses native packages for the build machine by default. A universal
// Mac app needs both platform packages so each processor can load its own.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const packageRoot = path.join(projectRoot, "node_modules");
const lock = require(path.join(projectRoot, "package-lock.json"));
const sharpPackage = require(path.join(packageRoot, "sharp", "package.json"));

const macPackages = [
  "@img/sharp-darwin-x64",
  "@img/sharp-libvips-darwin-x64",
  "@img/sharp-darwin-arm64",
  "@img/sharp-libvips-darwin-arm64",
];

function packageIsInstalled(name, version) {
  const manifestPath = path.join(packageRoot, name, "package.json");
  if (!fs.existsSync(manifestPath)) return false;

  const installed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (installed.name !== name || installed.version !== version) {
    throw new Error(`${name} is installed at an unexpected version.`);
  }
  return true;
}

function installPackage(name) {
  const version = sharpPackage.optionalDependencies[name];
  const lockedPackage = lock.packages[`node_modules/${name}`];

  if (!version || !lockedPackage || lockedPackage.version !== version) {
    throw new Error(`The lockfile does not contain the expected package: ${name}`);
  }
  if (packageIsInstalled(name, version)) return;

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "mednotes-sharp-"));
  const destination = path.join(packageRoot, name);

  try {
    const packed = execFileSync(
      "npm",
      ["pack", `${name}@${version}`, "--json", "--pack-destination", temporaryDirectory],
      { cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
    );
    const archiveInfo = JSON.parse(packed)[0];

    if (lockedPackage.integrity && archiveInfo.integrity !== lockedPackage.integrity) {
      throw new Error(`The downloaded package failed its lockfile integrity check: ${name}`);
    }

    fs.mkdirSync(destination, { recursive: true });
    execFileSync(
      "tar",
      ["-xzf", path.join(temporaryDirectory, archiveInfo.filename), "-C", destination, "--strip-components=1"],
      { stdio: "inherit" }
    );

    if (!packageIsInstalled(name, version)) {
      throw new Error(`Could not install the expected package: ${name}`);
    }
  } catch (error) {
    fs.rmSync(destination, { recursive: true, force: true });
    throw error;
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

for (const packageName of macPackages) {
  installPackage(packageName);
}

console.log("Sharp has both Intel and Apple silicon Mac binaries ready for the universal build.");
