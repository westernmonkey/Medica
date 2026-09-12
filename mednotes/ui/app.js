/**
 * Reasoning: app.js wires composer, list, search, tags, and backup. Tag colors
 * are computed in the renderer with the same palette hash as tags/tag-color.js
 * so pills stay consistent without bundling Node modules into the page.
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

function tagColorFn(name) {
  const index = hashTagName(String(name).toLowerCase()) % TAG_PALETTE.length;
  return TAG_PALETTE[index];
}

const dateFilter = createDateFilter({
  root: document.getElementById("date-filter"),
});

const postList = createPostList({
  root: document.getElementById("post-list"),
  tagColorFn: tagColorFn,
  onEdit: function handleEdit(id, text) {
    window.mednotes.editPost({ id: id, text: text }).then(function afterEdit() {
      return refreshList();
    }).catch(function onEditError(err) {
      alert(err.message);
    });
  },
  onAddTag: function handleAddTag(id, tag) {
    window.mednotes.addTag({ id: id, tag: tag }).then(function afterTag() {
      return refreshList();
    }).catch(function onTagError(err) {
      alert(err.message);
    });
  },
  onDelete: function handleDelete(id) {
    window.mednotes.deletePost(id).then(function afterDelete() {
      return refreshList();
    }).catch(function onDeleteError(err) {
      alert(err.message);
    });
  },
});

const composer = createComposer({
  root: document.getElementById("composer"),
  onSave: async function handleSave(payload) {
    await window.mednotes.savePost(payload);
    await refreshList();
  },
});

async function refreshList() {
  const posts = await window.mednotes.readPosts();
  postList.render(posts);
}

document.getElementById("search-form").addEventListener("submit", function onSearchSubmit(event) {
  event.preventDefault();
  const query = document.getElementById("search-input").value.trim();
  if (!query) {
    refreshList();
    return;
  }
  const range = dateFilter.getRange();
  window.mednotes.searchPosts({
    query: query,
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
  }).then(function onSearchResults(results) {
    postList.render(results);
  }).catch(function onSearchError(err) {
    alert(err.message);
  });
});

document.getElementById("export-backup-btn").addEventListener("click", function onExportClick() {
  const passwordInput = document.getElementById("backup-password");
  const password = passwordInput.value;
  if (!password) {
    alert("Enter a backup password first.");
    passwordInput.focus();
    return;
  }
  window.mednotes.exportBackup(password).then(function onExported(result) {
    if (result.canceled) {
      return;
    }
    passwordInput.value = "";
    alert("Backup saved to " + result.path);
  }).catch(function onExportError(err) {
    alert(err.message);
  });
});

refreshList().then(function afterInitialLoad() {
  composer.focus();
}).catch(function onLoadError(err) {
  console.error(err);
});
