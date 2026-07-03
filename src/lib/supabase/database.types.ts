export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          titel: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          titel?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          titel?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      analysis_snapshots: {
        Row: {
          id: string;
          conversation_id: string;
          version: number;
          input_data: Json;
          calculated_results: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          version: number;
          input_data: Json;
          calculated_results?: Json | null;
          created_at?: string;
        };
        Update: {
          input_data?: Json;
          calculated_results?: Json | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          snapshot_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          snapshot_id?: string | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          snapshot_id?: string | null;
        };
        Relationships: [];
      };
      uploads: {
        Row: {
          id: string;
          snapshot_id: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          snapshot_id: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
        };
        Relationships: [];
      };
      vision_extract_rate_limits: {
        Row: {
          user_id: string;
          window_start: string;
          request_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          window_start: string;
          request_count: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          request_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      append_analysis_snapshot: {
        Args: {
          target_conversation_id: string;
          next_title: string | null;
          input_data: Json;
          calculated_results: Json | null;
          user_content: string;
          assistant_content: string;
        };
        Returns: {
          snapshot_id: string;
          version: number;
          conversation_id: string;
          updated_at: string;
        }[];
      };
      consume_vision_extract_rate_limit: {
        Args: {
          max_requests?: number;
          window_seconds?: number;
        };
        Returns: {
          allowed: boolean;
          remaining: number;
          reset_at: string;
          request_count: number;
        }[];
      };
      ensure_conversation_snapshot: {
        Args: {
          target_conversation_id: string;
          input_data: Json;
        };
        Returns: {
          snapshot_id: string;
          version: number;
          created: boolean;
        }[];
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
