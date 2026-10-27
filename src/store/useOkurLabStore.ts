"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Book,
  BookNote,
  BookVisibility,
  CalibrationRecord,
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
  INITIAL_COMMUNITY_BOOKS,
  INITIAL_DAILY_TASKS,
  INITIAL_EXERCISE_LOGS,
  INITIAL_USER_PROFILE,
} from "@/data/mockData";
import { generateAlgorithmicDailyPlan } from "@/lib/dailyPlanner";
import { isUuid, newId } from "@/lib/ids";

interface ReaderPreferences {
  fontFamily: FontFamily;
  fontSize: number; // in px (16 - 28)
  lineHeight: number; // 1.5 - 2.2
  defaultWpm: number;
  autoRampEnabled: boolean;
}

export interface SavedAccountSnapshot {
  user: UserProfile;
  books: Book[];
  readingProgress: Record<string, UserReadingProgress>;
  bookNotes: BookNote[];
  exerciseLogs: ExerciseLog[];
}

interface OkurLabState {
  theme: ThemeMode;
  isAuthenticated: boolean;
  user: UserProfile;
  savedAccounts: Record<string, SavedAccountSnapshot>;
  books: Book[];
  communityBooks: Book[];
  lastActiveBookId: string;
  exerciseLogs: ExerciseLog[];
  calibrationHistory: CalibrationRecord[];
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
  loginOrSwitchAccount: (params: {
    id?: string;
    name: string;
    email: string;
    provider?: "email" | "google" | "guest";
  }) => void;
  logoutAccount: () => void;
  applyCloudState: (data: {
    user?: UserProfile;
    books?: Book[];
    exerciseLogs?: ExerciseLog[];
    readingProgress?: Record<string, UserReadingProgress>;
    bookNotes?: BookNote[];
  }) => void;
  updateReaderPrefs: (prefs: Partial<ReaderPreferences>) => void;
  recordExercise: (params: {
    exercise_type: ExerciseType;
    achieved_wpm: number;
    accuracy_score: number;
    duration_seconds: number;
    label?: string;
  }) => void;
  addCalibrationRecord: (
    record: Omit<CalibrationRecord, "id" | "completed_at">
  ) => void;
  applyCalibratedWpm: (wpm: number) => void;
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
  updateBookVisibility: (
    bookId: string,
    visibility: BookVisibility
  ) => string;
  importBookByInviteOrCommunity: (codeOrBookId: string) => {
    ok: boolean;
    book?: Book;
    message: string;
  };
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
    type?: "highlight" | "note";
    is_public?: boolean;
  }) => BookNote;
  deleteBookNote: (noteId: string) => void;
  resetDemoData: () => void;
}

export const useOkurLabStore = create<OkurLabState>()(
  persist(
    (set, get) => ({
      theme: "sepia",
      isAuthenticated: true,
      user: { ...INITIAL_USER_PROFILE, auth_provider: "email" },
      savedAccounts: {},
      books: INITIAL_BOOKS.map((b, idx) => ({
        ...b,
        visibility: idx === 0 ? "public" : "private",
        share_code: `OKUR-${100 + idx}`,
        owner_id: INITIAL_USER_PROFILE.id,
        owner_name: INITIAL_USER_PROFILE.name,
      })),
      communityBooks: INITIAL_COMMUNITY_BOOKS,
      lastActiveBookId: INITIAL_BOOKS[0]?.id || "book-neuro-focus",
      exerciseLogs: INITIAL_EXERCISE_LOGS,
      calibrationHistory: [],
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
      bookNotes: [],
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

      loginOrSwitchAccount: ({ id, name, email, provider = "email" }) =>
        set((state) => {
          const cleanEmail = email.trim().toLowerCase();
          const currentSnapshot: SavedAccountSnapshot = {
            user: state.user,
            books: state.books,
            readingProgress: state.readingProgress,
            bookNotes: state.bookNotes,
            exerciseLogs: state.exerciseLogs,
          };
          const updatedSaved = {
            ...state.savedAccounts,
            [state.user.email.toLowerCase()]: currentSnapshot,
          };

          const existingAccount = updatedSaved[cleanEmail];
          if (existingAccount) {
            return {
              isAuthenticated: true,
              savedAccounts: updatedSaved,
              user: {
                ...existingAccount.user,
                // Supabase kimliği varsa yerel profil ona bağlanır (topluluk yazarlığı bu kimliğe dayanır)
                id: id || existingAccount.user.id,
                name: name.trim() || existingAccount.user.name,
                auth_provider: provider,
              },
              books: existingAccount.books,
              readingProgress: existingAccount.readingProgress,
              bookNotes: existingAccount.bookNotes,
              exerciseLogs: existingAccount.exerciseLogs,
              lastSyncedAt: new Date().toISOString(),
            };
          }

          const newUserId =
            id || `user-${cleanEmail.replace(/[^a-z0-9]/g, "").slice(0, 12)}`;
          const newUser: UserProfile = {
            id: newUserId,
            name: name.trim() || cleanEmail.split("@")[0] || "Okur",
            email: cleanEmail,
            current_wpm: 310,
            baseline_wpm: 220,
            comprehension_rate: 86,
            streak_days: 1,
            created_at: new Date().toISOString(),
            auth_provider: provider,
          };

          return {
            isAuthenticated: true,
            savedAccounts: updatedSaved,
            user: newUser,
            lastSyncedAt: new Date().toISOString(),
          };
        }),

      logoutAccount: () =>
        set((state) => {
          const currentSnapshot: SavedAccountSnapshot = {
            user: state.user,
            books: state.books,
            readingProgress: state.readingProgress,
            bookNotes: state.bookNotes,
            exerciseLogs: state.exerciseLogs,
          };
          return {
            isAuthenticated: false,
            savedAccounts: {
              ...state.savedAccounts,
              [state.user.email.toLowerCase()]: currentSnapshot,
            },
          };
        }),

      applyCloudState: (data) =>
        set((state) => ({
          user: data.user ? { ...state.user, ...data.user } : state.user,
          // Cloud holds only user-uploaded books; keep bundled/local ones and let cloud copies win by id.
          books:
            data.books && data.books.length > 0
              ? [
                  ...state.books.filter(
                    (local) => !data.books!.some((cloud) => cloud.id === local.id)
                  ),
                  ...data.books,
                ]
              : state.books,
          exerciseLogs:
            data.exerciseLogs && data.exerciseLogs.length > 0
              ? data.exerciseLogs
              : state.exerciseLogs,
          readingProgress: data.readingProgress
            ? { ...state.readingProgress, ...data.readingProgress }
            : state.readingProgress,
          bookNotes:
            data.bookNotes && data.bookNotes.length > 0
              ? [
                  ...data.bookNotes,
                  ...state.bookNotes.filter(
                    (local) => !data.bookNotes!.some((cloud) => cloud.id === local.id)
                  ),
                ]
              : state.bookNotes,
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

      addCalibrationRecord: (record) =>
        set((state) => ({
          calibrationHistory: [
            ...state.calibrationHistory,
            {
              ...record,
              id: `cal-${Date.now()}`,
              completed_at: new Date().toISOString(),
            },
          ],
        })),

      // Varsayılan hızı ve mevcut tüm kitap konumlarındaki tercih edilen hızı günceller.
      applyCalibratedWpm: (wpm) =>
        set((state) => {
          const nextProgress: Record<string, UserReadingProgress> = {};
          for (const [bookId, prog] of Object.entries(state.readingProgress)) {
            nextProgress[bookId] = { ...prog, preferred_wpm: wpm };
          }
          return {
            readerPrefs: { ...state.readerPrefs, defaultWpm: wpm },
            readingProgress: nextProgress,
          };
        }),

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
        set((state) => {
          const shareCode =
            book.share_code ||
            `OKUR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const enrichedBook: Book = {
            ...book,
            visibility: book.visibility || "private",
            share_code: shareCode,
            owner_id: book.owner_id || state.user.id,
            owner_name: book.owner_name || state.user.name,
          };
          const updatedCommunityBooks =
            enrichedBook.visibility === "public" &&
            !state.communityBooks.some((cb) => cb.id === enrichedBook.id)
              ? [enrichedBook, ...state.communityBooks]
              : state.communityBooks;

          return {
            books: [enrichedBook, ...state.books],
            communityBooks: updatedCommunityBooks,
            lastActiveBookId: enrichedBook.id,
            readingProgress: {
              ...state.readingProgress,
              [enrichedBook.id]: {
                id: `prog-${enrichedBook.id}`,
                user_id: state.user.id,
                book_id: enrichedBook.id,
                current_word_index: 0,
                reading_mode: "pacer",
                preferred_wpm: state.user.current_wpm || 320,
                updated_at: new Date().toISOString(),
              },
            },
          };
        }),

      updateBookVisibility: (bookId, visibility) => {
        let generatedCode = "";
        set((state) => {
          const updatedBooks = state.books.map((b) => {
            if (b.id !== bookId) return b;
            generatedCode =
              b.share_code ||
              `OKUR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            return {
              ...b,
              visibility,
              share_code: generatedCode,
              owner_id: b.owner_id || state.user.id,
              owner_name: b.owner_name || state.user.name,
            };
          });

          const targetBook = updatedBooks.find((b) => b.id === bookId);
          let updatedCommunity = [...state.communityBooks];
          if (targetBook) {
            if (visibility === "public" || visibility === "friends") {
              const exists = updatedCommunity.some(
                (cb) => cb.id === targetBook.id
              );
              if (exists) {
                updatedCommunity = updatedCommunity.map((cb) =>
                  cb.id === targetBook.id ? targetBook : cb
                );
              } else {
                updatedCommunity = [targetBook, ...updatedCommunity];
              }
            } else {
              updatedCommunity = updatedCommunity.filter(
                (cb) => cb.id !== targetBook.id
              );
            }
          }

          return {
            books: updatedBooks,
            communityBooks: updatedCommunity,
          };
        });
        return generatedCode;
      },

      importBookByInviteOrCommunity: (codeOrBookId) => {
        const clean = codeOrBookId.trim().toUpperCase();
        const state = get();
        const allPool = [...state.communityBooks, ...state.books];
        const found = allPool.find(
          (b) =>
            b.id === codeOrBookId.trim() ||
            (b.share_code && b.share_code.toUpperCase() === clean)
        );

        if (!found) {
          return {
            ok: false,
            message:
              "Bu davet koduna veya bağlantıya ait paylaşılan bir kitap bulunamadı. Örnek kod: OKUR-KAFKA veya OKUR-ZWEIG",
          };
        }

        const alreadyInLibrary = state.books.some((b) => b.id === found.id);
        if (alreadyInLibrary) {
          set({ lastActiveBookId: found.id });
          return {
            ok: true,
            book: found,
            message: `"${found.title}" zaten kütüphanenizde mevcut, aktif kitap olarak seçildi.`,
          };
        }

        set((prev) => ({
          books: [found, ...prev.books],
          lastActiveBookId: found.id,
          readingProgress: {
            ...prev.readingProgress,
            [found.id]: {
              id: `prog-${found.id}`,
              user_id: prev.user.id,
              book_id: found.id,
              current_word_index: 0,
              reading_mode: "pacer",
              preferred_wpm: prev.user.current_wpm || 320,
              updated_at: new Date().toISOString(),
            },
          },
        }));

        return {
          ok: true,
          book: found,
          message: `"${found.title}" (${found.author}) OkurLab kütüphanenize eklendi!`,
        };
      },

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

      addBookNote: ({
        book_id,
        word_index,
        selected_text,
        content,
        type = "note",
        is_public = true,
      }) => {
        const state = get();
        const newNote: BookNote = {
          id: newId(),
          user_id: state.user.id,
          book_id,
          word_index,
          selected_text,
          content,
          created_at: new Date().toISOString(),
          author_name: state.user.name,
          author_wpm: state.user.current_wpm,
          type,
          is_public,
          likes_count: 0,
        };
        set({ bookNotes: [newNote, ...state.bookNotes] });
        return newNote;
      },

      deleteBookNote: (noteId) =>
        set((state) => ({
          bookNotes: state.bookNotes.filter((n) => n.id !== noteId),
        })),

      resetDemoData: () =>
        set({
          theme: "sepia",
          isAuthenticated: true,
          user: { ...INITIAL_USER_PROFILE, auth_provider: "email" },
          books: INITIAL_BOOKS,
          bookNotes: [],
          communityBooks: INITIAL_COMMUNITY_BOOKS,
          lastActiveBookId: INITIAL_BOOKS[0]?.id || "book-neuro-focus",
          exerciseLogs: INITIAL_EXERCISE_LOGS,
          calibrationHistory: [],
          dailyTasks: INITIAL_DAILY_TASKS,
          dailyReadingMinutes: 15,
          dailyWordsRead: 3200,
        }),
    }),
    {
      name: "okurlab-storage-v2",
      version: 3,
      // v3: topluluk verisi sunucuya taşındı; yerel sahte veriyi at, not kimliklerini uuid yap.
      migrate: (persisted) => {
        const state = (persisted || {}) as Record<string, unknown>;
        delete state.communityMarginalia;
        delete state.communityReviews;
        delete state.communityQuotes;
        const upgradeNotes = (notes: unknown): BookNote[] =>
          (Array.isArray(notes) ? (notes as BookNote[]) : [])
            .filter((n) => n.id !== "note-initial-1")
            .map((n) => (isUuid(n.id) ? n : { ...n, id: newId() }));
        state.bookNotes = upgradeNotes(state.bookNotes);
        const saved = state.savedAccounts as
          | Record<string, { bookNotes?: unknown }>
          | undefined;
        if (saved) {
          for (const snapshot of Object.values(saved)) {
            snapshot.bookNotes = upgradeNotes(snapshot.bookNotes);
          }
        }
        return state as unknown as OkurLabState;
      },
      storage: createJSONStorage(() => localStorage),
    }
  )
);
