import { env, pipeline } from "@huggingface/transformers";

type Request = { id: number; text: string };
type Response = { id: number; vector?: number[]; error?: string; status?: string };

const worker = self as unknown as { location: Location; postMessage: (message: Response) => void; onmessage: ((event: MessageEvent<Request>) => void) | null };
let extractor: any = null;
let loading: Promise<any> | null = null;

async function getExtractor() {
  if (extractor) return extractor;
  if (!loading) {
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.remoteHost = `${worker.location.origin}/mednotes-models/`;
    env.remotePathTemplate = "{model}/";
    (env.backends.onnx.wasm as any).wasmPaths = `${worker.location.origin}/mednotes-runtime/`;
    loading = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
  }
  extractor = await loading;
  return extractor;
}

worker.onmessage = async (event: MessageEvent<Request>) => {
  const { id, text } = event.data;
  try {
    worker.postMessage({ id, status: "loading" } satisfies Response);
    const model = await getExtractor();
    const output = await model(text, { pooling: "mean", normalize: true }) as { data: Float32Array };
    worker.postMessage({ id, vector: Array.from(output.data) } satisfies Response);
  } catch (error) {
    loading = null;
    extractor = null;
    worker.postMessage({ id, error: error instanceof Error ? error.message : "Embedding model failed to load." } satisfies Response);
  }
};
