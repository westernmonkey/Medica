const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const modelSource = path.join(projectRoot, "mednotes", "models", "Xenova", "all-MiniLM-L6-v2");
const modelDestination = path.join(projectRoot, "public", "mednotes-models", "Xenova", "all-MiniLM-L6-v2");
const runtimeCandidates = [
  path.join(projectRoot, "node_modules", "onnxruntime-web", "dist"),
  path.join(projectRoot, "mednotes", "node_modules", "onnxruntime-web", "dist"),
];
const runtimeSource = runtimeCandidates.find(candidate => fs.existsSync(candidate));
const runtimeDestination = path.join(projectRoot, "public", "mednotes-runtime");
const runtimeFiles = [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
];

if (!fs.existsSync(path.join(modelSource, "onnx", "model_quantized.onnx"))) {
  throw new Error("The local MedNotes embedding model is missing.");
}
if (!runtimeSource) throw new Error("The onnxruntime-web runtime files are missing.");

fs.rmSync(path.join(projectRoot, "public", "mednotes-models"), { recursive: true, force: true });
fs.rmSync(runtimeDestination, { recursive: true, force: true });
fs.mkdirSync(path.dirname(modelDestination), { recursive: true });
fs.mkdirSync(runtimeDestination, { recursive: true });
fs.cpSync(modelSource, modelDestination, { recursive: true });

for (const filename of runtimeFiles) {
  const source = path.join(runtimeSource, filename);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(runtimeDestination, filename));
}

console.log("Prepared local MedNotes model and WebAssembly runtime assets.");
