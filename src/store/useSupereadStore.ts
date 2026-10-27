"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Book,
  BookNote,
  ComprehensionQuestion,
  DailyTask,
  ExerciseLog,
  ExerciseType,
  FontFamily,
  ReadingMode,
  ThemeMode,
  UserProfile,
  UserReadingProgress,
} from "@/types";
import {
  INITIAL_BOOKS,
  INITIAL_DAILY_TASKS,
  INITIAL_EXERCISE_LOGS,
  INITIAL_USER_PROFILE,
} from "@/data/mockData";
import { generateAlgorithmicDailyPlan } from "@/lib/dailyPlanner";

interface ReaderPreferences {
  fontFamily: FontFamily;
  fontSize: number; // in px (16 - 28)
  lineHeight: number; // 1.5 - 2.2
  defaultWpm: number;
  autoRampEnabled: boolean;
}

interface SupereadState {
  theme: ThemeMode;
  user: UserProfile;
  books: Book[];
  lastActiveBookId: string;
  exerciseLogs: ExerciseLog[];
  dailyTasks: DailyTask[];
  readingProgress: Record<string, UserReadingProgress>;
  bookNotes: BookNote[];
  readerPrefs: ReaderPreferences;
  dailyReadingMinutes: number;
  dailyReadingGoalMinutes: number;
  dailyWordsRead: number;
  dailyWordsGoal: number;
  geminiApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  lastSyncedAt: string | null;

  // Actions
  setTheme: (theme: ThemeMode) => void;
  setLastActiveBookId: (bookId: string) => void;
  setGeminiApiKey: (key: string) => void;
  setSupabaseConfig: (url: string, anonKey: string) => void;
  setLastSyncedAt: (iso: string) => void;
  applyCloudState: (data: {
    user?: UserProfile;
    books?: Book[];
    exerciseLogs?: ExerciseLog[];
    readingProgress?: Record<string, UserReadingProgress>;
  }) => void;
  updateReaderPrefs: (prefs: Partial<ReaderPreferences>) => void;
  recordExercise: (params: {
    exercise_type: ExerciseType;
    achieved_wpm: number;
    accuracy_score: number;
    duration_seconds: number;
    label?: string;
  }) => void;
  recordReadingSession: (params: {
    bookId: string;
    wordIndex: number;
    wordsRead: number;
    durationSeconds: number;
    finalWpm: number;
    mode: ReadingMode;
  }) => void;
  regenerateDailyPlan: () => void;
  toggleDailyTask: (taskId: string) => void;
  markDailyTaskByType: (type: ExerciseType | "book_reading") => void;
  addBook: (book: Book) => void;
  setBookQuestions: (
    bookId: string,
    questions: ComprehensionQuestion[]
  ) => void;
  deleteCustomBook: (bookId: string) => void;
  updateReadingProgress: (
    bookId: string,
    wordIndex: number,
    mode: ReadingMode,
    wpm?: number
  ) => void;
  addBookNote: (params: {
    book_id: string;
    word_index: number;
    selected_text?: string;
    content: string;
  }) => void;
  deleteBookNote: (noteId: string) => void;
  resetDemoData: () => void;
}

export const useSupereadStore = create<SupereadState>()(
  persist(
    (set, get) => ({
      theme: "sepia",
      user: INITIAL_USER_PROFILE,
      books: INITIAL_BOOKS,
      lastActiveBookId: INITIAL_BOOKS[0]?.id || "book-neuro-focus",
      exerciseLogs: INITIAL_EXERCISE_LOGS,
      dailyTasks: INITIAL_DAILY_TASKS,
      dailyReadingMinutes: 15,
      dailyReadingGoalMinutes: 20,
      dailyWordsRead: 3200,
      dailyWordsGoal: 5000,
      geminiApiKey: "",
      supabaseUrl: "",
      supabaseAnonKey: "",
      lastSyncedAt: null,
      readingProgress: {
        "book-neuro-focus": {
          id: "prog-1",
          user_id: "user-1",
          book_id: "book-neuro-focus",
          current_word_index: 64,
          reading_mode: "pacer",
          preferred_wpm: 340,
          updated_at: new Date().toISOString(),
        },
      },
      bookNotes: [
        {
          id: "note-initial-1",
          book_id: "book-neuro-focus",
          word_index: 48,
          selected_text: "Optimal Recognition Point (ORP)",
          content:
            "Göz kelimenin tam ortasına değil, ortanın hafif soluna odaklandığında kelimeyi çok daha hızlı tanıyor.",
          created_at: "2026-10-26T19:00:00.000Z",
        },
      ],
      readerPrefs: {
        fontFamily: "serif",
        fontSize: 19,
        lineHeight: 1.85,
        defaultWpm: 320,
        autoRampEnabled: true,
      },

      setTheme: (theme) => set({ theme }),

      setLastActiveBookId: (lastActiveBookId) => set({ lastActiveBookId }),

      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),

      setSupabaseConfig: (supabaseUrl, supabaseAnonKey) =>
        set({ supabaseUrl, supabaseAnonKey }),

      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

      applyCloudState: (data) =>
        set((state) => ({
          user: data.user ? { ...state.user, ...data.user } : state.user,
          books: data.books && data.books.length > 0 ? data.books : state.books,
          exerciseLogs:
            data.exerciseLogs && data.exerciseLogs.length > 0
              ? data.exerciseLogs
              : state.exerciseLogs,
          readingProgress: data.readingProgress
            ? { ...state.readingProgress, ...data.readingProgress }
            : state.readingProgress,
          lastSyncedAt: new Date().toISOString(),
        })),

      updateReaderPrefs: (prefs) =>
        set((state) => ({
          readerPrefs: { ...state.readerPrefs, ...prefs },
        })),

      recordExercise: ({
        exercise_type,
        achieved_wpm,
        accuracy_score,
        duration_seconds,
        label,
      }) => {
        const now = new Date();
        const dayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
        const newLog: ExerciseLog = {
          id: `log-${Date.now()}`,
          user_id: get().user.id,
          exercise_type,
          achieved_wpm: Math.round(achieved_wpm),
          accuracy_score: Math.round(accuracy_score),
          duration_seconds: Math.max(1, Math.round(duration_seconds)),
          completed_at: now.toISOString(),
          label: label || dayNames[now.getDay()],
        };

        set((state) => {
          const updatedLogs = [...state.exerciseLogs, newLog];
          const updatedUser = { ...state.user };

          if (achieved_wpm > 0) {
            updatedUser.current_wpm = Math.round(achieved_wpm);
          }
          if (exercise_type === "speed_test") {
            updatedUser.comprehension_rate = Math.round(accuracy_score);
          }

          const updatedTasks = state.dailyTasks.map((t) =>
            t.exercise_type === exercise_type ? { ...t, completed: true } : t
          );

          return {
            exerciseLogs: updatedLogs,
            user: updatedUser,
            dailyTasks: updatedTasks,
          };
        });
      },

      recordReadingSession: ({
        bookId,
        wordIndex,
        wordsRead,
        durationSeconds,
        finalWpm,
        mode,
      }) => {
        const now = new Date();
        const dayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
        const addedMinutes = Math.max(0.5, Number((durationSeconds / 60).toFixed(1)));
        const cleanWordsRead = Math.max(0, Math.round(wordsRead));
        const cleanWpm = Math.round(finalWpm);

        set((state) => {
          const existingProg = state.readingProgress[bookId];
          const updatedProgress = {
            ...state.readingProgress,
            [bookId]: {
              id: existingProg?.id || `prog-${bookId}`,
              user_id: state.user.id,
              book_id: bookId,
              current_word_index: Math.max(0, wordIndex),
              reading_mode: mode,
              preferred_wpm: cleanWpm,
              updated_at: now.toISOString(),
            },
          };

          const updatedUser = {
            ...state.user,
            current_wpm: cleanWpm > 0 ? cleanWpm : state.user.current_wpm,
          };

          const updatedLogs =
            cleanWordsRead >= 15 || durationSeconds >= 10
              ? [
                  ...state.exerciseLogs,
                  {
                    id: `log-read-${Date.now()}`,
                    user_id: state.user.id,
                    exercise_type: (mode === "rsvp" ? "rsvp" : "pacer") as ExerciseType,
                    achieved_wpm: cleanWpm,
                    accuracy_score: state.user.comprehension_rate || 88,
                    duration_seconds: Math.max(1, Math.round(durationSeconds)),
                    completed_at: now.toISOString(),
                    label: dayNames[now.getDay()],
                  },
                ]
              : state.exerciseLogs;

          return {
            lastActiveBookId: bookId,
            readingProgress: updatedProgress,
            user: updatedUser,
            exerciseLogs: updatedLogs,
            dailyReadingMinutes: Number(
              (state.dailyReadingMinutes + addedMinutes).toFixed(1)
            ),
            dailyWordsRead: state.dailyWordsRead + cleanWordsRead,
          };
        });
      },

      regenerateDailyPlan: () =>
        set((state) => {
          const plan = generateAlgorithmicDailyPlan(
            state.user.current_wpm,
            state.user.comprehension_rate
          );
          return {
            dailyTasks: plan.tasks,
          };
        }),

      toggleDailyTask: (taskId) =>
        set((state) => ({
          dailyTasks: state.dailyTasks.map((t) =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          ),
        })),

      markDailyTaskByType: (type) =>
        set((state) => ({
          dailyTasks: state.dailyTasks.map((t) =>
            t.exercise_type === type ? { ...t, completed: true } : t
          ),
        })),

      addBook: (book) =>
        set((state) => ({
          books: [book, ...state.books],
          lastActiveBookId: book.id,
          readingProgress: {
            ...state.readingProgress,
            [book.id]: {
              id: `prog-${book.id}`,
              user_id: state.user.id,
              book_id: book.id,
              current_word_index: 0,
              reading_mode: "pacer",
              preferred_wpm: state.user.current_wpm || 320,
              updated_at: new Date().toISOString(),
            },
          },
        })),

      setBookQuestions: (bookId, questions) =>
        set((state) => ({
          books: state.books.map((b) =>
            b.id === bookId ? { ...b, questions } : b
          ),
        })),

      deleteCustomBook: (bookId) =>
        set((state) => {
          const remaining = state.books.filter((b) => b.id !== bookId);
          return {
            books: remaining,
            lastActiveBookId:
              state.lastActiveBookId === bookId
                ? remaining[0]?.id || ""
                : state.lastActiveBookId,
          };
        }),

      updateReadingProgress: (bookId, wordIndex, mode, wpm) =>
        set((state) => {
          const existing = state.readingProgress[bookId];
          const updatedWpm =
            wpm ?? existing?.preferred_wpm ?? state.readerPrefs.defaultWpm;
          return {
            lastActiveBookId: bookId,
            user:
              wpm && wpm > 0
                ? { ...state.user, current_wpm: Math.round(wpm) }
                : state.user,
            readingProgress: {
              ...state.readingProgress,
              [bookId]: {
                id: existing?.id || `prog-${bookId}`,
                user_id: state.user.id,
                book_id: bookId,
                current_word_index: Math.max(0, wordIndex),
                reading_mode: mode,
                preferred_wpm: updatedWpm,
                updated_at: new Date().toISOString(),
              },
            },
          };
        }),

      addBookNote: ({ book_id, word_index, selected_text, content }) =>
        set((state) => ({
          bookNotes: [
            {
              id: `note-${Date.now()}`,
              book_id,
              word_index,
              selected_text,
              content,
              created_at: new Date().toISOString(),
            },
            ...state.bookNotes,
          ],
        })),

      deleteBookNote: (noteId) =>
        set((state) => ({
          bookNotes: state.bookNotes.filter((n) => n.id !== noteId),
        })),

      resetDemoData: () =>
        set({
          theme: "sepia",
          user: INITIAL_USER_PROFILE,
          books: INITIAL_BOOKS,
          lastActiveBookId: INITIAL_BOOKS[0]?.id || "book-neuro-focus",
          exerciseLogs: INITIAL_EXERCISE_LOGS,
          dailyTasks: INITIAL_DAILY_TASKS,
          dailyReadingMinutes: 15,
          dailyWordsRead: 3200,
        }),
    }),
    {
      name: "ocula-vision-storage-v3",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
