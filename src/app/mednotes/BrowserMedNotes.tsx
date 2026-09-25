"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addTag, connectFolder, deleteForever, editPost, emptyTrash,
  connectBackupFolder, exportBackup, importBackup, initializeStore, moveToTrash, readPosts, readTrash,
  reconnectBackupFolder, reconnectFolder, restorePost, savePost, type BackupState, type Post,
} from "./browser-store";
import { embedText } from "./embeddings";
import { rankPosts } from "./search";
import styles from "./mednotes.module.css";

type StoreState = "folder-required" | "permission-required" | "unsupported" | "ready";

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function PostMedia({ blob, audio = false }: { blob: Blob | null; audio?: boolean }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  if (!url) return null;
  return audio ? <audio className={styles.audio} controls preload="metadata" src={url} /> : <img className={styles.image} src={url} alt="Attached photo" />;
}

function Icon({ name }: { name: "search" | "note" | "trash" | "mic" | "camera" | "edit" | "tag" | "delete" | "folder" }) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,
    note: <><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    trash: <><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></>,
    camera: <><path d="M3 6h4l2-3h6l2 3h4v15H3z"/><circle cx="12" cy="13" r="4"/></>,
    edit: <><path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/></>,
    tag: <><path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="8" cy="8" r="1"/></>,
    delete: <><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
    folder: <><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={styles.icon}>{paths[name]}</svg>;
}

export default function BrowserMedNotes() {
  const [storeState, setStoreState] = useState<StoreState>("folder-required");
  const [backupState, setBackupState] = useState<BackupState>("folder-required");
  const [backend, setBackend] = useState<"folder" | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notesFolderName, setNotesFolderName] = useState("");
  const [backupFolderName, setBackupFolderName] = useState("");
  const [trash, setTrash] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState<Blob | null>(null);
  const [voice, setVoice] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchState, setSearchState] = useState("Enter a search, then press Enter.");
  const [results, setResults] = useState<Array<Post & { score: number }>>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [editorPost, setEditorPost] = useState<Post | null>(null);
  const [editText, setEditText] = useState("");
  const [tagPost, setTagPost] = useState<Post | null>(null);
  const [tagText, setTagText] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [shortcut, setShortcut] = useState("Ctrl K");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const searchVersion = useRef(0);
  const previousFocus = useRef<HTMLElement | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const [active, deleted] = await Promise.all([readPosts(), readTrash()]);
    setPosts(active);
    setTrash(deleted);
  }, []);

  useEffect(() => {
    if (/Mac/.test(navigator.platform)) setShortcut("⌘ K");
  }, []);

  useEffect(() => {
    initializeStore().then(async result => {
      setStoreState(result.state);
      setBackupState(result.backupState);
      setBackend(result.backend);
      setNotesFolderName(result.notesFolderName);
      setBackupFolderName(result.backupFolderName);
      if (result.state === "ready") await refresh();
    }).catch(error => setStatus(`Could not open local storage: ${error.message}`));
  }, [refresh]);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { setSearchOpen(false); return; }
      if (event.key !== "Tab") return;
      const dialog = document.getElementById("mednotes-search-dialog");
      const controls = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>("button,input" )).filter(el => !el.hasAttribute("disabled")) : [];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [searchOpen]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); previousFocus.current = document.activeElement as HTMLElement; setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    if (!searchOpen && previousFocus.current?.isConnected) previousFocus.current.focus();
  }, [searchOpen]);

  const tags = useMemo(() => Array.from(new Set(posts.flatMap(post => post.tags))).sort((a, b) => a.localeCompare(b)), [posts]);
  const visiblePosts = useMemo(() => tagFilter ? posts.filter(post => post.tags.includes(tagFilter)) : posts, [posts, tagFilter]);

  async function activateStore(connect = false) {
    setStatus("");
    try {
      const result = connect ? await connectFolder() : await reconnectFolder();
      setStoreState(result.state);
      setBackupState(result.backupState);
      setBackend(result.backend);
      setNotesFolderName(result.notesFolderName);
      setBackupFolderName(result.backupFolderName);
      await refresh();
      if ("migrationError" in result && result.migrationError) setStatus(`Notes folder connected, but older browser notes could not be copied: ${result.migrationError}`);
      else if ("migratedPosts" in result && result.migratedPosts) setStatus(`Copied ${result.migratedPosts} older browser ${result.migratedPosts === 1 ? "post" : "posts"} into this folder. The old copies were kept.`);
    } catch (error) { setStatus(`Could not connect storage: ${(error as Error).message}`); }
  }

  async function chooseBackupFolder() {
    try {
      const result = await connectBackupFolder();
      setBackupState(result.backupState);
      setBackupFolderName(result.backupFolderName);
      setStatus("Backup folder selected.");
    } catch (error) { setStatus(`Could not connect backup folder: ${(error as Error).message}`); }
  }

  async function createBackup() {
    try {
      if (backupState === "folder-required") {
        const result = await connectBackupFolder();
        setBackupState(result.backupState);
        setBackupFolderName(result.backupFolderName);
      } else if (backupState === "permission-required") {
        const result = await reconnectBackupFolder();
        setBackupState(result.backupState);
        setBackupFolderName(result.backupFolderName);
      }
      const filename = await exportBackup();
      setStatus(`Backup saved in your backup folder: ${filename}`);
    } catch (error) { setStatus(`Backup failed: ${(error as Error).message}`); }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const cleaned = text.trim();
    if (!cleaned && !image && !voice) return;
    setSaving(true);
    setStatus("Preparing local search…");
    try {
      const vector = await embedText(cleaned || "Medical note with attachment");
      await savePost({ text: cleaned || "(attachment only)", vector, image, voice });
      setText(""); setImage(null); setVoice(null); setStatus("Post saved on this device.");
      await refresh();
      composerRef.current?.focus();
    } catch (error) { setStatus(`Could not save post: ${(error as Error).message}`); }
    finally { setSaving(false); }
  }

  async function toggleRecording() {
    if (recording) { recorderRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        setVoice(new Blob(chunksRef.current, { type: mimeType }));
        stream.getTracks().forEach(track => track.stop());
        setRecording(false);
      };
      recorder.start(200);
      setRecording(true);
    } catch (error) { setStatus(`Microphone unavailable: ${(error as Error).message}`); }
  }

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    const version = ++searchVersion.current;
    setResults([]);
    if (!searchText.trim()) { setSearchState("Enter a search, then press Enter."); return; }
    setSearchState("Searching your posts…");
    try {
      const vector = await embedText(searchText.trim());
      const matches = rankPosts(posts, vector, dateFrom, dateTo);
      if (version !== searchVersion.current) return;
      setResults(matches);
      setSearchState(matches.length ? `${matches.length} ${matches.length === 1 ? "result" : "results"} · Select a post to open it` : "No matching posts. Try another search or date range.");
    } catch (error) { if (version === searchVersion.current) setSearchState(`Search failed: ${(error as Error).message}`); }
  }

  async function beginEdit(post: Post) { setEditorPost(post); setEditText(post.text); setDialogError(""); }
  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editorPost || busy) return;
    setBusy(true); setDialogError("Saving…");
    try {
      const vector = await embedText(editText.trim());
      await editPost(editorPost.id, { text: editText.trim(), vector, image: editorPost.image, voice: editorPost.voice });
      setEditorPost(null); await refresh();
    } catch (error) { setDialogError(`Could not save: ${(error as Error).message}`); }
    finally { setBusy(false); }
  }

  async function saveTag(event: React.FormEvent) {
    event.preventDefault(); if (!tagPost || busy) return;
    setBusy(true); setDialogError("");
    try { await addTag(tagPost.id, tagText); setTagPost(null); setTagText(""); await refresh(); }
    catch (error) { setDialogError((error as Error).message); }
    finally { setBusy(false); }
  }

  async function doDelete(post: Post) {
    if (!window.confirm("Move this post to Trash?")) return;
    try { await moveToTrash(post.id); await refresh(); }
    catch (error) { setStatus(`Could not move post to Trash: ${(error as Error).message}`); }
  }

  async function handleImport(file?: File) {
    if (!file) return;
    setStatus("Checking backup…");
    try {
      const result = await importBackup(file);
      await refresh();
      setStatus(`Restored ${result.imported} posts. ${result.conflicts.length ? `${result.conflicts.length} existing posts were skipped.` : ""}`);
    } catch (error) { setStatus(`Could not restore backup: ${(error as Error).message}`); }
    finally { if (backupRef.current) backupRef.current.value = ""; }
  }

  function openSearch() { previousFocus.current = document.activeElement as HTMLElement; setSearchOpen(true); }

  return (
    <div className={styles.app}>
      <aside className={styles.rail}>
        <a className={styles.logoPlaque} href="/" aria-label="Medica home"><img src="/Medica-logo.png" alt="Medica" /></a>
        <span className={styles.railCaption}>MEDNOTES</span>
        <a className={`${styles.railLink} ${styles.active}`} href="#posts"><Icon name="note"/> Posts</a>
        <button className={styles.railLink} type="button" onClick={() => setTrashOpen(true)}><Icon name="trash"/> Trash <span className={styles.railCount}>{trash.length}</span></button>
        <button className={`${styles.railLink} ${styles.newPostLink}`} type="button" onClick={() => composerRef.current?.focus()}><span aria-hidden="true">＋</span> New post</button>
        <div className={styles.railFooter}><span className={styles.statusDot}/><span>{backend === "folder" ? `Notes: ${notesFolderName}` : "Choose a notes folder"}</span></div>
      </aside>

      <main className={styles.shell}>
        <header className={styles.top}>
          <div className={styles.brand}><span className={styles.brandDivider}/><span>Your posts</span></div>
          <div className={styles.topActions}>
            {storeState === "ready" && <span className={styles.storageLabel}>Notes: {notesFolderName}{backupState === "ready" ? ` · Backup: ${backupFolderName}` : " · Backup folder not set"}</span>}
            {backend === "folder" && storeState === "ready" && <button type="button" className={styles.storageButton} onClick={() => activateStore(true)}><Icon name="folder"/> Change notes folder</button>}
            {storeState === "ready" && <>
              <button type="button" className={styles.backupButton} onClick={createBackup}>{backupState === "ready" ? "Create backup" : backupState === "permission-required" ? "Reconnect & back up" : "Choose backup folder & back up"}</button>
              {backupState === "ready" && <button type="button" className={styles.backupButton} onClick={chooseBackupFolder}>Change backup folder</button>}
            </>}
            {storeState === "ready" && <button type="button" className={styles.backupButton} onClick={() => backupRef.current?.click()}>Import backup file</button>}
            <input ref={backupRef} type="file" accept=".zip,application/zip" className={styles.hidden} onChange={event => handleImport(event.target.files?.[0])}/>
            <button id="open-search" type="button" className={styles.searchButton} onClick={openSearch}><Icon name="search"/> Search <kbd>{shortcut}</kbd></button>
          </div>
        </header>

        <section className={styles.identity} aria-label="MedNotes">
          <div><span className={styles.identityLabel}>YOUR PERSONAL NOTEBOOK</span><h1>MedNotes<span aria-hidden="true">✦</span></h1><p>Clinical thoughts, kept close.</p></div>
          <svg className={styles.identityArt} aria-hidden="true" viewBox="0 0 240 190"><circle className={styles.disc} cx="128" cy="96" r="80"/><g transform="rotate(-14 100 100)"><rect className={styles.backPage} x="41" y="32" width="112" height="137" rx="12"/><path className={styles.artLine} d="M57 59h63M57 72h49"/></g><g transform="rotate(9 137 102)"><rect className={styles.frontPage} x="82" y="28" width="110" height="140" rx="12"/><path className={styles.notebookLine} d="M105 64h59M105 81h49M105 98h59M105 115h34M95 28v140"/></g><path className={styles.sparkLine} d="M207 25v22m-11-11h22M27 116v16m-8-8h16"/><circle className={styles.peachDisc} cx="187" cy="149" r="25"/><path className={styles.checkLine} d="m177 149 7 7 14-16"/></svg>
          <span className={styles.identityFoot}>TEXT / PHOTOS / VOICE</span>
        </section>

        <section className={styles.panel} aria-label="New post">
          <div className={styles.panelHeading}><span className={styles.headingIcon}>✎</span><h2>New post</h2><span className={styles.panelDecoration} aria-hidden="true">✳</span></div>
          <form className={styles.composer} onSubmit={handleSave}>
            <div className={styles.captureField}>
              <textarea ref={composerRef} id="composer-text" value={text} onChange={event => setText(event.target.value)} placeholder="Type a post…" aria-label="Post text" disabled={storeState !== "ready"}/>
              <div className={styles.captureActions}>
                <button type="button" className={styles.iconButton} onClick={toggleRecording} aria-label={recording ? "Stop recording" : "Record voice post"}><Icon name={recording ? "delete" : "mic"}/></button>
                <button type="button" className={styles.iconButton} onClick={() => fileRef.current?.click()} aria-label="Attach photo"><Icon name="camera"/></button>
                <input ref={fileRef} type="file" accept="image/*" className={styles.hidden} onChange={event => setImage(event.target.files?.[0] || null)}/>
              </div>
            </div>
            <div className={styles.composerToolbar}>
              <span className={recording ? styles.recording : styles.attachStatus}>{recording ? "Recording" : [image && "photo", voice && "voice"].filter(Boolean).join(" · ") || "Saved only on this device"}</span>
              <button className={styles.saveButton} type="submit" disabled={saving || storeState !== "ready"}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </section>

        <section className={styles.postsSection} id="posts" aria-label="Your posts">
          <div className={styles.postsHeading}><div><span className={styles.postsIcon}><Icon name="note"/></span><h2>Posts</h2><span className={styles.countChip}>{posts.length}</span></div><label className={styles.tagFilter}>Filter by tag <select aria-label="Filter by tag" value={tagFilter} onChange={event => setTagFilter(event.target.value)}><option value="">All tags</option>{tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}</select></label></div>
          {storeState !== "ready" && <div className={styles.storageNotice} role="status">
            <strong>{storeState === "unsupported" ? "MedNotes needs browser folder access." : storeState === "folder-required" ? "Choose where MedNotes should save your posts." : "MedNotes needs permission to open your notes folder."}</strong>
            <p>{storeState === "unsupported" ? "Use the latest Chrome or Edge over HTTPS (or localhost). This browser does not support choosing a local folder, so MedNotes will not save posts here." : storeState === "folder-required" ? "Choose a folder for your notes. MedNotes will create active, .trash, and recovery inside it." : "Your saved folder is remembered, but its permission needs to be restored."}</p>
            {storeState !== "unsupported" && <button type="button" className={styles.saveButton} onClick={() => activateStore(storeState === "folder-required")}>{storeState === "folder-required" ? "Choose notes folder" : "Reconnect notes folder"}</button>}
            {backend === "folder" && <p className={styles.storageFine}>Posts stay in the folder you selected on this device.</p>}
          </div>}
          {storeState === "ready" && posts.length === 0 && <div className={styles.empty}><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34"/><rect x="24" y="16" width="35" height="46" rx="6"/><path d="m33 29 16 2m-17 7 16 2m-17 7 10 1"/></svg><strong>No posts yet</strong><span>Your saved posts will appear here.</span></div>}
          {storeState === "ready" && posts.length > 0 && visiblePosts.length === 0 && <p className={styles.empty}>No posts use this tag yet.</p>}
          <div className={styles.postGrid}>{visiblePosts.map((post, index) => <article className={`${styles.post} ${index % 3 === 1 ? styles.postLilac : index % 3 === 2 ? styles.postButter : ""}`} key={post.id} data-post-id={post.id} tabIndex={-1}>
            <div className={styles.postMeta}>{dateLabel(post.createdAt)}</div><PostMedia blob={post.image}/><pre className={styles.postText}>{post.text}</pre><PostMedia blob={post.voice} audio/>
            <div className={styles.tagRow}>{post.tags.map(tag => <span key={tag} className={styles.tagPill}>{tag}</span>)}</div>
            <div className={styles.postActions}><button type="button" onClick={() => beginEdit(post)}><Icon name="edit"/> Edit text</button><button type="button" onClick={() => { setTagPost(post); setTagText(""); setDialogError(""); }}><Icon name="tag"/> Add tag</button><button type="button" onClick={() => doDelete(post)}><Icon name="delete"/> Delete</button></div>
          </article>)}</div>
        </section>
        {status && <p className={styles.statusMessage} role="status">{status}</p>}
      </main>

      {searchOpen && <div className={styles.overlay} onMouseDown={event => { if (event.target === event.currentTarget) setSearchOpen(false); }}>
        <section className={styles.dialog} id="mednotes-search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-title">
          <div className={styles.dialogHeading}><h2 id="search-title">Search posts</h2><button type="button" onClick={() => setSearchOpen(false)}>Esc</button></div>
          <form className={styles.searchForm} onSubmit={runSearch}><input ref={searchInput} type="search" value={searchText} onChange={event => { setSearchText(event.target.value); searchVersion.current++; setResults([]); setSearchState("Press Enter to search."); }} placeholder="Search by meaning…" aria-label="Search posts by meaning"/><button type="submit" className={styles.saveButton}>Search</button></form>
          <div className={styles.dateFilter}><label>From <input type="date" value={dateFrom} onChange={event => { searchVersion.current++; setDateFrom(event.target.value); }}/></label><label>To <input type="date" value={dateTo} onChange={event => { searchVersion.current++; setDateTo(event.target.value); }}/></label><button type="button" onClick={() => { searchVersion.current++; setDateFrom(""); setDateTo(""); }}>Clear dates</button></div>
          <p className={styles.dialogStatus} role="status">{searchState}</p>
          <div className={styles.searchResults}>{results.map(post => <button type="button" className={styles.searchResult} key={post.id} onClick={() => { setSearchOpen(false); requestAnimationFrame(() => { const card = document.querySelector<HTMLElement>(`[data-post-id="${post.id}"]`); card?.scrollIntoView({ block: "center" }); card?.focus(); }); }}><span>{dateLabel(post.createdAt)} · {post.score.toFixed(3)}</span><div>{post.text}</div></button>)}</div>
        </section>
      </div>}

      {trashOpen && <div className={styles.overlay} onMouseDown={event => { if (event.target === event.currentTarget) setTrashOpen(false); }}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="trash-title"><div className={styles.dialogHeading}><div><h2 id="trash-title">Trash</h2><p>Restore a post or delete it forever.</p></div><button type="button" onClick={() => setTrashOpen(false)}>Esc</button></div><div className={styles.trashList}>{trash.length === 0 && <p className={styles.empty}>Trash is empty.</p>}{trash.map(post => <article className={styles.trashPost} key={post.id}><span className={styles.postMeta}>{post.deletedAt ? `Deleted ${dateLabel(post.deletedAt)}` : dateLabel(post.createdAt)}</span><pre className={styles.postText}>{post.text}</pre><div className={styles.postActions}><button type="button" onClick={async () => { try { await restorePost(post.id); await refresh(); } catch (error) { setStatus(`Could not restore: ${(error as Error).message}`); } }}>Restore</button><button type="button" onClick={async () => { if (!window.confirm("Delete this post forever? This cannot be undone.")) return; try { await deleteForever(post.id); await refresh(); } catch (error) { setStatus(`Could not delete post: ${(error as Error).message}`); } }}>Delete forever</button></div></article>)}</div><div className={styles.editorActions}><button type="button" disabled={!trash.length} onClick={async () => { if (!window.confirm("Permanently delete every post in Trash? This cannot be undone.")) return; try { await emptyTrash(); await refresh(); } catch (error) { setStatus(`Could not empty Trash: ${(error as Error).message}`); } }}>Empty Trash</button></div></section></div>}

      {(editorPost || tagPost) && <div className={styles.overlay}><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="edit-title"><div className={styles.dialogHeading}><h2 id="edit-title">{editorPost ? "Edit post" : "Add a tag"}</h2><button type="button" onClick={() => { if (!busy) { setEditorPost(null); setTagPost(null); } }}>✕</button></div>{editorPost ? <form onSubmit={saveEdit}><label className={styles.label} htmlFor="edit-text">Post text</label><textarea id="edit-text" className={styles.editorText} value={editText} onChange={event => setEditText(event.target.value)} required/><p className={styles.dialogStatus} role="status">{dialogError}</p><div className={styles.editorActions}><button type="button" onClick={() => setEditorPost(null)} disabled={busy}>Cancel</button><button className={styles.saveButton} type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div></form> : <form onSubmit={saveTag}><label className={styles.label} htmlFor="edit-tag">Tag name</label><input id="edit-tag" value={tagText} onChange={event => setTagText(event.target.value)} maxLength={100} required/><p className={styles.dialogStatus} role="status">{dialogError}</p><div className={styles.editorActions}><button type="button" onClick={() => setTagPost(null)} disabled={busy}>Cancel</button><button className={styles.saveButton} type="submit" disabled={busy}>{busy ? "Saving…" : "Add tag"}</button></div></form>}</section></div>}
    </div>
  );
}
