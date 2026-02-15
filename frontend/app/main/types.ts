export type AuthUser = {
  username: string;
  role: string;
  score: number;
};

export type Category = "OSINT" | "Web" | "Forensics" | "Pwn" | "Reversing" | "Network";
export type Difficulty = "NORMAL" | "HARD";

export type ChallengeItem = {
  id: number;
  name: string;
  category: Category;
  difficulty: Difficulty;
  message: string;
  point: number;
  score_type: "basic" | "dynamic";
  state: "Visible" | "Hidden";
  attachment_file_id: number | null;
  attachment_file_name?: string | null;
  docker_enabled: boolean;
  docker_template_id?: string | null;
};

export type FlagSubmitResponse = {
  success: boolean;
  message: string;
  awarded_point: number;
  total_score: number;
  blood: "first" | "second" | "third" | null;
};

export type ChallengeServerAccessResponse = {
  challenge_id: number;
  host: string;
  port: number;
  url: string;
  expires_at_ts: number;
  remaining_seconds: number;
  reused: boolean;
};

export type BloodEffect = {
  title: string;
  subtitle: string;
  titleClassName: string;
  borderClassName: string;
};

export type PublicConfigResponse = {
  ctf_name: string;
  duration_start_ts: number | null;
  duration_end_ts: number | null;
  is_active: boolean;
};

export const CATEGORIES: Category[] = ["OSINT", "Web", "Forensics", "Pwn", "Reversing", "Network"];
