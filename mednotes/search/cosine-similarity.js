/**
 * Reasoning: Cosine similarity is the standard compare for L2-normalized MiniLM
 * vectors. With normalize:true on embed, this is just a dot product, but the
 * full formula stays here so unnormalized test vectors still work.
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error("Vector length mismatch");
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  cosineSimilarity: cosineSimilarity,
};
