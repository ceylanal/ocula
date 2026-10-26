export type ThemeMode = "dark" | "light" | "sepia";

export type ExerciseType = "rsvp" | "pacer" | "schulte" | "speed_test" | "peripheral";

export type ReadingMode = "standard" | "rsvp" | "pacer";

export type FontFamily = "sans" | "serif" | "mono";

export interface ComprehensionQuestion {
  id: string;
  book_id: string;
  question_text: string;
  options: string[];
  correct_option: number; // 0-indexed
}

export interface BookNote {
  id: string;
  book_id: string;
  word_index: number;
  selected_text?: string;
  content: string;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  difficulty_level: "Başlangıç" | "Orta" | "İleri";
  word_count: number;
  cover_gradient: string;
  summary: string;
  content: string[]; // Array of paragraphs
  questions?: ComprehensionQuestion[];
  is_custom?: boolean;
}

export interface ExerciseLog {
  id: string;
  user_id: string;
  exercise_type: ExerciseType;
  achieved_wpm: number;
  accuracy_score: number; // Percentage (0-100)
  duration_seconds: number;
  completed_at: string; // ISO date string
  label?: string;
}

export interface UserReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  current_word_index: number;
  reading_mode: ReadingMode;
  preferred_wpm: number;
  updated_at: string;
}

export interface SpeedTestArticle {
  id: string;
  title: string;
  category: string;
  difficulty: "Başlangıç" | "Orta" | "İleri";
  word_count: number;
  paragraphs: string[];
  questions: ComprehensionQuestion[];
}

export interface DailyTask {
  id: string;
  title: string;
  subtitle: string;
  exercise_type: ExerciseType | "book_reading";
  target_href: string;
  duration_label: string;
  completed: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  current_wpm: number;
  baseline_wpm: number;
  comprehension_rate: number;
  streak_days: number;
  created_at: string;
}
