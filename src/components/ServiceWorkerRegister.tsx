"use client";

import { useEffect } from "react";

/**
 * Yalnızca üretimde service worker'ı kaydeder. Geliştirme sunucusunda kayıt yapılmaz;
 * aksi halde HMR çıktıları önbelleğe alınır ve eski kod görünmeye devam eder.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.warn("Service worker kaydedilemedi:", err));
  }, []);

  return null;
}
