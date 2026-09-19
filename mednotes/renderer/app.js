// Visual styling uses ../DESIGN.md tokens in styles.css.
import { createDateFilter } from "./date-filter.js";
import { createPostList, formatPostDate } from "./post-list.js";
import { createComposer } from "./composer.js";

const dateFilter = createDateFilter({
  root: document.getElementById("date-filter"),
});

const postList = createPostList({
  root: document.getElementById("post-list"),
  onEdit: (id, text) => openEditor("edit", id, text),
  onAddTag: id => openEditor("tag", id, ""),
  onDelete: function handleDelete(id) {
    window.mednotes.deletePost(id).then(function afterDelete() {
      return Promise.all([refreshList(), refreshTrashCount()]);
    }).catch(function onDeleteError(err) {
      alert("Could not move post to Trash: " + err.message);
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
  document.getElementById("note-count").textContent = posts.length + (posts.length === 1 ? " post" : " posts");
}

const trashDialog = document.getElementById("trash-dialog");
const trashList = document.getElementById("trash-list");
const trashStatus = document.getElementById("trash-status");
const emptyTrashButton = document.getElementById("empty-trash");
let trashFocus = null;

function createTrashPost(post) {
  const card = document.createElement("article");
  card.className = "trash-post";
  const meta = document.createElement("p");
  meta.className = "post-meta";
  meta.textContent = post.deletedAt ? "Deleted " + formatPostDate(post.deletedAt) : "Deletion time unavailable";
  const text = document.createElement("pre");
  text.className = "post-text";
  text.textContent = post.text;
  const details = document.createElement("p");
  details.className = "trash-details";
  const attachments = [];
  if (post.hasImage) attachments.push("photo");
  if (post.hasVoice) attachments.push("voice");
  details.textContent = attachments.length ? "Includes " + attachments.join(" and ") : "Text post";
  const actions = document.createElement("div");
  actions.className = "trash-actions";
  const restore = document.createElement("button");
  restore.type = "button";
  restore.textContent = "Restore";
  restore.addEventListener("click", async function restoreDeletedPost() {
    restore.disabled = true;
    try {
      await window.mednotes.restorePost(post.id);
      await Promise.all([refreshList(), loadTrash()]);
    } catch (error) {
      trashStatus.textContent = "Could not restore post: " + error.message;
      restore.disabled = false;
    }
  });
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Delete forever";
  remove.addEventListener("click", async function permanentlyDeletePost() {
    if (!window.confirm("Delete this post forever? This cannot be undone.")) return;
    remove.disabled = true;
    try {
      await window.mednotes.deletePostForever(post.id);
      await loadTrash();
    } catch (error) {
      trashStatus.textContent = "Could not permanently delete post: " + error.message;
      remove.disabled = false;
    }
  });
  actions.append(restore, remove);
  card.append(meta, text, details, actions);
  return card;
}

async function loadTrash() {
  trashStatus.textContent = "Loading Trash…";
  try {
    const posts = await window.mednotes.readTrashPosts();
    trashList.replaceChildren();
    for (const post of posts) trashList.appendChild(createTrashPost(post));
    if (!posts.length) {
      const empty = document.createElement("p");
      empty.className = "trash-empty";
      empty.textContent = "Trash is empty.";
      trashList.appendChild(empty);
    }
    trashStatus.textContent = posts.length + (posts.length === 1 ? " deleted post" : " deleted posts");
    document.getElementById("trash-count").textContent = String(posts.length);
    emptyTrashButton.disabled = posts.length === 0;
  } catch (error) {
    trashList.replaceChildren();
    trashStatus.textContent = "Could not load Trash: " + error.message;
    emptyTrashButton.disabled = true;
  }
}

async function refreshTrashCount() {
  try {
    const posts = await window.mednotes.readTrashPosts();
    document.getElementById("trash-count").textContent = String(posts.length);
  } catch (error) {
    console.error("Could not refresh Trash count", error);
  }
}

const railLinks = document.querySelectorAll(".rail-link");
const postsLink = document.querySelector('a[href="#notes-section"]');
postsLink.addEventListener("click", function showPosts() {
  railLinks.forEach(link => link.classList.remove("is-active"));
  this.classList.add("is-active");
});
document.getElementById("open-trash").addEventListener("click", async function openTrash() {
  railLinks.forEach(link => link.classList.remove("is-active"));
  this.classList.add("is-active");
  trashFocus = document.activeElement;
  await loadTrash();
  trashDialog.showModal();
});
document.getElementById("close-trash").addEventListener("click", function closeTrash() {
  trashFocus = postsLink;
  trashDialog.close();
  railLinks.forEach(link => link.classList.remove("is-active"));
  postsLink.classList.add("is-active");
});
trashDialog.addEventListener("close", function restoreTrashFocus() {
  if (trashFocus && trashFocus.isConnected) trashFocus.focus();
});
emptyTrashButton.addEventListener("click", async function emptyAllTrash() {
  if (!window.confirm("Permanently delete every post in Trash? This cannot be undone.")) return;
  emptyTrashButton.disabled = true;
  try {
    await window.mednotes.emptyTrash();
    await loadTrash();
  } catch (error) {
    trashStatus.textContent = "Could not empty Trash: " + error.message;
    emptyTrashButton.disabled = false;
  }
});

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
  document.getElementById("edit-title").textContent = mode === "edit" ? "Edit post" : "Add a tag";
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
  if (!value) { editStatus.textContent = "Please enter " + (mode === "edit" ? "post text." : "a tag name."); return; }
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
  searchStatus.textContent = "Searching your posts…";
  try {
    const results = await window.mednotes.searchPosts({ query, ...dateFilter.getRange() });
    if (version !== searchVersion || !searchDialog.open) return;
    searchStatus.textContent = results.length ? results.length + (results.length === 1 ? " result" : " results") + " · Select a post to open it" : "No matching posts. Try another search or date range.";
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

Promise.all([refreshList(), refreshTrashCount()]).then(function afterInitialLoad() {
  composer.focus();
}).catch(function onLoadError(err) {
  console.error(err);
});
