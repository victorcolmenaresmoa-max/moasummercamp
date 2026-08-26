export type Campus = 'merida' | 'el_vigia';
export type UserRole = 'participant' | 'moderator' | 'admin';
export type CheckpointStatus = 'pending' | 'approved' | 'needs_work';

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  campus: Campus | null;
  role: UserRole;
  group_name: string | null;
  created_at: string;
  updated_at: string;
};

export type ResponseRow = {
  id: string;
  user_id: string;
  day: number;
  section_id: string;
  field_key: string;
  field_label: string | null;
  value: Json;
  created_at: string;
  updated_at: string;
};

export type CheckpointRow = {
  id: string;
  user_id: string;
  day: number;
  checkpoint_number: number;
  status: CheckpointStatus;
  items_checked: string[];
  moderator_id: string | null;
  moderator_initials: string | null;
  comments: string | null;
  approved_at: string | null;
  updated_at: string;
};

export type AiReportRow = {
  id: string;
  user_id: string;
  requested_by: string | null;
  model: string;
  summary: string | null;
  strengths: { title: string; evidence: string }[];
  growth_areas: { title: string; evidence: string; suggestion: string }[];
  evidence_use: number | null;
  pedagogical_depth: number | null;
  reflection_depth: number | null;
  next_step: string | null;
  moderator_notes: string | null;
  raw: Json;
  generated_at: string;
};

export type AiInteractionRow = {
  id: string;
  user_id: string;
  day: number | null;
  section_id: string | null;
  prompt: string;
  response: string | null;
  created_at: string;
};

export type ParticipantProgressRow = {
  id: string;
  full_name: string;
  campus: Campus | null;
  group_name: string | null;
  day1_answers: number;
  day2_answers: number;
  day3_answers: number;
  day4_answers: number;
  checkpoints_approved: number;
  last_report_at: string | null;
  last_activity: string | null;
};

// Tipado minimo para supabase-js. Si quieres el tipado completo:
//   npx supabase gen types typescript --project-id <id> > src/types/supabase.ts
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; full_name: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      responses: {
        Row: ResponseRow;
        Insert: Partial<ResponseRow>;
        Update: Partial<ResponseRow>;
        Relationships: [];
      };
      checkpoints: {
        Row: CheckpointRow;
        Insert: Partial<CheckpointRow>;
        Update: Partial<CheckpointRow>;
        Relationships: [];
      };
      ai_reports: {
        Row: AiReportRow;
        Insert: Partial<AiReportRow>;
        Update: Partial<AiReportRow>;
        Relationships: [];
      };
      ai_interactions: {
        Row: AiInteractionRow;
        Insert: Partial<AiInteractionRow>;
        Update: Partial<AiInteractionRow>;
        Relationships: [];
      };
    };
    Views: {
      participant_progress: { Row: ParticipantProgressRow; Relationships: [] };
    };
    Functions: {};
    Enums: { campus: Campus; user_role: UserRole; checkpoint_status: CheckpointStatus };
    CompositeTypes: {};
  };
}
