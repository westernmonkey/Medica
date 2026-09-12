/**
 * Reasoning: List and search share one renderer so tag pills and attachment
 * markers stay consistent. Edit/tag actions live on the selected post row.
 */
function createPostList(options) {
  const root = options.root;
  const onEdit = options.onEdit;
  const onAddTag = options.onAddTag;
  const onDelete = options.onDelete;
  const tagColorFn = options.tagColorFn;

  function renderTags(tags) {
    const wrap = document.createElement("div");
    wrap.className = "tag-row";
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const pill = document.createElement("span");
      pill.className = "tag-pill";
      pill.textContent = tag;
      pill.style.backgroundColor = tagColorFn(tag);
      wrap.appendChild(pill);
    }
    return wrap;
  }

  function renderPost(post) {
    const card = document.createElement("article");
    card.className = "post";
    card.dataset.postId = post.id;

    const meta = document.createElement("div");
    meta.className = "post-meta";
    meta.textContent = (post.createdAt || post.id) +
      (post.hasImage ? " · photo" : "") +
      (post.hasVoice ? " · voice" : "") +
      (typeof post.score === "number" ? " · score " + post.score.toFixed(3) : "");

    const body = document.createElement("pre");
    body.className = "post-text";
    body.textContent = post.text;

    card.appendChild(meta);
    card.appendChild(body);
    card.appendChild(renderTags(post.tags || []));

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "Edit text";
    editBtn.addEventListener("click", function onEditClick() {
      const next = window.prompt("Edit note text", post.text);
      if (next === null) {
        return;
      }
      onEdit(post.id, next);
    });

    const tagBtn = document.createElement("button");
    tagBtn.type = "button";
    tagBtn.textContent = "Add tag";
    tagBtn.addEventListener("click", function onTagClick() {
      const name = window.prompt("Tag name");
      if (!name) {
        return;
      }
      onAddTag(post.id, name.trim());
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", function onDeleteClick() {
      if (window.confirm("Delete this note?")) {
        onDelete(post.id);
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(tagBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);
    return card;
  }

  function render(posts) {
    root.innerHTML = "";
    if (!posts || posts.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No notes yet.";
      root.appendChild(empty);
      return;
    }
    for (let i = 0; i < posts.length; i++) {
      root.appendChild(renderPost(posts[i]));
    }
  }

  return {
    render: render,
  };
}
