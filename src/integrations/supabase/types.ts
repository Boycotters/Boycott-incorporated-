export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          points_reward: number | null
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          points_reward?: number | null
          requirement_type: string
          requirement_value: number
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          points_reward?: number | null
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      redemptions: {
        Row: {
          created_at: string | null
          id: string
          points_spent: number
          reward_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points_spent: number
          reward_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points_spent?: number
          reward_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          bonus_points: number
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          status: string | null
        }
        Insert: {
          bonus_points?: number
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          status?: string | null
        }
        Update: {
          bonus_points?: number
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image: string | null
          is_active: boolean | null
          name: string
          points_cost: number
          stock: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          name: string
          points_cost: number
          stock?: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          name?: string
          points_cost?: number
          stock?: number
        }
        Relationships: []
      }
      streak_milestones: {
        Row: {
          bonus_points: number
          claimed_at: string | null
          id: string
          milestone_days: number
          user_id: string
        }
        Insert: {
          bonus_points: number
          claimed_at?: string | null
          id?: string
          milestone_days: number
          user_id: string
        }
        Update: {
          bonus_points?: number
          claimed_at?: string | null
          id?: string
          milestone_days?: number
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          is_active: boolean | null
          points_reward: number
          title: string
          verification_type: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          points_reward: number
          title: string
          verification_type?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_active?: boolean | null
          points_reward?: number
          title?: string
          verification_type?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          points_amount: number | null
          status: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          points_amount?: number | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          points_amount?: number | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          points_earned: number | null
          proof_submitted_at: string | null
          proof_url: string | null
          status: string | null
          task_id: string | null
          timer_started_at: string | null
          user_id: string | null
          verification_notes: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          points_earned?: number | null
          proof_submitted_at?: string | null
          proof_url?: string | null
          status?: string | null
          task_id?: string | null
          timer_started_at?: string | null
          user_id?: string | null
          verification_notes?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          points_earned?: number | null
          proof_submitted_at?: string | null
          proof_url?: string | null
          status?: string | null
          task_id?: string | null
          timer_started_at?: string | null
          user_id?: string | null
          verification_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_video_views: {
        Row: {
          completed: boolean
          id: string
          points_awarded: number
          user_id: string
          video_id: string
          watch_duration_seconds: number
          watched_at: string
        }
        Insert: {
          completed?: boolean
          id?: string
          points_awarded?: number
          user_id: string
          video_id: string
          watch_duration_seconds?: number
          watched_at?: string
        }
        Update: {
          completed?: boolean
          id?: string
          points_awarded?: number
          user_id?: string
          video_id?: string
          watch_duration_seconds?: number
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          current_streak: number | null
          email: string
          full_name: string | null
          id: string
          is_verified: boolean | null
          last_login_date: string | null
          level: number | null
          longest_streak: number | null
          phone: string | null
          referral_code: string | null
          total_points: number | null
          vip_tier: string | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          email: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          last_login_date?: string | null
          level?: number | null
          longest_streak?: number | null
          phone?: string | null
          referral_code?: string | null
          total_points?: number | null
          vip_tier?: string | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          email?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          last_login_date?: string | null
          level?: number | null
          longest_streak?: number | null
          phone?: string | null
          referral_code?: string | null
          total_points?: number | null
          vip_tier?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number
          id: string
          is_active: boolean
          partner_name: string | null
          points_reward: number
          source: string
          thumbnail_url: string | null
          title: string
          video_url: string
          view_count: number
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number
          id?: string
          is_active?: boolean
          partner_name?: string | null
          points_reward?: number
          source?: string
          thumbnail_url?: string | null
          title: string
          video_url: string
          view_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number
          id?: string
          is_active?: boolean
          partner_name?: string | null
          points_reward?: number
          source?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string
          view_count?: number
        }
        Relationships: []
      }
      vip_tiers: {
        Row: {
          benefits: string[]
          color: string
          created_at: string | null
          daily_task_bonus: number
          icon: string
          id: string
          min_points: number
          multiplier: number
          name: string
          slug: string
          upgrade_cost: number
        }
        Insert: {
          benefits?: string[]
          color: string
          created_at?: string | null
          daily_task_bonus?: number
          icon: string
          id?: string
          min_points?: number
          multiplier?: number
          name: string
          slug: string
          upgrade_cost?: number
        }
        Update: {
          benefits?: string[]
          color?: string
          created_at?: string | null
          daily_task_bonus?: number
          icon?: string
          id?: string
          min_points?: number
          multiplier?: number
          name?: string
          slug?: string
          upgrade_cost?: number
        }
        Relationships: []
      }
      wallets: {
        Row: {
          available_points: number | null
          created_at: string | null
          id: string
          locked_points: number | null
          user_id: string | null
        }
        Insert: {
          available_points?: number | null
          created_at?: string | null
          id?: string
          locked_points?: number | null
          user_id?: string | null
        }
        Update: {
          available_points?: number | null
          created_at?: string | null
          id?: string
          locked_points?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          fee: number
          id: string
          net_amount: number
          phone_number: string
          processed_at: string | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          fee?: number
          id?: string
          net_amount: number
          phone_number: string
          processed_at?: string | null
          provider: string
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          fee?: number
          id?: string
          net_amount?: number
          phone_number?: string
          processed_at?: string | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leaderboard: {
        Row: {
          current_streak: number | null
          full_name: string | null
          id: string | null
          level: number | null
          longest_streak: number | null
          total_points: number | null
          vip_tier: string | null
        }
        Insert: {
          current_streak?: number | null
          full_name?: string | null
          id?: string | null
          level?: number | null
          longest_streak?: number | null
          total_points?: number | null
          vip_tier?: string | null
        }
        Update: {
          current_streak?: number | null
          full_name?: string | null
          id?: string | null
          level?: number | null
          longest_streak?: number | null
          total_points?: number | null
          vip_tier?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_award_achievements: {
        Args: { p_user_id: string }
        Returns: number
      }
      check_login_streak: { Args: { p_user_id: string }; Returns: Json }
      check_streak_milestones: { Args: { p_user_id: string }; Returns: Json }
      complete_video_watch: {
        Args: {
          p_user_id: string
          p_video_id: string
          p_watch_duration: number
        }
        Returns: Json
      }
      create_transaction: {
        Args: {
          p_description: string
          p_points_amount: number
          p_status?: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      get_user_vip_tier: { Args: { p_total_points: number }; Returns: string }
      process_referral: {
        Args: { new_user_id: string; referrer_code: string }
        Returns: boolean
      }
      purchase_tier_upgrade: {
        Args: { p_target_tier: string; p_user_id: string }
        Returns: Json
      }
      recover_streak: {
        Args: { p_recovery_cost?: number; p_user_id: string }
        Returns: Json
      }
      request_withdrawal: {
        Args: {
          p_amount: number
          p_phone_number: string
          p_provider: string
          p_user_id: string
        }
        Returns: Json
      }
      update_user_points: {
        Args: { points_to_add: number; user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
