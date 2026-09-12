/**
 * Reasoning: Bundling the MiniLM ONNX files avoids a first-run network call.
 * Rural rotation sites and locked-down hospital networks often block Hugging Face.
 * allowRemoteModels stays false so a missing local file fails loudly instead of
 * silently downloading.
 */
const path = require("path");

let extractorPromise = null;

async function loadModel() {
  if (extractorPromise) {
    return extractorPromise;
  }
  extractorPromise = (async function createExtractor() {
    const transformers = await import("@huggingface/transformers");
    const env = transformers.env;
    const pipeline = transformers.pipeline;

    env.allowLocalModels = true;
    env.allowRemoteModels = false;
    env.localModelPath = path.join(__dirname, "..", "models");

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
