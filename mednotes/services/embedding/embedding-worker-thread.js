/**
 * Reasoning: worker_threads needs a separate entry file that listens for
 * messages. This file only exists so embedding-worker.js can spawn it.
 */
const { parentPort } = require("worker_threads");
const { embedText } = require("./embed-text");

parentPort.on("message", async function onMessage(message) {
  try {
    const vector = await embedText(message.text);
    parentPort.postMessage({
      id: message.id,
      vector: Array.from(vector),
    });
  } catch (err) {
    parentPort.postMessage({
      id: message.id,
      error: err && err.message ? err.message : String(err),
    });
  }
});
