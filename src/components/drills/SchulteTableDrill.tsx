"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  RotateCcw,
  Timer,
  Target,
  Trophy,
  Shuffle,
  Eye,
  Grid,
  CheckCircle2,
} from "lucide-react";

interface SchulteTableDrillProps {
  onFinishSchulte?: (stats: {
    durationSeconds: number;
    mistakes: number;
    equivalentWpm: number;
    accuracy: number;
  }) => void;
}

const PERIPHERAL_WORDS = [
  ["ODAK", "ZİHİN"],
  ["GÖRÜŞ", "HIZLI"],
  ["OKUMA", "BEYİN"],
  ["ALGILAMA", "SİNAPS"],
  ["KAVRAM", "BELLEK"],
  ["MERKEZ", "REFLEKS"],
  ["DİKKAT", "AKIŞ"],
  ["NÖRON", "SENTEZ"],
  ["VİZYON", "KRİSTAL"],
  ["STRATEJİ", "MODEL"],
];

function shuffleNumbers(count: number): number[] {
  const arr = Array.from({ length: count }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function SchulteTableDrill({ onFinishSchulte }: SchulteTableDrillProps) {
  const [subMode, setSubMode] = useState<"schulte" | "peripheral">("schulte");

  // Schulte 5x5 State
  const [numbers, setNumbers] = useState<number[]>(() => shuffleNumbers(25));
  const [nextTarget, setNextTarget] = useState<number>(1);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [mistakes, setMistakes] = useState<number>(0);
  const [dynamicShuffle, setDynamicShuffle] = useState<boolean>(false);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [bestTimeSec, setBestTimeSec] = useState<number | null>(21.4);
  const [lastResult, setLastResult] = useState<{
    timeSec: number;
    mistakes: number;
    rating: string;
  } | null>(null);

  const startTimeRef = useRef<number | null>(null);

  // Peripheral Vision Drill State
  const [periLevel, setPeriLevel] = useState<number>(1); // 1 to 5 width span
  const [periRound, setPeriRound] = useState<number>(0);
  const [periScore, setPeriScore] = useState<number>(0);
  const [periFlashing, setPeriFlashing] = useState<boolean>(false);
  const [periPair, setPeriPair] = useState<[string, string]>(["ODAK", "ZİHİN"]);
  const [periOptions, setPeriOptions] = useState<string[]>([]);
  const [periAnswered, setPeriAnswered] = useState<string | null>(null);

  // Timer interval for Schulte
  useEffect(() => {
    if (!isRunning) return;
    startTimeRef.current = Date.now() - elapsedMs;
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedMs(Date.now() - startTimeRef.current);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isRunning]);

  const startSchulte = () => {
    setNumbers(shuffleNumbers(25));
    setNextTarget(1);
    setMistakes(0);
    setElapsedMs(0);
    setLastResult(null);
    startTimeRef.current = Date.now();
    setIsRunning(true);
  };

  const handleCellClick = (num: number) => {
    if (!isRunning) {
      // Auto-start if user clicks '1' directly
      if (num === 1 && nextTarget === 1 && !lastResult) {
        startTimeRef.current = Date.now();
        setIsRunning(true);
        setNextTarget(2);
        if (dynamicShuffle) setNumbers(shuffleNumbers(25));
      }
      return;
    }

    if (num === nextTarget) {
      if (num === 25) {
        // Completed 1 -> 25!
        const finalMs = startTimeRef.current
          ? Date.now() - startTimeRef.current
          : elapsedMs;
        const finalSec = Number((finalMs / 1000).toFixed(2));
        setIsRunning(false);
        setElapsedMs(finalMs);

        if (bestTimeSec === null || finalSec < bestTimeSec) {
          setBestTimeSec(finalSec);
        }

        const rating =
          finalSec <= 18
            ? "Olağanüstü (Elit Görsel Tarama)"
            : finalSec <= 25
            ? "Çok İyi (Geniş Periferik Algı)"
            : finalSec <= 35
            ? "İyi (Gelişmekte Olan Ritm)"
            : "Başlangıç (Merkez Odağı Koruyun)";

        setLastResult({
          timeSec: finalSec,
          mistakes,
          rating,
        });

        const accuracy = Math.max(
          50,
          Math.round((25 / (25 + mistakes)) * 100)
        );
        // Map Schulte speed to an equivalent visual processing WPM metric
        const equivalentWpm = Math.min(
          750,
          Math.max(180, Math.round((25 / Math.max(finalSec, 8)) * 280))
        );

        onFinishSchulte?.({
          durationSeconds: Math.round(finalSec),
          mistakes,
          equivalentWpm,
          accuracy,
        });
      } else {
        setNextTarget(num + 1);
        if (dynamicShuffle) {
          setNumbers(shuffleNumbers(25));
        }
      }
    } else {
      setMistakes((m) => m + 1);
      setWrongCell(num);
      setTimeout(() => setWrongCell(null), 300);
    }
  };

  // Trigger a peripheral flash round
  const triggerPeripheralFlash = () => {
    const idx = Math.floor(Math.random() * PERIPHERAL_WORDS.length);
    const chosen = PERIPHERAL_WORDS[idx] as [string, string];
    setPeriPair(chosen);
    setPeriAnswered(null);
    setPeriFlashing(true);

    // Build 4 options (1 correct pair, 3 distractors)
    const correctLabel = `${chosen[0]} — ${chosen[1]}`;
    const distractors = PERIPHERAL_WORDS.filter((_, i) => i !== idx)
      .slice(0, 3)
      .map((p) => `${p[0]} — ${p[1]}`);
    const opts = [correctLabel, ...distractors].sort(() => Math.random() - 0.5);
    setPeriOptions(opts);

    // Flash duration: 350ms
    setTimeout(() => {
      setPeriFlashing(false);
    }, 350);
  };

  return (
    <div className="space-y-5">
      {/* Sub-mode Toggle: Schulte 5x5 vs Peripheral Vision Span */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border">
        <div className="flex rounded-xl bg-surface-elevated p-1 border border-border">
          <button
            onClick={() => setSubMode("schulte")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              subMode === "schulte"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Schulte Tablosu (5x5)</span>
          </button>
          <button
            onClick={() => {
              setSubMode("peripheral");
              if (periOptions.length === 0) triggerPeripheralFlash();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              subMode === "peripheral"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Çevresel Görüş (Peripheral Span)</span>
          </button>
        </div>

        {subMode === "schulte" ? (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setDynamicShuffle((d) => !d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                dynamicShuffle
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "bg-surface-elevated border-border text-muted hover:text-foreground"
              }`}
              title="Her doğru tıklamada tabloyu yeniden karıştırır"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Dinamik Karıştırma</span>
            </button>

            <button
              onClick={startSchulte}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Yeniden Başlat</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Tabloyu Başlat</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Açıklık Seviyesi:</span>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setPeriLevel(lvl)}
                className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all ${
                  periLevel === lvl
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-surface-elevated border-border text-muted"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        )}
      </div>

      {subMode === "schulte" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 5x5 Schulte Grid */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-md aspect-square p-3 sm:p-5 rounded-3xl bg-surface border-2 border-border shadow-xl relative grid grid-cols-5 gap-2 sm:gap-3 select-none">
              {numbers.map((num, idx) => {
                const isCenterCell = idx === 12;
                const isFound = !dynamicShuffle && num < nextTarget;
                const isWrong = wrongCell === num;

                return (
                  <motion.button
                    key={`${idx}-${num}`}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleCellClick(num)}
                    className={`relative rounded-2xl font-bold text-xl sm:text-2xl flex items-center justify-center border transition-all ${
                      isWrong
                        ? "bg-rose-500/25 border-rose-500 text-rose-400"
                        : isFound
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500/40"
                        : "bg-surface-elevated hover:bg-indigo-500/10 border-border hover:border-indigo-500/40 text-foreground"
                    }`}
                  >
                    <span>{num}</span>

                    {/* Center Fixation Dot (Red Reticle) */}
                    {isCenterCell && (
                      <span
                        title="Merkez Odak Noktası: Gözünüzü burada sabit tutun"
                        className="absolute w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-500/25 pointer-events-none"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
            <p className="text-xs text-muted mt-3 text-center max-w-md">
              İpucu: Gözünüzü tam merkezdeki{" "}
              <span className="text-rose-500 font-semibold">kırmızı noktada</span>{" "}
              sabit tutun ve 1&apos;den 25&apos;e kadar sayıları çevresel görüşünüzle
              bulup tıklayın. (Başlamak için doğrudan <strong>1</strong>&apos;e de
              tıklayabilirsiniz.)
            </p>
          </div>

          {/* Live Metrics & Instructions Panel */}
          <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-surface border border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sıradaki Sayı</span>
                </div>
                <div className="text-3xl font-extrabold text-indigo-400">
                  {nextTarget}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
                  <Timer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Süre</span>
                </div>
                <div className="text-3xl font-extrabold font-mono">
                  {(elapsedMs / 1000).toFixed(1)}s
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>En İyi Süre</span>
                </div>
                <div className="text-3xl font-extrabold text-amber-400">
                  {bestTimeSec ? `${bestTimeSec}s` : "--"}
                </div>
              </div>
            </div>

            {/* Result Card */}
            <AnimatePresence>
              {lastResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3"
                >
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Schulte Tablosu Tamamlandı!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-xl bg-surface/80 border border-border">
                      <div className="text-xs text-muted">Bitirme Süresi</div>
                      <div className="text-lg font-bold">
                        {lastResult.timeSec} saniye
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface/80 border border-border">
                      <div className="text-xs text-muted">Hatalı Tıklama</div>
                      <div className="text-lg font-bold">
                        {lastResult.mistakes} hata
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted">
                    Değerlendirme:{" "}
                    <strong className="text-foreground">
                      {lastResult.rating}
                    </strong>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Neuro-Visual Guide */}
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-2.5">
              <h4 className="font-semibold text-sm">
                Schulte Tablosu Neyi Geliştirir?
              </h4>
              <ul className="text-xs text-muted space-y-2 leading-relaxed">
                <li>
                  • <strong className="text-foreground">Foveal & Parafoveal Senkron:</strong>{" "}
                  Gözünüzü merkezden ayırmadan kenarlardaki sayıları görmek,
                  okurken tek bakışta 3-4 kelimeyi fotoğraflamanızı sağlar.
                </li>
                <li>
                  • <strong className="text-foreground">Hedef Süre:</strong>{" "}
                  25 saniyenin altı iyi, 18 saniyenin altı ise ileri seviye
                  hızlı okuyucu refleksini temsil eder.
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Peripheral Vision Horizontal Expansion Drill */
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border-2 border-border shadow-xl space-y-6">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Ortadaki kırmızı noktaya odaklanın ve{" "}
              <strong className="text-foreground">&quot;Kelime Çiftini Flaşla&quot;</strong>{" "}
              butonuna basın.
            </span>
            <span>
              Doğru Algılama:{" "}
              <strong className="text-emerald-400">
                {periScore} / {periRound}
              </strong>
            </span>
          </div>

          <div className="h-44 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center relative overflow-hidden select-none">
            {/* Center Fixation Dot */}
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 z-10" />

            {/* Flashing Words at left & right peripheral distance */}
            {periFlashing && (
              <div
                className="absolute inset-x-0 flex items-center justify-between px-6 pointer-events-none font-bold text-lg sm:text-2xl tracking-wider text-foreground"
                style={{
                  maxWidth: `${220 + periLevel * 95}px`,
                  margin: "0 auto",
                }}
              >
                <span>{periPair[0]}</span>
                <span>{periPair[1]}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={triggerPeripheralFlash}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all"
            >
              Kelime Çiftini Flaşla (350ms)
            </button>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto flex-1">
              {periOptions.map((opt) => {
                const correctLabel = `${periPair[0]} — ${periPair[1]}`;
                const isSelected = periAnswered === opt;
                const isCorrect = opt === correctLabel;

                return (
                  <button
                    key={opt}
                    disabled={Boolean(periAnswered)}
                    onClick={() => {
                      setPeriAnswered(opt);
                      setPeriRound((r) => r + 1);
                      if (isCorrect) {
                        setPeriScore((s) => s + 1);
                        if (periLevel < 5) setPeriLevel((l) => l + 1);
                      }
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      periAnswered
                        ? isCorrect
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : isSelected
                          ? "bg-rose-500/20 border-rose-500 text-rose-400"
                          : "bg-surface-elevated border-border text-muted opacity-50"
                        : "bg-surface-elevated hover:border-indigo-500/50 border-border text-foreground"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
