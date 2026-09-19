/**
 * Reasoning: Date filter runs before ranking so out-of-range posts never compete
 * for top slots. Vectors are already in memory; this file only scores and sorts.
 */
const { cosineSimilarity } = require("./cosine-similarity");

function postPassesDateFilter(post, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) {
    return true;
  }
  if (!post.createdAt) {
    return false;
  }
  const created = new Date(post.createdAt).getTime();
  if (dateFrom) {
    const from = new Date(dateFrom).getTime();
    if (created < from) {
      return false;
    }
  }
  if (dateTo) {
    const to = new Date(dateTo).getTime();
    if (created > to) {
      return false;
    }
  }
  return true;
}

function searchPosts(options) {
  const posts = options.posts;
  const queryVector = options.queryVector;
  const dateFrom = options.dateFrom || null;
  const dateTo = options.dateTo || null;

  const scored = [];
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    if (!postPassesDateFilter(post, dateFrom, dateTo)) {
      continue;
    }
    const score = cosineSimilarity(queryVector, post.vector);
    scored.push({
      id: post.id,
      text: post.text,
      tags: post.tags || [],
      hasImage: post.hasImage,
      hasVoice: post.hasVoice,
      imagePath: post.imagePath || null,
      voicePath: post.voicePath || null,
      createdAt: post.createdAt,
      score: score,
    });
  }

  scored.sort(function sortByScoreDesc(a, b) {
    if (a.score < b.score) {
      return 1;
    }
    if (a.score > b.score) {
      return -1;
    }
    return 0;
  });
  return scored;
}

module.exports = {
  searchPosts: searchPosts,
  postPassesDateFilter: postPassesDateFilter,
};
