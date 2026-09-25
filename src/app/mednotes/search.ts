import type { Post } from "./browser-store";

export function cosineSimilarity(left: Float32Array, right: Float32Array) {
  if (left.length !== right.length || left.length === 0) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index++) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }
  return leftMagnitude && rightMagnitude ? dot / Math.sqrt(leftMagnitude * rightMagnitude) : 0;
}

export function rankPosts(posts: Post[], queryVector: Float32Array, dateFrom = "", dateTo = "") {
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : -Infinity;
  const to = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : Infinity;
  return posts.filter(post => {
    const created = new Date(post.createdAt).getTime();
    return Number.isFinite(created) && created >= from && created <= to;
  }).map(post => ({ ...post, score: cosineSimilarity(queryVector, post.vector) }))
    .sort((left, right) => right.score - left.score);
}
