export type ThemeMode = "dark" | "light" | "sepia";

export type ExerciseType = "rsvp" | "pacer" | "schulte" | "speed_test" | "peripheral";

export type ReadingMode = "standard" | "rsvp" | "pacer";

export type FontFamily = "sans" | "serif" | "mono";

export type BookVisibility = "private" | "friends" | "public";

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
  author_name?: string;
  author_wpm?: number;
  type?: "highlight" | "note";
  is_public?: boolean;
  likes_count?: number;
  user_id?: string;
  liked_by_me?: boolean;
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
  visibility?: BookVisibility;
  share_code?: string;
  owner_id?: string;
  owner_name?: string;
}

export interface CommunityComment {
  id: string;
  user_id?: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface CommunityReview {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  book_id: string;
  book_title: string;
  book_author: string;
  achieved_wpm: number;
  rating: number; // 1 to 5
  review_text: string;
  likes: number;
  liked_by_me?: boolean;
  comments: CommunityComment[];
  created_at: string;
}

export interface CommunityQuotePost {
  id: string;
  user_id: string;
  user_name: string;
  user_wpm: number;
  book_id: string;
  book_title: string;
  book_author: string;
  quote_text: string;
  word_index: number;
  note_comment?: string;
  highlight_count: number;
  likes: number;
  liked_by_me?: boolean;
  comments: CommunityComment[];
  created_at: string;
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

export interface CalibrationRecord {
  id: string;
  article_id: string;
  article_title: string;
  difficulty: SpeedTestArticle["difficulty"];
  wpm: number;
  comprehension: number; // Percentage (0-100)
  effective_wpm: number; // wpm × comprehension
  duration_seconds: number;
  completed_at: string; // ISO date string
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
  auth_provider?: "email" | "google" | "guest";
  /** Abonelik planı; yalnızca sunucudan gelir. Yoksa "free" sayılır. */
  plan?: "free" | "pro";
}
