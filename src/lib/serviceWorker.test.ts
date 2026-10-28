import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";

const ORIGIN = "https://okurlab.test";
const SW_SOURCE = readFileSync(
  fileURLToPath(new URL("../../public/sw.js", import.meta.url)),
  "utf8"
);

interface FakeResponse {
  url: string;
  ok: boolean;
  type: string;
  clone(): FakeResponse;
}
const response = (url: string, ok = true, type = "basic"): FakeResponse => ({
  url,
  ok,
  type,
  clone() {
    return this;
  },
});

interface FakeRequest {
  url: string;
  method: string;
  mode: string;
}
const req = (path: string, init: Partial<FakeRequest> = {}): FakeRequest => ({
  url: path.startsWith("http") ? path : ORIGIN + path,
  method: "GET",
  mode: "cors",
  ...init,
});

type Handler = (event: Record<string, unknown>) => void;

/** Bellek içi CacheStorage taklidi (url anahtarlı). */
function makeCaches() {
  const stores = new Map<string, Map<string, FakeResponse>>();
  const failAdd = new Set<string>();
  const flags = { failPut: false, failMatch: false };
  const api = {
    stores,
    failAdd,
    flags,
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        async add(url: string) {
          if (failAdd.has(url)) throw new Error("ağ yok");
          store.set(ORIGIN + url, response(ORIGIN + url));
        },
        async put(request: FakeRequest, res: FakeResponse) {
          if (flags.failPut) throw new DOMException("kota dolu", "QuotaExceededError");
          store.set(request.url, res);
        },
      };
    },
    async keys() {
      return Array.from(stores.keys());
    },
    async delete(name: string) {
      return stores.delete(name);
    },
    async match(request: FakeRequest | string) {
      if (flags.failMatch) throw new Error("depolama erişilemiyor");
      const url = typeof request === "string" ? ORIGIN + request : request.url;
      for (const store of Array.from(stores.values())) {
        if (store.has(url)) return store.get(url);
      }
      return undefined;
    },
  };
  return api;
}

function loadSw() {
  const handlers: Record<string, Handler> = {};
  const caches = makeCaches();
  const state = { skipWaiting: 0, claimed: 0, fetchImpl: async (r: FakeRequest) => response(r.url) };
  const sandbox: Record<string, unknown> = {
    URL,
    Promise,
    Error,
    console,
    caches,
    fetch: (r: FakeRequest) => state.fetchImpl(r),
  };
  sandbox.self = {
    ...sandbox,
    location: { origin: ORIGIN },
    addEventListener: (type: string, fn: Handler) => {
      handlers[type] = fn;
    },
    skipWaiting: async () => {
      state.skipWaiting++;
    },
    clients: {
      claim: async () => {
        state.claimed++;
      },
    },
  };
  runInNewContext(SW_SOURCE, { ...sandbox, ...(sandbox.self as object) });
  return { handlers, caches, state };
}

/** vm bağlamında tanımlanan self.__okurlabSw'ye erişmek için ayrı yükleme. */
function loadClassify() {
  const selfObj: Record<string, unknown> = {
    location: { origin: ORIGIN },
    addEventListener: () => {},
  };
  runInNewContext(SW_SOURCE, { self: selfObj, URL, Promise, Error, caches: {}, fetch: () => {} });
  return (selfObj as { __okurlabSw: unknown }).__okurlabSw as {
    classify: (r: FakeRequest, o: string) => string;
    CURRENT_CACHES: string[];
  };
}

describe("classify", () => {
  const { classify } = loadClassify();
  const c = (r: FakeRequest) => classify(r, ORIGIN);

  it("sayfa gezinmelerini ve RSC isteklerini 'page' sayar", () => {
    expect(c(req("/", { mode: "navigate" }))).toBe("page");
    expect(c(req("/library?book=x"))).toBe("page");
    expect(c(req("/community?_rsc=abc"))).toBe("page");
  });

  it("hash'li Next çıktısını 'static' sayar", () => {
    expect(c(req("/_next/static/chunks/main-abc.js"))).toBe("static");
    expect(c(req("/_next/static/media/font.woff2"))).toBe("static");
  });

  it("Piper ve pdf.js varlıklarını 'asset' sayar", () => {
    expect(c(req("/piper/piper-worker.mjs"))).toBe("asset");
    expect(c(req("/pdf.worker.min.mjs"))).toBe("asset");
    expect(c(req("/okurlab-logo.svg"))).toBe("asset");
    expect(c(req("/manifest.webmanifest"))).toBe("asset");
  });

  it("jsDelivr WASM çalışma zamanını 'cdn' sayar", () => {
    expect(c(req("https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.wasm"))).toBe("cdn");
  });

  it("API, Supabase, model indirmeleri, POST ve sw.js'e dokunmaz", () => {
    expect(c(req("/api/generate-questions"))).toBe("bypass");
    expect(c(req("/sw.js"))).toBe("bypass");
    expect(c(req("/_next/image?url=x"))).toBe("bypass");
    expect(c(req("https://abc.supabase.co/rest/v1/reviews"))).toBe("bypass");
    expect(c(req("https://huggingface.co/x/model.onnx"))).toBe("bypass");
    expect(c(req("/library", { method: "POST" }))).toBe("bypass");
  });
});

describe("yaşam döngüsü", () => {
  let sw: ReturnType<typeof loadSw>;
  beforeEach(() => {
    sw = loadSw();
  });

  const run = async (type: string, extra: Record<string, unknown> = {}) => {
    const waits: Promise<unknown>[] = [];
    const event = { waitUntil: (p: Promise<unknown>) => waits.push(p), ...extra };
    sw.handlers[type](event);
    await Promise.all(waits);
    return event;
  };

  it("kurulumda sayfa ve varlıkları önbelleğe alır, biri başarısız olsa da tamamlanır", async () => {
    sw.caches.failAdd.add("/community");
    await run("install");
    const pages = sw.caches.stores.get("okurlab-pages-v1")!;
    expect(pages.has(ORIGIN + "/library")).toBe(true);
    expect(pages.has(ORIGIN + "/offline")).toBe(true);
    expect(pages.has(ORIGIN + "/community")).toBe(false);
    expect(sw.caches.stores.get("okurlab-assets-v1")!.has(ORIGIN + "/piper/piper-worker.mjs")).toBe(true);
    expect(sw.state.skipWaiting).toBe(1);
  });

  it("etkinleşmede eski sürüm önbelleklerini siler, Piper model önbelleğine dokunmaz", async () => {
    await sw.caches.open("okurlab-pages-v0");
    await sw.caches.open("okurlab-pages-v1");
    await sw.caches.open("ocula-piper-models-v1");
    await sw.caches.open("baska-uygulama");
    await run("activate");
    const names = Array.from(sw.caches.stores.keys()).sort();
    expect(names).toEqual(["baska-uygulama", "ocula-piper-models-v1", "okurlab-pages-v1"]);
    expect(sw.state.claimed).toBe(1);
  });
});

describe("fetch", () => {
  let sw: ReturnType<typeof loadSw>;
  beforeEach(() => {
    sw = loadSw();
  });

  const dispatch = async (request: FakeRequest) => {
    let responded: Promise<FakeResponse> | undefined;
    const waits: Promise<unknown>[] = [];
    sw.handlers.fetch({
      request,
      respondWith: (p: Promise<FakeResponse>) => {
        responded = p;
      },
      waitUntil: (p: Promise<unknown>) => waits.push(p),
    });
    const res = responded ? await responded.catch((e: Error) => e) : undefined;
    await Promise.all(waits);
    return res;
  };

  it("bypass isteklerine yanıt vermez", async () => {
    expect(await dispatch(req("/api/x"))).toBeUndefined();
  });

  it("sayfa: ağdan alır ve önbelleğe yazar", async () => {
    const res = (await dispatch(req("/library", { mode: "navigate" }))) as FakeResponse;
    expect(res.url).toBe(ORIGIN + "/library");
    expect(sw.caches.stores.get("okurlab-pages-v1")!.has(ORIGIN + "/library")).toBe(true);
  });

  it("sayfa: çevrimdışıyken önbellekteki kopyayı döner", async () => {
    await dispatch(req("/library", { mode: "navigate" }));
    sw.state.fetchImpl = async () => {
      throw new TypeError("Failed to fetch");
    };
    const res = (await dispatch(req("/library", { mode: "navigate" }))) as FakeResponse;
    expect(res.url).toBe(ORIGIN + "/library");
  });

  it("sayfa: hiç açılmamışsa /offline sayfasına düşer", async () => {
    await run(sw, "install");
    sw.state.fetchImpl = async () => {
      throw new TypeError("Failed to fetch");
    };
    const res = (await dispatch(req("/yeni-sayfa", { mode: "navigate" }))) as FakeResponse;
    expect(res.url).toBe(ORIGIN + "/offline");
  });

  it("sayfa: gezinme dışı istek önbellekte yoksa hatayı iletir", async () => {
    sw.state.fetchImpl = async () => {
      throw new TypeError("Failed to fetch");
    };
    const res = await dispatch(req("/community?_rsc=zzz"));
    expect(res).toBeInstanceOf(Error);
  });

  it("önbellek yazımı başarısız olsa bile ağdan gelen sayfa teslim edilir (kota, gizli sekme)", async () => {
    sw.caches.flags.failPut = true;
    const res = (await dispatch(req("/library", { mode: "navigate" }))) as FakeResponse;
    expect(res).not.toBeInstanceOf(Error);
    expect(res.url).toBe(ORIGIN + "/library");
  });

  it("önbellek yazımı başarısız olsa bile statik dosya ve CDN yanıtı teslim edilir", async () => {
    sw.caches.flags.failPut = true;
    const chunk = (await dispatch(req("/_next/static/chunks/a.js"))) as FakeResponse;
    expect(chunk.url).toBe(ORIGIN + "/_next/static/chunks/a.js");
    const wasm = (await dispatch(req("https://cdn.jsdelivr.net/npm/x/ort.wasm"))) as FakeResponse;
    expect(wasm.url).toBe("https://cdn.jsdelivr.net/npm/x/ort.wasm");
  });

  it("önbellek yazımı başarısızsa 'eski göster, yenile' ilk istekte de yanıt verir", async () => {
    sw.caches.flags.failPut = true;
    const res = (await dispatch(req("/piper/piper-worker.mjs"))) as FakeResponse;
    expect(res.url).toBe(ORIGIN + "/piper/piper-worker.mjs");
  });

  it("önbellek okunamıyorsa ağdan devam eder", async () => {
    sw.caches.flags.failMatch = true;
    const res = (await dispatch(req("/_next/static/chunks/b.js"))) as FakeResponse;
    expect(res.url).toBe(ORIGIN + "/_next/static/chunks/b.js");
  });

  it("ağ yokken ve önbellek okunamıyorsa sayfa isteği hata ile biter (çökme yok)", async () => {
    sw.caches.flags.failMatch = true;
    sw.state.fetchImpl = async () => {
      throw new TypeError("Failed to fetch");
    };
    const res = await dispatch(req("/library", { mode: "navigate" }));
    expect(res).toBeInstanceOf(Error);
  });

  it("hatalı (ok olmayan) yanıtlar önbelleğe alınmaz", async () => {
    sw.state.fetchImpl = async (r) => response(r.url, false);
    await dispatch(req("/library", { mode: "navigate" }));
    expect(sw.caches.stores.get("okurlab-pages-v1")?.has(ORIGIN + "/library") ?? false).toBe(false);
  });

  it("static: ikinci istekte ağa gitmez", async () => {
    let calls = 0;
    sw.state.fetchImpl = async (r) => {
      calls++;
      return response(r.url);
    };
    await dispatch(req("/_next/static/chunks/a.js"));
    await dispatch(req("/_next/static/chunks/a.js"));
    expect(calls).toBe(1);
  });

  it("asset: önbellekteki kopyayı hemen döner ve arkada yeniler", async () => {
    let calls = 0;
    sw.state.fetchImpl = async (r) => {
      calls++;
      return response(r.url);
    };
    await dispatch(req("/piper/piper-worker.mjs"));
    await dispatch(req("/piper/piper-worker.mjs"));
    expect(calls).toBe(2);
  });

  it("cdn: WASM bir kez indirilir, sonra çevrimdışı sunulur", async () => {
    const url = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.wasm";
    await dispatch(req(url));
    sw.state.fetchImpl = async () => {
      throw new TypeError("Failed to fetch");
    };
    const res = (await dispatch(req(url))) as FakeResponse;
    expect(res.url).toBe(url);
  });
});

async function run(sw: ReturnType<typeof loadSw>, type: string) {
  const waits: Promise<unknown>[] = [];
  sw.handlers[type]({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
  await Promise.all(waits);
}
