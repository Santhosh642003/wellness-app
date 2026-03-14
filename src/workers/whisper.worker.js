import { pipeline, env } from "@xenova/transformers";

// Use browser cache so the model is only downloaded once
env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber = null;

// Tiny English-only model (~150 MB, fastest inference)
const MODEL = "Xenova/whisper-tiny.en";

self.onmessage = async ({ data }) => {
  const { type } = data;

  if (type === "load") {
    try {
      self.postMessage({ type: "status", message: "Downloading AI model (first time only)…" });
      transcriber = await pipeline(
        "automatic-speech-recognition",
        MODEL,
        {
          progress_callback: (p) => {
            if (p.status === "downloading") {
              const pct = p.total ? Math.round((p.loaded / p.total) * 100) : 0;
              self.postMessage({ type: "status", message: `Downloading model: ${pct}%` });
            }
          },
        }
      );
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message });
    }
    return;
  }

  if (type === "transcribe") {
    if (!transcriber) {
      self.postMessage({ type: "error", message: "Model not loaded" });
      return;
    }
    try {
      // data.audio is a Float32Array at 16 kHz (mono)
      const result = await transcriber(data.audio, {
        sampling_rate: 16000,
        return_timestamps: false,
      });
      const text = (result?.text || "").trim();
      if (text) self.postMessage({ type: "result", text });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message });
    }
  }
};
