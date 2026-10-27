/**
 * Ocula VISION — Piper Neural TTS Web Worker (WebAssembly + ONNX Runtime Web)
 * Runs phonemization (espeak-ng WASM) and neural VITS ONNX inference off the main thread
 * so Pacer / RSVP animations remain at a locked 60 FPS.
 */

const HF_BASE =
  "https://huggingface.co/diffusionstudio/piper-voices/resolve/main";
const ONNX_WASM_CDN =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
const PIPER_WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize";

const VOICE_PATH_MAP = {
  "tr_TR-dfki-medium": "tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx",
  "tr_TR-fahrettin-medium":
    "tr/tr_TR/fahrettin/medium/tr_TR-fahrettin-medium.onnx",
  "tr_TR-fettah-medium": "tr/tr_TR/fettah/medium/tr_TR-fettah-medium.onnx",
  "en_US-lessac-medium": "en/en_US/lessac/medium/en_US-lessac-medium.onnx",
};

let createPiperPhonemizeFn = null;
let ortModule = null;
let activeVoiceId = null;
let activeModelConfig = null;
let activeOrtSession = null;
let initPromise = null;

// ============================================================================
// OPFS + CacheStorage Persistent Storage Helpers
// ============================================================================
async function readCachedBlob(url) {
  const fileName = url.split("/").at(-1);
  // 1. Try OPFS (Origin Private File System)
  try {
    if (self.navigator?.storage?.getDirectory) {
      const root = await self.navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle("piper", { create: true });
      const fileHandle = await dir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      if (file && file.size > 0) {
        return file;
      }
    }
  } catch {
    // Not in OPFS yet
  }

  // 2. Try CacheStorage fallback
  try {
    if (typeof caches !== "undefined") {
      const cache = await caches.open("ocula-piper-models-v1");
      const matched = await cache.match(url);
      if (matched) {
        const blob = await matched.blob();
        if (blob && blob.size > 0) return blob;
      }
    }
  } catch {
    // Ignore cache error
  }

  return null;
}

async function writeCachedBlob(url, blob) {
  const fileName = url.split("/").at(-1);
  // 1. Save to OPFS
  try {
    if (self.navigator?.storage?.getDirectory) {
      const root = await self.navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle("piper", { create: true });
      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    }
  } catch {
    // Fallback to CacheStorage
  }

  // 2. Save to CacheStorage
  try {
    if (typeof caches !== "undefined") {
      const cache = await caches.open("ocula-piper-models-v1");
      await cache.put(
        url,
        new Response(blob, {
          headers: { "Content-Type": blob.type || "application/octet-stream" },
        })
      );
    }
  } catch {
    // Ignore
  }
}

async function fetchWithProgress(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Model indirilemedi (${res.status}): ${url}`);
  }
  const reader = res.body?.getReader();
  const contentLength = Number(res.headers.get("Content-Length") || 0);
  let receivedLength = 0;
  const chunks = [];

  if (!reader) {
    const blob = await res.blob();
    onProgress?.({
      loaded: blob.size,
      total: blob.size,
      percent: 100,
    });
    return blob;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedLength += value.length;
    const total = contentLength > 0 ? contentLength : 63_000_000;
    const percent = Math.min(99, Math.round((receivedLength / total) * 100));
    onProgress?.({
      loaded: receivedLength,
      total,
      percent,
    });
  }

  onProgress?.({
    loaded: receivedLength,
    total: receivedLength,
    percent: 100,
  });

  return new Blob(chunks, {
    type: res.headers.get("Content-Type") || "application/octet-stream",
  });
}

async function getOrDownloadModelBlob(url, onProgress) {
  const cached = await readCachedBlob(url);
  if (cached) {
    return { blob: cached, fromCache: true };
  }
  const downloaded = await fetchWithProgress(url, onProgress);
  await writeCachedBlob(url, downloaded);
  return { blob: downloaded, fromCache: false };
}

// ============================================================================
// Float32 PCM to 16-bit WAV ArrayBuffer Converter
// ============================================================================
function pcm2wavBuffer(pcmFloat32, numChannels, sampleRate) {
  const bufferLength = pcmFloat32.length;
  const headerLength = 44;
  const view = new DataView(
    new ArrayBuffer(bufferLength * numChannels * 2 + headerLength)
  );

  // "RIFF"
  view.setUint32(0, 1179011410, true);
  view.setUint32(4, view.buffer.byteLength - 8, true);
  // "WAVE"
  view.setUint32(8, 1163280727, true);
  // "fmt "
  view.setUint32(12, 544501094, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, numChannels * 2 * sampleRate, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  // "data"
  view.setUint32(36, 1635017060, true);
  view.setUint32(40, 2 * bufferLength, true);

  let p = headerLength;
  for (let i = 0; i < bufferLength; i++) {
    const v = pcmFloat32[i];
    if (v >= 1) view.setInt16(p, 32767, true);
    else if (v <= -1) view.setInt16(p, -32768, true);
    else view.setInt16(p, (v * 32768) | 0, true);
    p += 2;
  }

  return view.buffer;
}

// ============================================================================
// Initialize Voice Session inside Worker
// ============================================================================
async function ensureVoiceSession(voiceId, requestId) {
  if (activeOrtSession && activeVoiceId === voiceId && activeModelConfig) {
    return;
  }

  if (initPromise && activeVoiceId === voiceId) {
    await initPromise;
    return;
  }

  activeVoiceId = voiceId;
  initPromise = (async () => {
    if (!createPiperPhonemizeFn) {
      const phonemizeMod = await import("/piper/piper-phonemize.mjs");
      createPiperPhonemizeFn = phonemizeMod.createPiperPhonemize;
    }

    if (!ortModule) {
      const importedOrt = await import("/piper/ort.wasm.min.mjs");
      ortModule = importedOrt.default || importedOrt;
      if (ortModule.env) {
        ortModule.env.allowLocalModels = false;
        if (ortModule.env.wasm) {
          // Single-threaded inside Worker avoids SharedArrayBuffer requirement on non-isolated origins
          ortModule.env.wasm.numThreads = self.crossOriginIsolated
            ? Math.min(4, self.navigator?.hardwareConcurrency || 1)
            : 1;
          ortModule.env.wasm.wasmPaths = ONNX_WASM_CDN;
        }
      }
    }

    const relativePath =
      VOICE_PATH_MAP[voiceId] || VOICE_PATH_MAP["tr_TR-dfki-medium"];
    const configUrl = `${HF_BASE}/${relativePath}.json`;
    const modelUrl = `${HF_BASE}/${relativePath}`;

    const { blob: configBlob } = await getOrDownloadModelBlob(configUrl);
    activeModelConfig = JSON.parse(await configBlob.text());

    const { blob: modelBlob, fromCache } = await getOrDownloadModelBlob(
      modelUrl,
      (prog) => {
        self.postMessage({
          type: "DOWNLOAD_PROGRESS",
          voiceId,
          requestId,
          loaded: prog.loaded,
          total: prog.total,
          percent: prog.percent,
        });
      }
    );

    if (fromCache) {
      self.postMessage({
        type: "MODEL_CACHED_READY",
        voiceId,
        requestId,
      });
    }

    const modelBuffer = await modelBlob.arrayBuffer();
    activeOrtSession = await ortModule.InferenceSession.create(modelBuffer, {
      executionProviders: ["wasm"],
    });

    self.postMessage({
      type: "MODEL_READY",
      voiceId,
      requestId,
    });
  })();

  try {
    await initPromise;
  } catch (err) {
    initPromise = null;
    activeOrtSession = null;
    throw err;
  }
}

// ============================================================================
// Synthesize Single Sentence to WAV ArrayBuffer
// ============================================================================
async function synthesizeSentence(text, voiceId, requestId) {
  await ensureVoiceSession(voiceId, requestId);

  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error("Boş metin sentezlenemez.");
  }

  const inputJson = JSON.stringify([{ text: cleanText }]);
  const espeakVoice = activeModelConfig?.espeak?.voice || "tr";

  const phonemeIds = await new Promise(async (resolve, reject) => {
    try {
      const module = await createPiperPhonemizeFn({
        print: (data) => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.phoneme_ids);
          } catch (e) {
            reject(e);
          }
        },
        printErr: (message) => {
          reject(new Error(String(message)));
        },
        locateFile: (url) => {
          if (url.endsWith(".wasm")) return `${PIPER_WASM_BASE}.wasm`;
          if (url.endsWith(".data")) return `${PIPER_WASM_BASE}.data`;
          return url;
        },
      });

      module.callMain([
        "-l",
        espeakVoice,
        "--input",
        inputJson,
        "--espeak_data",
        "/espeak-ng-data",
      ]);
    } catch (err) {
      reject(err);
    }
  });

  const noiseScale = activeModelConfig.inference.noise_scale;
  const lengthScale = activeModelConfig.inference.length_scale;
  const noiseW = activeModelConfig.inference.noise_w;

  const bigIntPhonemes = BigInt64Array.from(
    phonemeIds.map((id) => BigInt(id))
  );
  const feeds = {
    input: new ortModule.Tensor("int64", bigIntPhonemes, [
      1,
      bigIntPhonemes.length,
    ]),
    input_lengths: new ortModule.Tensor(
      "int64",
      BigInt64Array.from([BigInt(bigIntPhonemes.length)])
    ),
    scales: new ortModule.Tensor(
      "float32",
      new Float32Array([noiseScale, lengthScale, noiseW])
    ),
  };

  if (
    activeModelConfig.speaker_id_map &&
    Object.keys(activeModelConfig.speaker_id_map).length > 0
  ) {
    feeds.sid = new ortModule.Tensor("int64", BigInt64Array.from([0n]));
  }

  const results = await activeOrtSession.run(feeds);
  const pcmData = results.output.data;
  const sampleRate = activeModelConfig.audio.sample_rate || 22050;
  const wavArrayBuffer = pcm2wavBuffer(pcmData, 1, sampleRate);
  const durationSeconds = pcmData.length / sampleRate;

  return { wavArrayBuffer, durationSeconds, sampleRate };
}

// Serialize synthesis calls inside worker so two concurrent prefetches don't collide in Emscripten FS
let workerQueue = Promise.resolve();

self.onmessage = (event) => {
  const { type, requestId, text, voiceId } = event.data || {};

  if (type === "INIT_MODEL") {
    workerQueue = workerQueue
      .then(() => ensureVoiceSession(voiceId, requestId))
      .catch((err) => {
        self.postMessage({
          type: "ERROR",
          requestId,
          message: err instanceof Error ? err.message : String(err),
        });
      });
    return;
  }

  if (type === "SYNTHESIZE") {
    workerQueue = workerQueue
      .then(async () => {
        const { wavArrayBuffer, durationSeconds, sampleRate } =
          await synthesizeSentence(text, voiceId, requestId);
        self.postMessage(
          {
            type: "SYNTHESIS_RESULT",
            requestId,
            wavArrayBuffer,
            durationSeconds,
            sampleRate,
          },
          [wavArrayBuffer]
        );
      })
      .catch((err) => {
        self.postMessage({
          type: "ERROR",
          requestId,
          message: err instanceof Error ? err.message : String(err),
        });
      });
  }
};
