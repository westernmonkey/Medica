/**
 * Reasoning: Mean pooling + L2 normalize matches how MiniLM sentence embeddings
 * are usually compared with cosine similarity. Returning a plain Float32Array of
 * length 384 keeps vector.bin a fixed 1536 bytes.
 */
const { loadModel } = require("./load-model");

async function embedText(text) {
  const extractor = await loadModel();
  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });
  const data = output.data;
  const vector = new Float32Array(384);
  for (let i = 0; i < 384; i++) {
    vector[i] = data[i];
  }
  return vector;
}

module.exports = {
  embedText: embedText,
};
