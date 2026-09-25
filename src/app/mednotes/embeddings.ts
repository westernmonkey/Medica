let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (vector: Float32Array) => void; reject: (error: Error) => void }>();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./embedding.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<{ id: number; vector?: number[]; error?: string }>) => {
    const request = pending.get(event.data.id);
    if (!request || (!event.data.vector && !event.data.error)) return;
    pending.delete(event.data.id);
    if (event.data.error) request.reject(new Error(event.data.error));
    else if (event.data.vector) request.resolve(new Float32Array(event.data.vector));
  };
  worker.onerror = () => {
    for (const request of pending.values()) request.reject(new Error("The local search model stopped unexpectedly."));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

export function embedText(text: string) {
  return new Promise<Float32Array>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, text });
  });
}
