/**
 * Reasoning: Bundling the MiniLM ONNX files avoids a first-run network call.
 * Rural rotation sites and locked-down hospital networks often block Hugging Face.
 * allowRemoteModels stays false so a missing local file fails loudly instead of
 * silently downloading.
 */
const fs = require("fs");
const path = require("path");

let extractorPromise = null;

function getModelRoot() {
  if (process.resourcesPath) {
    const packagedModelRoot = path.join(process.resourcesPath, "models");
    if (fs.existsSync(packagedModelRoot)) {
      return packagedModelRoot;
    }
  }
  return path.join(__dirname, "..", "..", "models");
}

function verifyModelFiles(modelRoot) {
  const modelDirectory = path.join(modelRoot, "Xenova", "all-MiniLM-L6-v2");
  const requiredFiles = [
    "config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    path.join("onnx", "model_quantized.onnx"),
  ];

  for (const relativeFile of requiredFiles) {
    if (!fs.existsSync(path.join(modelDirectory, relativeFile))) {
      throw new Error("Local embedding model is incomplete: missing " + relativeFile);
    }
  }
}

async function loadModel() {
  if (extractorPromise) {
    return extractorPromise;
  }
  extractorPromise = (async function createExtractor() {
    const transformers = await import("@huggingface/transformers");
    const env = transformers.env;
    const pipeline = transformers.pipeline;
    const modelRoot = getModelRoot();

    verifyModelFiles(modelRoot);

    env.allowLocalModels = true;
    env.allowRemoteModels = false;
    env.localModelPath = modelRoot;

    const extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { dtype: "q8" }
    );
    return extractor;
  })();
  return extractorPromise;
}

module.exports = {
  loadModel: loadModel,
};
