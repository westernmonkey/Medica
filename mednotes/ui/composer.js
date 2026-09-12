// Visual styling uses ../DESIGN.md tokens in styles.css.
/**
 * Reasoning: One always-visible composer keeps capture friction low. Mic, camera,
 * paste, and drag all attach the same way so the save path stays single.
 */
function createComposer(options) {
  const root = options.root;
  const onSave = options.onSave;

  let imageBuffer = null;
  let voiceBuffer = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecording = false;

  root.innerHTML = "";

  const form = document.createElement("form");
  form.id = "composer-form";
  form.setAttribute("autocomplete", "off");

  const textArea = document.createElement("textarea");
  textArea.id = "composer-text";
  textArea.rows = 3;
  textArea.placeholder = "Type a note…";
  textArea.setAttribute("aria-label", "Note text");

  const toolbar = document.createElement("div");
  toolbar.className = "composer-toolbar";

  const micIcon = '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
  const stopIcon = '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
  const micBtn = document.createElement("button");
  micBtn.type = "button";
  micBtn.id = "mic-btn";
  micBtn.className = "icon-button";
  micBtn.innerHTML = micIcon;
  micBtn.setAttribute("aria-label", "Record voice note");

  const recordDot = document.createElement("span");
  recordDot.id = "record-dot";
  recordDot.className = "record-dot hidden";
  recordDot.textContent = "Recording";

  const cameraBtn = document.createElement("button");
  cameraBtn.type = "button";
  cameraBtn.id = "camera-btn";
  cameraBtn.className = "icon-button";
  cameraBtn.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h4l2-3h6l2 3h4v15H3z"/><circle cx="12" cy="13" r="4"/></svg>';
  cameraBtn.setAttribute("aria-label", "Attach photo");

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.id = "image-file-input";
  fileInput.className = "hidden";

  const attachStatus = document.createElement("span");
  attachStatus.id = "attach-status";
  attachStatus.className = "attach-status";
  attachStatus.setAttribute("role", "status");

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.id = "save-btn";
  saveBtn.textContent = "Save";

  const field = document.createElement("div");
  field.className = "capture-field";
  const captureActions = document.createElement("div");
  captureActions.className = "capture-actions";
  captureActions.append(micBtn, cameraBtn);
  field.append(textArea, captureActions);
  toolbar.appendChild(recordDot);

  toolbar.appendChild(fileInput);
  toolbar.appendChild(attachStatus);
  toolbar.appendChild(saveBtn);

  form.appendChild(field);
  form.appendChild(toolbar);
  root.appendChild(form);

  function updateAttachStatus() {
    const parts = [];
    if (imageBuffer) {
      parts.push("photo");
    }
    if (voiceBuffer) {
      parts.push("voice");
    }
    attachStatus.textContent = parts.length ? "Attached: " + parts.join(", ") : "";
  }

  function clearComposer() {
    textArea.value = "";
    imageBuffer = null;
    voiceBuffer = null;
    recordedChunks = [];
    updateAttachStatus();
    textArea.focus({ preventScroll: true });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function fileReadPromise(resolve, reject) {
      const reader = new FileReader();
      reader.onload = function onLoad() {
        resolve(reader.result);
      };
      reader.onerror = function onError() {
        reject(reader.error || new Error("Failed to read file"));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async function attachImageFile(file) {
    if (!file) {
      return;
    }
    imageBuffer = await readFileAsArrayBuffer(file);
    updateAttachStatus();
  }

  async function toggleMic() {
    if (isRecording) {
      mediaRecorder.stop();
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    const options = {};
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      options.mimeType = "audio/webm;codecs=opus";
    } else if (MediaRecorder.isTypeSupported("audio/webm")) {
      options.mimeType = "audio/webm";
    }
    mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorder.ondataavailable = function onDataAvailable(event) {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    mediaRecorder.onstop = async function onStop() {
      isRecording = false;
      recordDot.classList.add("hidden");
      micBtn.innerHTML = micIcon;
      micBtn.setAttribute("aria-label", "Record voice note");
      stream.getTracks().forEach(function stopTrack(track) {
        track.stop();
      });
      const blob = new Blob(recordedChunks, {
        type: options.mimeType || "audio/webm",
      });
      voiceBuffer = await blob.arrayBuffer();
      updateAttachStatus();
    };
    mediaRecorder.start(200);
    isRecording = true;
    recordDot.classList.remove("hidden");
    micBtn.innerHTML = stopIcon;
    micBtn.setAttribute("aria-label", "Stop recording");
  }

  async function submitComposer(event) {
    if (event) {
      event.preventDefault();
    }
    if (saveBtn.disabled || isRecording) return;
    const text = textArea.value.trim();
    if (!text && !imageBuffer && !voiceBuffer) {
      return;
    }
    const payload = {
      text: text || "(attachment only)",
      imageBuffer: imageBuffer,
      voiceBuffer: voiceBuffer,
    };
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      await onSave(payload);
      clearComposer();
      attachStatus.textContent = "Saved to your notes";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  }

  micBtn.addEventListener("click", function onMicClick() {
    toggleMic().catch(function onMicError(err) {
      console.error(err);
      alert("Microphone failed: " + err.message);
    });
  });

  cameraBtn.addEventListener("click", function onCameraClick() {
    fileInput.click();
  });

  fileInput.addEventListener("change", function onFileChange() {
    const file = fileInput.files && fileInput.files[0];
    attachImageFile(file).catch(function onAttachError(err) {
      console.error(err);
    });
    fileInput.value = "";
  });

  textArea.addEventListener("input", updateAttachStatus);

  textArea.addEventListener("paste", function onPaste(event) {
    const items = event.clipboardData && event.clipboardData.items;
    if (!items) {
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") === 0) {
        event.preventDefault();
        const file = items[i].getAsFile();
        attachImageFile(file);
        break;
      }
    }
  });

  form.addEventListener("dragover", function onDragOver(event) {
    event.preventDefault();
  });

  form.addEventListener("drop", function onDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file && file.type.indexOf("image") === 0) {
      attachImageFile(file);
    }
  });

  form.addEventListener("submit", function onSubmit(event) {
    submitComposer(event).catch(function onSaveError(err) {
      console.error(err);
      alert("Save failed: " + err.message);
    });
  });

  textArea.addEventListener("keydown", function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitComposer(null).catch(function onSaveError(err) {
        console.error(err);
      });
    }
  });

  clearComposer();

  return {
    focus: function focusComposer() {
      textArea.focus({ preventScroll: true });
    },
    clear: clearComposer,
  };
}
