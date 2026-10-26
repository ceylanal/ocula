"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Zap,
  Eye,
  Grid,
  FileText,
  Edit3,
  Check,
} from "lucide-react";
import { DRILL_SAMPLE_TEXTS } from "@/data/mockData";
import { useSupereadStore } from "@/store/useSupereadStore";
import { RsvpEngine } from "@/components/drills/RsvpEngine";
import { MagicPacerEngine } from "@/components/drills/MagicPacerEngine";
import { SchulteTableDrill } from "@/components/drills/SchulteTableDrill";

type DrillTab = "rsvp" | "pacer" | "schulte";

function DrillsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as DrillTab) || "rsvp";

  const [activeTab, setActiveTab] = useState<DrillTab>(
    ["rsvp", "pacer", "schulte"].includes(initialTab) ? initialTab : "rsvp"
  );
  const [selectedTextId, setSelectedTextId] = useState<string>(
    DRILL_SAMPLE_TEXTS[0].id
  );
  const [customTextModal, setCustomTextModal] = useState<boolean>(false);
  const [customTextValue, setCustomTextValue] = useState<string>("");
  const [customParagraphs, setCustomParagraphs] = useState<string[] | null>(
    null
  );

  const { recordExercise, user } = useSupereadStore();

  useEffect(() => {
    const tabParam = searchParams.get("tab") as DrillTab;
    if (tabParam && ["rsvp", "pacer", "schulte"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const activeParagraphs =
    customParagraphs ||
    DRILL_SAMPLE_TEXTS.find((t) => t.id === selectedTextId)?.paragraphs ||
    DRILL_SAMPLE_TEXTS[0].paragraphs;

  const handleApplyCustomText = () => {
    const cleaned = customTextValue
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (cleaned.length > 0) {
      setCustomParagraphs(cleaned);
      setSelectedTextId("custom");
      setCustomTextModal(false);
    }
  };

  const wpmParam = Number(searchParams.get("wpm"));
  const targetDrillWpm =
    wpmParam >= 100 && wpmParam <= 1000 ? wpmParam : undefined;

  return (
    <div className="space-y-6">
      {/* Header & Module Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Göz ve Odak Egzersiz Motoru
          </h1>
          <p className="text-sm text-muted mt-1">
            İç seslendirmeyi kırın, sakkadik ritmi sabitleyin ve çevresel görüş
            alanınızı genişletin.
          </p>
        </div>

        {/* 3 Core Drill Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-surface border border-border">
          <button
            onClick={() => setActiveTab("rsvp")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === "rsvp"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>RSVP Odak</span>
          </button>

          <button
            onClick={() => setActiveTab("pacer")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === "pacer"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Magic Pacer</span>
          </button>

          <button
            onClick={() => setActiveTab("schulte")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === "schulte"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Schulte 5x5</span>
          </button>
        </div>
      </div>

      {/* Text Source Selector (Shown for RSVP & Magic Pacer) */}
      {activeTab !== "schulte" && (
        <div className="p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted flex items-center gap-1.5 mr-1">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Antrenman Metni:
            </span>
            {DRILL_SAMPLE_TEXTS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCustomParagraphs(null);
                  setSelectedTextId(item.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  selectedTextId === item.id && !customParagraphs
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400 font-semibold"
                    : "bg-surface-elevated border-border text-muted hover:text-foreground"
                }`}
              >
                {item.title}
              </button>
            ))}
            {customParagraphs && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Özel Metin Aktif
              </span>
            )}
          </div>

          <button
            onClick={() => setCustomTextModal((v) => !v)}
            className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:border-indigo-500/40 border border-border text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Kendi Metnini Yapıştır</span>
          </button>
        </div>
      )}

      {/* Optional Custom Text Drawer */}
      {customTextModal && activeTab !== "schulte" && (
        <div className="p-5 rounded-2xl bg-surface border border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">
              Özel Antrenman Metni Yapıştırın
            </h3>
            <button
              onClick={() => setCustomTextModal(false)}
              className="text-xs text-muted hover:text-foreground"
            >
              Kapat
            </button>
          </div>
          <textarea
            rows={4}
            value={customTextValue}
            onChange={(e) => setCustomTextValue(e.target.value)}
            placeholder="RSVP veya Magic Pacer ile okumak istediğiniz herhangi bir makale veya paragrafı buraya yapıştırın..."
            className="w-full rounded-xl bg-surface-elevated border border-border p-3 text-sm focus:outline-none focus:border-indigo-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleApplyCustomText}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Metni Egzersize Yükle
            </button>
          </div>
        </div>
      )}

      {/* Active Drill Engine Render */}
      {activeTab === "rsvp" && (
        <RsvpEngine
          paragraphs={activeParagraphs}
          initialWpm={targetDrillWpm || user.current_wpm || 350}
          onFinishSession={({ wpm, durationSeconds }) => {
            recordExercise({
              exercise_type: "rsvp",
              achieved_wpm: wpm,
              accuracy_score: 90,
              duration_seconds: durationSeconds,
            });
          }}
        />
      )}

      {activeTab === "pacer" && (
        <MagicPacerEngine
          paragraphs={activeParagraphs}
          initialWpm={targetDrillWpm || user.current_wpm || 320}
          onFinishSession={({ wpm, durationSeconds }) => {
            recordExercise({
              exercise_type: "pacer",
              achieved_wpm: wpm,
              accuracy_score: 88,
              duration_seconds: durationSeconds,
            });
          }}
        />
      )}

      {activeTab === "schulte" && (
        <SchulteTableDrill
          onFinishSchulte={({
            durationSeconds,
            equivalentWpm,
            accuracy,
          }) => {
            recordExercise({
              exercise_type: "schulte",
              achieved_wpm: equivalentWpm,
              accuracy_score: accuracy,
              duration_seconds: durationSeconds,
            });
          }}
        />
      )}
    </div>
  );
}

export default function DrillsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 rounded-3xl bg-surface border border-border animate-pulse" />
      }
    >
      <DrillsContent />
    </Suspense>
  );
}
