// Visual styling uses ../DESIGN.md tokens in styles.css.
const dateFilter = createDateFilter({
  root: document.getElementById("date-filter"),
});

const postList = createPostList({
  root: document.getElementById("post-list"),
  onEdit: (id, text) => openEditor("edit", id, text),
  onAddTag: id => openEditor("tag", id, ""),
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
  document.getElementById("note-count").textContent = posts.length + (posts.length === 1 ? " note" : " notes");
}

const editDialog = document.getElementById("edit-dialog");
const editText = document.getElementById("edit-text");
const editTag = document.getElementById("edit-tag");
const editStatus = document.getElementById("edit-status");
const editSave = document.getElementById("edit-save");
let editorState = null;
let editorFocus = null;
function openEditor(mode, id, text) {
  editorFocus = document.activeElement;
  editorState = { mode, id };
  document.getElementById("edit-title").textContent = mode === "edit" ? "Edit note" : "Add a tag";
  editSave.textContent = mode === "edit" ? "Save changes" : "Add tag";
  editText.value = text;
  editTag.value = "";
  editStatus.textContent = "";
  editText.classList.toggle("hidden", mode !== "edit");
  document.querySelector('label[for="edit-text"]').classList.toggle("hidden", mode !== "edit");
  editText.required = mode === "edit";
  editTag.required = mode === "tag";
  editTag.classList.toggle("hidden", mode !== "tag");
  document.getElementById("tag-label").classList.toggle("hidden", mode !== "tag");
  editDialog.showModal();
  (mode === "edit" ? editText : editTag).focus();
}
function closeEditor() { if (!editSave.disabled) editDialog.close(); }
["edit-cancel", "edit-close"].forEach(id => document.getElementById(id).addEventListener("click", closeEditor));
editDialog.addEventListener("cancel", event => { event.preventDefault(); closeEditor(); });
editDialog.addEventListener("close", () => {
  if (editorFocus && editorFocus.isConnected) editorFocus.focus();
  else if (editorState) {
    const card = Array.from(document.querySelectorAll("#post-list .post")).find(el => el.dataset.postId === editorState.id);
    if (card) card.focus();
  }
});
document.getElementById("edit-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (editSave.disabled || !editorState) return;
  const { mode, id } = editorState;
  const value = (mode === "edit" ? editText.value : editTag.value).trim();
  if (!value) { editStatus.textContent = "Please enter " + (mode === "edit" ? "note text." : "a tag name."); return; }
  editSave.disabled = true;
  editText.disabled = true;
  editTag.disabled = true;
  editSave.textContent = "Saving…";
  editStatus.textContent = "";
  try {
    if (mode === "edit") await window.mednotes.editPost({ id, text: value });
    else await window.mednotes.addTag({ id, tag: value });
    await refreshList();
    editDialog.close();
  } catch (error) {
    editStatus.textContent = "Could not save: " + error.message;
  } finally {
    editSave.disabled = false;
    editText.disabled = false;
    editTag.disabled = false;
    editSave.textContent = mode === "edit" ? "Save changes" : "Add tag";
  }
});

const searchDialog = document.getElementById("search-dialog");
const searchInput = document.getElementById("search-input");
const searchStatus = document.getElementById("search-status");
const searchResults = document.getElementById("search-results");
let searchVersion = 0;
let previousFocus = null;
let selectedPost = null;
function openSearch() {
  if (editDialog.open) return;
  if (searchDialog.open) { searchInput.focus(); return; }
  previousFocus = document.activeElement;
  searchDialog.showModal();
  searchInput.focus();
}
document.getElementById("search-shortcut").textContent = /Mac/.test(navigator.platform) ? "⌘ K" : "Ctrl K";
document.getElementById("open-search").addEventListener("click", openSearch);
document.getElementById("close-search").addEventListener("click", () => searchDialog.close());
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault(); openSearch();
  }
});
searchDialog.addEventListener("keydown", event => {
  if (event.key === "Escape") { event.preventDefault(); searchDialog.close(); return; }
  if (event.key !== "Tab") return;
  const controls = Array.from(searchDialog.querySelectorAll("button, input")).filter(el => !el.disabled);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
searchDialog.addEventListener("click", event => {
  const rect = searchDialog.getBoundingClientRect();
  if (event.target === searchDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) searchDialog.close();
});
searchDialog.addEventListener("close", () => {
  searchVersion++;
  searchResults.replaceChildren();
  searchStatus.textContent = "Enter a search, then press Enter.";
  const target = selectedPost || previousFocus;
  selectedPost = null;
  if (target && target.isConnected) target.focus();
});
function invalidateSearch() {
  searchVersion++;
  searchResults.replaceChildren();
  searchStatus.textContent = "Press Enter to search.";
}
searchInput.addEventListener("input", invalidateSearch);
document.getElementById("date-filter").addEventListener("change", invalidateSearch);
document.getElementById("date-clear").addEventListener("click", invalidateSearch);
document.getElementById("search-form").addEventListener("submit", async event => {
  event.preventDefault();
  const version = ++searchVersion;
  const query = searchInput.value.trim();
  searchResults.replaceChildren();
  if (!query) { searchStatus.textContent = "Enter a search, then press Enter."; return; }
  searchStatus.textContent = "Searching your notes…";
  try {
    const results = await window.mednotes.searchPosts({ query, ...dateFilter.getRange() });
    if (version !== searchVersion || !searchDialog.open) return;
    searchStatus.textContent = results.length ? results.length + (results.length === 1 ? " result" : " results") + " · Select a note to open it" : "No matching notes. Try another search or date range.";
    for (const post of results) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      const meta = document.createElement("span");
      meta.textContent = formatPostDate(post.createdAt || post.id);
      const excerpt = document.createElement("div");
      excerpt.className = "result-excerpt";
      excerpt.textContent = post.text;
      button.append(meta, excerpt);
      button.addEventListener("click", () => {
        selectedPost = Array.from(document.querySelectorAll("#post-list .post")).find(card => card.dataset.postId === post.id);
        searchDialog.close();
        if (selectedPost) selectedPost.scrollIntoView({ block: "center" });
      });
      searchResults.appendChild(button);
    }
  } catch (err) {
    if (version === searchVersion && searchDialog.open) searchStatus.textContent = "Search failed: " + err.message;
  }
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
