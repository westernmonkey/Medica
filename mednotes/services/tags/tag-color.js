/**
 * Reasoning: Deterministic hash means the same tag always gets the same color
 * without storing a separate color map.
 */
const TAG_PALETTE = [
  "#0B6E4F",
  "#1B4F72",
  "#6C3483",
  "#922B21",
  "#B9770E",
  "#117A65",
  "#1A5276",
  "#7D3C98",
  "#A04000",
  "#196F3D",
];

function hashTagName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function tagColor(name) {
  const index = hashTagName(String(name).toLowerCase()) % TAG_PALETTE.length;
  return TAG_PALETTE[index];
}

module.exports = {
  tagColor: tagColor,
  TAG_PALETTE: TAG_PALETTE,
};
