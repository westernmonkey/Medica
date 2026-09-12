function formatPostDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
  });
}

/**
 * Reasoning: List and search share one renderer so tag pills and attachment
 * markers stay consistent. Edit/tag actions live on the selected post row.
 */
function createPostList(options) {
  const root = options.root;
  const onEdit = options.onEdit;
  const onAddTag = options.onAddTag;
  const onDelete = options.onDelete;
  // Tag appearance uses ../DESIGN.md tokens in styles.css.

  function renderTags(tags) {
    const wrap = document.createElement("div");
    wrap.className = "tag-row";
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const pill = document.createElement("span");
      pill.className = "tag-pill";
      pill.textContent = tag;

      wrap.appendChild(pill);
    }
    return wrap;
  }

  function renderPost(post) {
    const card = document.createElement("article");
    card.className = "post";
    card.dataset.postId = post.id;
    card.tabIndex = -1;

    const meta = document.createElement("div");
    meta.className = "post-meta";
    meta.textContent = formatPostDate(post.createdAt || post.id) +
      (typeof post.score === "number" ? " · score " + post.score.toFixed(3) : "");
    card.appendChild(meta);

    // Order: image, then text, then voice.
    if (post.imagePath) {
      const img = document.createElement("img");
      img.className = "post-image";
      img.src = "file://" + post.imagePath;
      img.alt = "Attached photo";
      card.appendChild(img);
    }

    const body = document.createElement("pre");
    body.className = "post-text";
    body.textContent = post.text;
    card.appendChild(body);

    if (post.voicePath) {
      const audio = document.createElement("audio");
      audio.className = "post-audio";
      audio.controls = true;
      audio.preload = "metadata";
      audio.src = "file://" + post.voicePath;
      card.appendChild(audio);
    }

    card.appendChild(renderTags(post.tags || []));

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/></svg><span>Edit text</span>';
    editBtn.addEventListener("click", function onEditClick() {
      onEdit(post.id, post.text);
    });

    const tagBtn = document.createElement("button");
    tagBtn.type = "button";
    tagBtn.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="8" cy="8" r="1"/></svg><span>Add tag</span>';
    tagBtn.addEventListener("click", function onTagClick() {
      onAddTag(post.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></svg><span>Delete</span>';
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
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML = '<svg class="empty-art" aria-hidden="true" viewBox="0 0 80 80"><circle class="art-mint" cx="40" cy="40" r="34"/><rect class="art-paper" x="24" y="16" width="35" height="46" rx="6" transform="rotate(8 40 40)"/><path class="art-line" d="m33 29 16 2m-17 7 16 2m-17 7 10 1"/><circle class="art-butter" cx="61" cy="58" r="10"/></svg><span>No notes yet</span><p>Your saved notes will appear here.</p>';
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
