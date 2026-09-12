/**
 * Reasoning: Embedding can take hundreds of ms. Running it on a Node
 * worker_threads worker keeps the Electron main process free to handle IPC and
 * window events. The renderer never loads the model.
 */
const { Worker } = require("worker_threads");
const path = require("path");

let worker = null;
let nextRequestId = 1;
const pending = new Map();

function ensureWorker() {
  if (worker) {
    return worker;
  }
  worker = new Worker(path.join(__dirname, "embedding-worker-thread.js"));
  worker.on("message", function onWorkerMessage(message) {
    const entry = pending.get(message.id);
    if (!entry) {
      return;
    }
    pending.delete(message.id);
    if (message.error) {
      entry.reject(new Error(message.error));
      return;
    }
    entry.resolve(new Float32Array(message.vector));
  });
  worker.on("error", function onWorkerError(err) {
    pending.forEach(function rejectAll(entry) {
      entry.reject(err);
    });
    pending.clear();
    worker = null;
  });
  return worker;
}

function embedTextAsync(text) {
  return new Promise(function embedPromise(resolve, reject) {
    const id = nextRequestId;
    nextRequestId += 1;
    pending.set(id, { resolve: resolve, reject: reject });
    ensureWorker().postMessage({ id: id, text: text });
  });
}

async function shutdownEmbeddingWorker() {
  if (!worker) {
    return;
  }
  await worker.terminate();
  worker = null;
  pending.clear();
}

module.exports = {
  embedTextAsync: embedTextAsync,
  shutdownEmbeddingWorker: shutdownEmbeddingWorker,
};
