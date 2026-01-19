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
      admin_access_codes: {
        Row: {
          code_hash: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          uses_count: number | null
        }
        Insert: {
          code_hash: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          uses_count?: number | null
        }
        Update: {
          code_hash?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          uses_count?: number | null
        }
        Relationships: []
      }
      admin_activity_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      earning_algorithms: {
        Row: {
          config: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      flash_sales: {
        Row: {
          created_at: string | null
          discount_percentage: number
          ends_at: string
          id: string
          is_active: boolean | null
          reward_id: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string | null
          discount_percentage?: number
          ends_at: string
          id?: string
          is_active?: boolean | null
          reward_id?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number
          ends_at?: string
          id?: string
          is_active?: boolean | null
          reward_id?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flash_sales_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      game_achievements: {
        Row: {
          created_at: string | null
          description: string | null
          game_type: string | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          points_reward: number
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          game_type?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          points_reward?: number
          requirement_type: string
          requirement_value: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          game_type?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          points_reward?: number
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      game_tournaments: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string
          entry_fee: number | null
          game_type: string
          id: string
          max_participants: number | null
          name: string
          prize_distribution: Json | null
          prize_pool: number
          start_time: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time: string
          entry_fee?: number | null
          game_type: string
          id?: string
          max_participants?: number | null
          name: string
          prize_distribution?: Json | null
          prize_pool?: number
          start_time: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string
          entry_fee?: number | null
          game_type?: string
          id?: string
          max_participants?: number | null
          name?: string
          prize_distribution?: Json | null
          prize_pool?: number
          start_time?: string
          status?: string | null
        }
        Relationships: []
      }
      mobile_money_transactions: {
        Row: {
          amount_zmw: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          external_transaction_id: string | null
          id: string
          phone_number: string
          processed_at: string | null
          provider: string
          provider_response: Json | null
          status: string
          user_id: string
          withdrawal_id: string | null
        }
        Insert: {
          amount_zmw: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          external_transaction_id?: string | null
          id?: string
          phone_number: string
          processed_at?: string | null
          provider: string
          provider_response?: Json | null
          status?: string
          user_id: string
          withdrawal_id?: string | null
        }
        Update: {
          amount_zmw?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          external_transaction_id?: string | null
          id?: string
          phone_number?: string
          processed_at?: string | null
          provider?: string
          provider_response?: Json | null
          status?: string
          user_id?: string
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_money_transactions_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
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
      phone_verification_otps: {
        Row: {
          attempts: number | null
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          otp_hash: string | null
          phone_number: string
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          otp_hash?: string | null
          phone_number: string
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          otp_hash?: string | null
          phone_number?: string
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      platform_stats: {
        Row: {
          active_users_today: number | null
          created_at: string | null
          games_played: number | null
          id: string
          revenue_potential: number | null
          stat_date: string
          surveys_completed: number | null
          tasks_completed: number | null
          total_points_earned: number | null
          total_points_withdrawn: number | null
          total_users: number | null
          updated_at: string | null
          videos_watched: number | null
        }
        Insert: {
          active_users_today?: number | null
          created_at?: string | null
          games_played?: number | null
          id?: string
          revenue_potential?: number | null
          stat_date?: string
          surveys_completed?: number | null
          tasks_completed?: number | null
          total_points_earned?: number | null
          total_points_withdrawn?: number | null
          total_users?: number | null
          updated_at?: string | null
          videos_watched?: number | null
        }
        Update: {
          active_users_today?: number | null
          created_at?: string | null
          games_played?: number | null
          id?: string
          revenue_potential?: number | null
          stat_date?: string
          surveys_completed?: number | null
          tasks_completed?: number | null
          total_points_earned?: number | null
          total_points_withdrawn?: number | null
          total_users?: number | null
          updated_at?: string | null
          videos_watched?: number | null
        }
        Relationships: []
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
      survey_responses: {
        Row: {
          completion_time_seconds: number | null
          created_at: string | null
          demographic_data: Json | null
          device_info: Json | null
          exported_at: string | null
          id: string
          is_exported: boolean | null
          points_awarded: number | null
          questions: Json
          responses: Json
          survey_id: string
          survey_title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completion_time_seconds?: number | null
          created_at?: string | null
          demographic_data?: Json | null
          device_info?: Json | null
          exported_at?: string | null
          id?: string
          is_exported?: boolean | null
          points_awarded?: number | null
          questions?: Json
          responses?: Json
          survey_id: string
          survey_title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completion_time_seconds?: number | null
          created_at?: string | null
          demographic_data?: Json | null
          device_info?: Json | null
          exported_at?: string | null
          id?: string
          is_exported?: boolean | null
          points_awarded?: number | null
          questions?: Json
          responses?: Json
          survey_id?: string
          survey_title?: string
          updated_at?: string | null
          user_id?: string | null
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
      tournament_participants: {
        Row: {
          attempts: number | null
          best_score: number | null
          id: string
          joined_at: string | null
          prize_won: number | null
          rank: number | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          attempts?: number | null
          best_score?: number | null
          id?: string
          joined_at?: string | null
          prize_won?: number | null
          rank?: number | null
          tournament_id: string
          user_id: string
        }
        Update: {
          attempts?: number | null
          best_score?: number | null
          id?: string
          joined_at?: string | null
          prize_won?: number | null
          rank?: number | null
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "game_tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          id: string
          points_amount: number | null
          reference_id: string | null
          status: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          points_amount?: number | null
          reference_id?: string | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          points_amount?: number | null
          reference_id?: string | null
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
      user_game_achievements: {
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
            foreignKeyName: "user_game_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "game_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_game_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_game_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_game_plays: {
        Row: {
          game_type: string
          id: string
          played_at: string
          points_earned: number
          score: number | null
          user_id: string
        }
        Insert: {
          game_type: string
          id?: string
          played_at?: string
          points_earned?: number
          score?: number | null
          user_id: string
        }
        Update: {
          game_type?: string
          id?: string
          played_at?: string
          points_earned?: number
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          created_at: string | null
          equipped_at: string | null
          id: string
          is_equipped: boolean | null
          item_type: string
          redemption_id: string | null
          reward_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          equipped_at?: string | null
          id?: string
          is_equipped?: boolean | null
          item_type: string
          redemption_id?: string | null
          reward_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          equipped_at?: string | null
          id?: string
          is_equipped?: boolean | null
          item_type?: string
          redemption_id?: string | null
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
          verification_data: Json | null
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
          verification_data?: Json | null
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
          verification_data?: Json | null
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
          phone_verified: boolean | null
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
          phone_verified?: boolean | null
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
          phone_verified?: boolean | null
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
          game_plays_per_attempt: number | null
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
          game_plays_per_attempt?: number | null
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
          game_plays_per_attempt?: number | null
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
      weekend_campaigns: {
        Row: {
          bonus_multiplier: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          bonus_multiplier?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
        }
        Update: {
          bonus_multiplier?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
        }
        Relationships: []
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
      admin_update_withdrawal: {
        Args: {
          p_admin_notes?: string
          p_status: string
          p_withdrawal_id: string
        }
        Returns: Json
      }
      are_tasks_available_today: { Args: never; Returns: Json }
      award_survey_points: {
        Args: { p_points: number; p_survey_title: string; p_user_id: string }
        Returns: Json
      }
      check_ai_rate_limit: {
        Args: {
          p_action: string
          p_limit_per_minute?: number
          p_user_id: string
        }
        Returns: Json
      }
      check_and_award_achievements: {
        Args: { p_user_id: string }
        Returns: number
      }
      check_comprehensive_daily_limits: {
        Args: { p_user_id: string }
        Returns: Json
      }
      check_daily_earning_cap: { Args: { p_user_id: string }; Returns: Json }
      check_login_streak: { Args: { p_user_id: string }; Returns: Json }
      check_streak_milestones: { Args: { p_user_id: string }; Returns: Json }
      check_withdrawal_eligibility: {
        Args: { p_user_id: string }
        Returns: Json
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      complete_ai_partner_task: {
        Args: {
          p_points_amount: number
          p_source?: string
          p_task_title: string
          p_task_type: string
          p_user_id: string
        }
        Returns: Json
      }
      complete_video_watch: {
        Args: {
          p_user_id: string
          p_video_id: string
          p_watch_duration: number
        }
        Returns: Json
      }
      create_admin_access_code: {
        Args: { p_code: string; p_expires_days?: number }
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
      equip_inventory_item: {
        Args: { p_equip?: boolean; p_inventory_id: string; p_user_id: string }
        Returns: Json
      }
      export_survey_data: { Args: { p_mark_exported?: boolean }; Returns: Json }
      get_active_flash_sales: { Args: never; Returns: Json }
      get_game_leaderboard: {
        Args: { p_game_type?: string; p_period?: string }
        Returns: {
          best_score: number
          full_name: string
          games_played: number
          rank: number
          total_score: number
          user_id: string
        }[]
      }
      get_game_plays_remaining: { Args: { p_user_id: string }; Returns: Json }
      get_platform_stats: { Args: never; Returns: Json }
      get_user_vip_tier: { Args: { p_total_points: number }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { p_user_id?: string }; Returns: boolean }
      join_tournament: {
        Args: { p_tournament_id: string; p_user_id: string }
        Returns: Json
      }
      log_admin_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type?: string
        }
        Returns: undefined
      }
      play_game: {
        Args: {
          p_game_type: string
          p_points_earned: number
          p_score?: number
          p_user_id: string
        }
        Returns: Json
      }
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
      redeem_reward: {
        Args: { p_reward_id: string; p_user_id: string }
        Returns: Json
      }
      request_withdrawal:
        | {
            Args: {
              p_amount: number
              p_phone_number: string
              p_provider: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_phone_number: string
              p_provider: string
              p_user_id: string
            }
            Returns: Json
          }
      secure_complete_task: {
        Args: {
          p_task_id: string
          p_user_id: string
          p_verification_data?: Json
        }
        Returns: Json
      }
      submit_tournament_score: {
        Args: { p_score: number; p_tournament_id: string; p_user_id: string }
        Returns: Json
      }
      update_user_points: {
        Args: { points_to_add: number; user_id: string }
        Returns: undefined
      }
      verify_admin_access_code:
        | { Args: { p_code: string; p_user_id: string }; Returns: Json }
        | { Args: { p_code: string; p_user_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
