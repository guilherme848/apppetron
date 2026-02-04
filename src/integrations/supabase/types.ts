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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          ad_monthly_budget: number | null
          ad_payment_frequency: string | null
          ad_payment_method: string | null
          address_complement: string | null
          churned_at: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          cpf_cnpj: string | null
          created_at: string
          cs_member_id: string | null
          deleted_at: string | null
          designer_member_id: string | null
          health_score: number | null
          health_status: string | null
          id: string
          last_contact_at: string | null
          monthly_value: number | null
          name: string
          neighborhood: string | null
          niche: string | null
          niche_id: string | null
          origin: string | null
          postal_code: string | null
          service_contracted: string | null
          service_id: string | null
          social_member_id: string | null
          start_date: string | null
          state: string | null
          status: string
          street: string | null
          street_number: string | null
          support_member_id: string | null
          traffic_cycle_id: string | null
          traffic_member_id: string | null
          traffic_routine_id: string | null
          updated_at: string | null
          videomaker_member_id: string | null
          website: string | null
        }
        Insert: {
          ad_monthly_budget?: number | null
          ad_payment_frequency?: string | null
          ad_payment_method?: string | null
          address_complement?: string | null
          churned_at?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          cs_member_id?: string | null
          deleted_at?: string | null
          designer_member_id?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: string
          last_contact_at?: string | null
          monthly_value?: number | null
          name: string
          neighborhood?: string | null
          niche?: string | null
          niche_id?: string | null
          origin?: string | null
          postal_code?: string | null
          service_contracted?: string | null
          service_id?: string | null
          social_member_id?: string | null
          start_date?: string | null
          state?: string | null
          status?: string
          street?: string | null
          street_number?: string | null
          support_member_id?: string | null
          traffic_cycle_id?: string | null
          traffic_member_id?: string | null
          traffic_routine_id?: string | null
          updated_at?: string | null
          videomaker_member_id?: string | null
          website?: string | null
        }
        Update: {
          ad_monthly_budget?: number | null
          ad_payment_frequency?: string | null
          ad_payment_method?: string | null
          address_complement?: string | null
          churned_at?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          cs_member_id?: string | null
          deleted_at?: string | null
          designer_member_id?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: string
          last_contact_at?: string | null
          monthly_value?: number | null
          name?: string
          neighborhood?: string | null
          niche?: string | null
          niche_id?: string | null
          origin?: string | null
          postal_code?: string | null
          service_contracted?: string | null
          service_id?: string | null
          social_member_id?: string | null
          start_date?: string | null
          state?: string | null
          status?: string
          street?: string | null
          street_number?: string | null
          support_member_id?: string | null
          traffic_cycle_id?: string | null
          traffic_member_id?: string | null
          traffic_routine_id?: string | null
          updated_at?: string | null
          videomaker_member_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_cs_member_id_fkey"
            columns: ["cs_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_designer_member_id_fkey"
            columns: ["designer_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_social_member_id_fkey"
            columns: ["social_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_support_member_id_fkey"
            columns: ["support_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_traffic_cycle_id_fkey"
            columns: ["traffic_cycle_id"]
            isOneToOne: false
            referencedRelation: "traffic_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_traffic_member_id_fkey"
            columns: ["traffic_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_traffic_routine_id_fkey"
            columns: ["traffic_routine_id"]
            isOneToOne: false
            referencedRelation: "traffic_routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_videomaker_member_id_fkey"
            columns: ["videomaker_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_account_metrics_daily: {
        Row: {
          ad_account_id: string
          created_at: string
          date: string
          id: string
          metrics_json: Json
          platform: string
        }
        Insert: {
          ad_account_id: string
          created_at?: string
          date: string
          id?: string
          metrics_json?: Json
          platform?: string
        }
        Update: {
          ad_account_id?: string
          created_at?: string
          date?: string
          id?: string
          metrics_json?: Json
          platform?: string
        }
        Relationships: []
      }
      base_health_score_config: {
        Row: {
          components: Json
          created_at: string
          green_threshold: number
          id: string
          is_active: boolean
          name: string
          normalization_rules: Json
          updated_at: string
          yellow_threshold: number
        }
        Insert: {
          components?: Json
          created_at?: string
          green_threshold?: number
          id?: string
          is_active?: boolean
          name?: string
          normalization_rules?: Json
          updated_at?: string
          yellow_threshold?: number
        }
        Update: {
          components?: Json
          created_at?: string
          green_threshold?: number
          id?: string
          is_active?: boolean
          name?: string
          normalization_rules?: Json
          updated_at?: string
          yellow_threshold?: number
        }
        Relationships: []
      }
      base_health_score_history: {
        Row: {
          components_snapshot: Json
          config_id: string | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          raw_metrics: Json | null
          score_value: number
        }
        Insert: {
          components_snapshot?: Json
          config_id?: string | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          raw_metrics?: Json | null
          score_value: number
        }
        Update: {
          components_snapshot?: Json
          config_id?: string | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          raw_metrics?: Json | null
          score_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "base_health_score_history_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "base_health_score_config"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_attachments: {
        Row: {
          batch_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_attachments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "content_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meta_ad_accounts: {
        Row: {
          active: boolean
          ad_account_id: string
          client_id: string
          created_at: string
          id: string
        }
        Insert: {
          active?: boolean
          ad_account_id: string
          client_id: string
          created_at?: string
          id?: string
        }
        Update: {
          active?: boolean
          ad_account_id?: string
          client_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_meta_ad_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      clint_webhook_events: {
        Row: {
          contract_id: string | null
          created_at: string
          error: string | null
          event_type: string | null
          id: string
          payload: Json
          processed_at: string | null
          received_at: string
          source_event_id: string
          status: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          received_at?: string
          source_event_id: string
          status?: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          received_at?: string
          source_event_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clint_webhook_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_generated"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["commercial_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["commercial_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["commercial_role"]
          user_id?: string
        }
        Relationships: []
      }
      content_batches: {
        Row: {
          archived: boolean
          client_id: string | null
          created_at: string
          delivery_date: string | null
          id: string
          month_ref: string
          notes: string | null
          planning_due_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          client_id?: string | null
          created_at?: string
          delivery_date?: string | null
          id?: string
          month_ref: string
          notes?: string | null
          planning_due_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          client_id?: string | null
          created_at?: string
          delivery_date?: string | null
          id?: string
          month_ref?: string
          notes?: string | null
          planning_due_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_batches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_change_requests: {
        Row: {
          comment_rich: string
          created_at: string
          id: string
          post_id: string
          requested_at: string
          requested_by_member_id: string | null
          resolution_note_rich: string | null
          resolved_at: string | null
          resolved_by_member_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          comment_rich: string
          created_at?: string
          id?: string
          post_id: string
          requested_at?: string
          requested_by_member_id?: string | null
          resolution_note_rich?: string | null
          resolved_at?: string | null
          resolved_by_member_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          comment_rich?: string
          created_at?: string
          id?: string
          post_id?: string
          requested_at?: string
          requested_by_member_id?: string | null
          resolution_note_rich?: string | null
          resolved_at?: string | null
          resolved_by_member_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_change_requests_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_change_requests_requested_by_member_id_fkey"
            columns: ["requested_by_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_change_requests_resolved_by_member_id_fkey"
            columns: ["resolved_by_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      content_extra_request_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          public_url: string | null
          request_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          public_url?: string | null
          request_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          public_url?: string | null
          request_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_extra_request_files_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "content_extra_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      content_extra_requests: {
        Row: {
          assignee_id: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          month_ref: string
          priority: string
          request_rich: string | null
          requested_by_member_id: string | null
          requested_by_role_key: string
          responsible_role_key: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          month_ref: string
          priority?: string
          request_rich?: string | null
          requested_by_member_id?: string | null
          requested_by_role_key: string
          responsible_role_key?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          month_ref?: string
          priority?: string
          request_rich?: string | null
          requested_by_member_id?: string | null
          requested_by_role_key?: string
          responsible_role_key?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_extra_requests_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_extra_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_extra_requests_requested_by_member_id_fkey"
            columns: ["requested_by_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          brief: string | null
          channel: string | null
          client_id: string | null
          copy_text: string | null
          created_at: string
          creative_notes: string | null
          due_date: string | null
          format: string | null
          id: string
          owner: string | null
          priority: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brief?: string | null
          channel?: string | null
          client_id?: string | null
          copy_text?: string | null
          created_at?: string
          creative_notes?: string | null
          due_date?: string | null
          format?: string | null
          id?: string
          owner?: string | null
          priority?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brief?: string | null
          channel?: string | null
          client_id?: string | null
          copy_text?: string | null
          created_at?: string
          creative_notes?: string | null
          due_date?: string | null
          format?: string | null
          id?: string
          owner?: string | null
          priority?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_post_files: {
        Row: {
          context: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          post_id: string
          public_url: string | null
          storage_path: string
        }
        Insert: {
          context: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          post_id: string
          public_url?: string | null
          storage_path: string
        }
        Update: {
          context?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          post_id?: string
          public_url?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_post_files_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_posts: {
        Row: {
          assignee_id: string | null
          batch_id: string
          briefing: string | null
          briefing_rich: string | null
          briefing_title: string | null
          caption: string | null
          changes_rich: string | null
          changes_title: string | null
          channel: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          format: string | null
          id: string
          item_type: string | null
          responsible_role_id: string | null
          responsible_role_key: string
          sort_order: number
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          batch_id: string
          briefing?: string | null
          briefing_rich?: string | null
          briefing_title?: string | null
          caption?: string | null
          changes_rich?: string | null
          changes_title?: string | null
          channel?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          format?: string | null
          id?: string
          item_type?: string | null
          responsible_role_id?: string | null
          responsible_role_key?: string
          sort_order?: number
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          batch_id?: string
          briefing?: string | null
          briefing_rich?: string | null
          briefing_title?: string | null
          caption?: string | null
          changes_rich?: string | null
          changes_title?: string | null
          channel?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          format?: string | null
          id?: string
          item_type?: string | null
          responsible_role_id?: string | null
          responsible_role_key?: string
          sort_order?: number
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "content_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_responsible_role_id_fkey"
            columns: ["responsible_role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_revisions: {
        Row: {
          content_id: string
          created_at: string
          id: string
          notes: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          notes: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_revisions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      content_stage_responsibilities: {
        Row: {
          created_at: string
          default_responsible_role_key: string | null
          id: string
          role_id: string | null
          stage_key: string
        }
        Insert: {
          created_at?: string
          default_responsible_role_key?: string | null
          id?: string
          role_id?: string | null
          stage_key: string
        }
        Update: {
          created_at?: string
          default_responsible_role_key?: string | null
          id?: string
          role_id?: string | null
          stage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_stage_responsibilities_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_events: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          actor_type: string | null
          contract_id: string
          created_at: string
          event_description: string | null
          event_type: string
          id: string
          metadata: Json | null
          payload_original: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: string | null
          contract_id: string
          created_at?: string
          event_description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          payload_original?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: string | null
          contract_id?: string
          created_at?: string
          event_description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          payload_original?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_generated"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_files: {
        Row: {
          contract_id: string
          created_at: string
          document_hash: string | null
          file_name: string
          file_size: number | null
          file_type: string
          id: string
          mime_type: string | null
          storage_path: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          document_hash?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          id?: string
          mime_type?: string | null
          storage_path: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          document_hash?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_files_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_generated"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signers: {
        Row: {
          contract_id: string
          cpf: string | null
          created_at: string
          email: string
          external_signer_id: string | null
          id: string
          ip_address: string | null
          name: string
          role: string
          sign_order: number
          signed_at: string | null
          status: string
        }
        Insert: {
          contract_id: string
          cpf?: string | null
          created_at?: string
          email: string
          external_signer_id?: string | null
          id?: string
          ip_address?: string | null
          name: string
          role?: string
          sign_order?: number
          signed_at?: string | null
          status?: string
        }
        Update: {
          contract_id?: string
          cpf?: string | null
          created_at?: string
          email?: string
          external_signer_id?: string | null
          id?: string
          ip_address?: string | null
          name?: string
          role?: string
          sign_order?: number
          signed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_generated"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_fields: {
        Row: {
          created_at: string
          default_value: string | null
          field_key: string
          field_label: string
          field_type: string
          id: string
          is_required: boolean
          sort_order: number
          source_mapping: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          default_value?: string | null
          field_key: string
          field_label: string
          field_type?: string
          id?: string
          is_required?: boolean
          sort_order?: number
          source_mapping?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          default_value?: string | null
          field_key?: string
          field_label?: string
          field_type?: string
          id?: string
          is_required?: boolean
          sort_order?: number
          source_mapping?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_versions: {
        Row: {
          content_html: string
          created_at: string
          created_by_member_id: string | null
          id: string
          is_active: boolean
          template_id: string
          version_number: number
        }
        Insert: {
          content_html: string
          created_at?: string
          created_by_member_id?: string | null
          id?: string
          is_active?: boolean
          template_id: string
          version_number?: number
        }
        Update: {
          content_html?: string
          created_at?: string
          created_by_member_id?: string | null
          id?: string
          is_active?: boolean
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_versions_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          is_default_for_plan: boolean
          name: string
          service_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_default_for_plan?: boolean
          name: string
          service_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_default_for_plan?: boolean
          name?: string
          service_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          account_id: string
          created_at: string
          id: string
          mrr: number
          start_date: string
          status: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          mrr?: number
          start_date: string
          status?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          mrr?: number
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts_generated: {
        Row: {
          account_id: string
          contract_end_date: string | null
          contract_number: string
          contract_start_date: string | null
          created_at: string
          document_hash: string | null
          external_document_id: string | null
          external_provider: string | null
          external_signing_url: string | null
          fields_snapshot: Json
          generated_at: string | null
          id: string
          mrr: number | null
          sent_at: string | null
          setup_fee: number | null
          signed_at: string | null
          source: string
          source_event_id: string | null
          status: string
          template_id: string | null
          template_version_id: string | null
          total_first_month: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          contract_end_date?: string | null
          contract_number: string
          contract_start_date?: string | null
          created_at?: string
          document_hash?: string | null
          external_document_id?: string | null
          external_provider?: string | null
          external_signing_url?: string | null
          fields_snapshot?: Json
          generated_at?: string | null
          id?: string
          mrr?: number | null
          sent_at?: string | null
          setup_fee?: number | null
          signed_at?: string | null
          source?: string
          source_event_id?: string | null
          status?: string
          template_id?: string | null
          template_version_id?: string | null
          total_first_month?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          contract_end_date?: string | null
          contract_number?: string
          contract_start_date?: string | null
          created_at?: string
          document_hash?: string | null
          external_document_id?: string | null
          external_provider?: string | null
          external_signing_url?: string | null
          fields_snapshot?: Json
          generated_at?: string | null
          id?: string
          mrr?: number | null
          sent_at?: string | null
          setup_fee?: number | null
          signed_at?: string | null
          source?: string
          source_event_id?: string | null
          status?: string
          template_id?: string | null
          template_version_id?: string | null
          total_first_month?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_generated_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_generated_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_generated_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "contract_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_alert_config: {
        Row: {
          alert_type: string
          created_at: string
          enabled: boolean
          id: string
          threshold_days: number | null
          threshold_value: number | null
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          enabled?: boolean
          id?: string
          threshold_days?: number | null
          threshold_value?: number | null
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          enabled?: boolean
          id?: string
          threshold_days?: number | null
          threshold_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cs_audit_log: {
        Row: {
          action: string
          changed_by_member_id: string | null
          changes_json: Json | null
          client_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          changed_by_member_id?: string | null
          changes_json?: Json | null
          client_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          changed_by_member_id?: string | null
          changes_json?: Json | null
          client_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_audit_log_changed_by_member_id_fkey"
            columns: ["changed_by_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_audit_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_cancellation_reason_links: {
        Row: {
          cancellation_id: string
          created_at: string
          id: string
          reason_id: string
        }
        Insert: {
          cancellation_id: string
          created_at?: string
          id?: string
          reason_id: string
        }
        Update: {
          cancellation_id?: string
          created_at?: string
          id?: string
          reason_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_cancellation_reason_links_cancellation_id_fkey"
            columns: ["cancellation_id"]
            isOneToOne: false
            referencedRelation: "cs_cancellations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_cancellation_reason_links_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "cs_cancellation_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_cancellation_reasons: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      cs_cancellations: {
        Row: {
          client_id: string
          created_at: string
          effective_cancel_date: string
          id: string
          notes_rich: string | null
          offer_applied: string | null
          retention_attempted: boolean
        }
        Insert: {
          client_id: string
          created_at?: string
          effective_cancel_date: string
          id?: string
          notes_rich?: string | null
          offer_applied?: string | null
          retention_attempted?: boolean
        }
        Update: {
          client_id?: string
          created_at?: string
          effective_cancel_date?: string
          id?: string
          notes_rich?: string | null
          offer_applied?: string | null
          retention_attempted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cs_cancellations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_churn_events: {
        Row: {
          cancel_date: string
          client_id: string
          created_at: string
          id: string
          lifetime_days: number | null
          mrr_lost: number
          notes_rich: string | null
          owner_member_id: string | null
          previous_nps: number | null
          reason: string
          retention_attempted: boolean
          retention_offer: string | null
          retention_result: string | null
          sub_reason: string | null
        }
        Insert: {
          cancel_date: string
          client_id: string
          created_at?: string
          id?: string
          lifetime_days?: number | null
          mrr_lost?: number
          notes_rich?: string | null
          owner_member_id?: string | null
          previous_nps?: number | null
          reason: string
          retention_attempted?: boolean
          retention_offer?: string | null
          retention_result?: string | null
          sub_reason?: string | null
        }
        Update: {
          cancel_date?: string
          client_id?: string
          created_at?: string
          id?: string
          lifetime_days?: number | null
          mrr_lost?: number
          notes_rich?: string | null
          owner_member_id?: string | null
          previous_nps?: number | null
          reason?: string
          retention_attempted?: boolean
          retention_offer?: string | null
          retention_result?: string | null
          sub_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_churn_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_churn_events_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_client_health_scores: {
        Row: {
          calculated_at: string
          client_id: string
          created_at: string
          id: string
          main_reason: string | null
          score: number
          signals: Json
          status: string
        }
        Insert: {
          calculated_at?: string
          client_id: string
          created_at?: string
          id?: string
          main_reason?: string | null
          score: number
          signals?: Json
          status: string
        }
        Update: {
          calculated_at?: string
          client_id?: string
          created_at?: string
          id?: string
          main_reason?: string | null
          score?: number
          signals?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_client_health_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_client_onboarding: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          expected_end_at: string | null
          flow_id: string
          id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          expected_end_at?: string | null
          flow_id: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          expected_end_at?: string | null
          flow_id?: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_client_onboarding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_client_onboarding_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "cs_onboarding_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_client_onboarding_tasks: {
        Row: {
          client_onboarding_id: string
          completed_at: string | null
          created_at: string
          description_rich: string | null
          due_at: string | null
          id: string
          notes_rich: string | null
          required: boolean
          responsible_member_id: string | null
          responsible_role_key: string
          sort_order: number
          status: string
          template_task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_onboarding_id: string
          completed_at?: string | null
          created_at?: string
          description_rich?: string | null
          due_at?: string | null
          id?: string
          notes_rich?: string | null
          required?: boolean
          responsible_member_id?: string | null
          responsible_role_key?: string
          sort_order?: number
          status?: string
          template_task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_onboarding_id?: string
          completed_at?: string | null
          created_at?: string
          description_rich?: string | null
          due_at?: string | null
          id?: string
          notes_rich?: string | null
          required?: boolean
          responsible_member_id?: string | null
          responsible_role_key?: string
          sort_order?: number
          status?: string
          template_task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_client_onboarding_tasks_client_onboarding_id_fkey"
            columns: ["client_onboarding_id"]
            isOneToOne: false
            referencedRelation: "cs_client_onboarding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_client_onboarding_tasks_responsible_member_id_fkey"
            columns: ["responsible_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_client_onboarding_tasks_template_task_id_fkey"
            columns: ["template_task_id"]
            isOneToOne: false
            referencedRelation: "cs_onboarding_flow_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_health_weights: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          signal_key: string
          signal_label: string
          threshold_days: number | null
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          signal_key: string
          signal_label: string
          threshold_days?: number | null
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          signal_key?: string
          signal_label?: string
          threshold_days?: number | null
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      cs_meeting_actions: {
        Row: {
          assignee_member_id: string | null
          created_at: string
          details_rich: string | null
          due_at: string | null
          id: string
          meeting_id: string
          responsible_role_key: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_member_id?: string | null
          created_at?: string
          details_rich?: string | null
          due_at?: string | null
          id?: string
          meeting_id: string
          responsible_role_key?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_member_id?: string | null
          created_at?: string
          details_rich?: string | null
          due_at?: string | null
          id?: string
          meeting_id?: string
          responsible_role_key?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_meeting_actions_assignee_member_id_fkey"
            columns: ["assignee_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_meeting_actions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "cs_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_meetings: {
        Row: {
          client_id: string
          created_at: string
          decisions_rich: string | null
          id: string
          meeting_date: string
          objective_rich: string | null
          perception: string | null
          responsible_member_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          decisions_rich?: string | null
          id?: string
          meeting_date: string
          objective_rich?: string | null
          perception?: string | null
          responsible_member_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          decisions_rich?: string | null
          id?: string
          meeting_date?: string
          objective_rich?: string | null
          perception?: string | null
          responsible_member_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_meetings_responsible_member_id_fkey"
            columns: ["responsible_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_nps_response_tags: {
        Row: {
          created_at: string
          id: string
          response_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          response_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          response_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_nps_response_tags_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "cs_nps_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_nps_response_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "cs_nps_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_nps_responses: {
        Row: {
          classification: string
          client_id: string
          comment_rich: string | null
          created_at: string
          id: string
          score: number
          survey_id: string | null
        }
        Insert: {
          classification: string
          client_id: string
          comment_rich?: string | null
          created_at?: string
          id?: string
          score: number
          survey_id?: string | null
        }
        Update: {
          classification?: string
          client_id?: string
          comment_rich?: string | null
          created_at?: string
          id?: string
          score?: number
          survey_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_nps_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_nps_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "cs_nps_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_nps_surveys: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      cs_nps_tags: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      cs_onboarding_answers: {
        Row: {
          answer_text: string | null
          answer_value_json: Json | null
          answered_by_ai: boolean
          confidence: number | null
          created_at: string
          id: string
          meeting_id: string
          needs_validation: boolean
          question_id: string
          updated_at: string
        }
        Insert: {
          answer_text?: string | null
          answer_value_json?: Json | null
          answered_by_ai?: boolean
          confidence?: number | null
          created_at?: string
          id?: string
          meeting_id: string
          needs_validation?: boolean
          question_id: string
          updated_at?: string
        }
        Update: {
          answer_text?: string | null
          answer_value_json?: Json | null
          answered_by_ai?: boolean
          confidence?: number | null
          created_at?: string
          id?: string
          meeting_id?: string
          needs_validation?: boolean
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_onboarding_answers_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "cs_onboarding_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_onboarding_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "cs_onboarding_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_onboarding_briefings: {
        Row: {
          briefing_content: Json
          client_id: string
          created_at: string
          cs_notes: string | null
          id: string
          risk_level: string | null
          risk_score: number | null
          status: string
          transcript_id: string | null
          updated_at: string
        }
        Insert: {
          briefing_content?: Json
          client_id: string
          created_at?: string
          cs_notes?: string | null
          id?: string
          risk_level?: string | null
          risk_score?: number | null
          status?: string
          transcript_id?: string | null
          updated_at?: string
        }
        Update: {
          briefing_content?: Json
          client_id?: string
          created_at?: string
          cs_notes?: string | null
          id?: string
          risk_level?: string | null
          risk_score?: number | null
          status?: string
          transcript_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_onboarding_briefings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_onboarding_briefings_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "cs_sales_transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_onboarding_flow_rules: {
        Row: {
          active: boolean
          client_type: string | null
          created_at: string
          flow_id: string
          id: string
          priority: number
          service_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_type?: string | null
          created_at?: string
          flow_id: string
          id?: string
          priority?: number
          service_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_type?: string | null
          created_at?: string
          flow_id?: string
          id?: string
          priority?: number
          service_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_onboarding_flow_rules_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "cs_onboarding_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_onboarding_flow_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_onboarding_flow_tasks: {
        Row: {
          active: boolean
          created_at: string
          default_due_days: number
          default_responsible_role_key: string | null
          description_rich: string | null
          flow_id: string
          id: string
          required: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_due_days?: number
          default_responsible_role_key?: string | null
          description_rich?: string | null
          flow_id: string
          id?: string
          required?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_due_days?: number
          default_responsible_role_key?: string | null
          description_rich?: string | null
          flow_id?: string
          id?: string
          required?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_onboarding_flow_tasks_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "cs_onboarding_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_onboarding_flows: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cs_onboarding_meeting_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          meeting_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          meeting_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          meeting_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_onboarding_meeting_files_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "cs_onboarding_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_onboarding_meeting_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_onboarding_meetings: {
        Row: {
          client_id: string
          created_at: string
          cs_owner_id: string | null
          general_notes: string | null
          id: string
          meeting_date: string
          overall_quality_score: number | null
          risk_level: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          cs_owner_id?: string | null
          general_notes?: string | null
          id?: string
          meeting_date?: string
          overall_quality_score?: number | null
          risk_level?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          cs_owner_id?: string | null
          general_notes?: string | null
          id?: string
          meeting_date?: string
          overall_quality_score?: number | null
          risk_level?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_onboarding_meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_onboarding_meetings_cs_owner_id_fkey"
            columns: ["cs_owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_onboarding_questions: {
        Row: {
          ai_extract_hint: string | null
          answer_key: string | null
          block_key: string
          block_title: string
          created_at: string
          field_type: string
          help_text: string | null
          id: string
          impacts_quality: boolean
          is_active: boolean
          is_decision_field: boolean
          is_required: boolean
          options_json: Json | null
          order_index: number
          placeholder: string | null
          question_text: string
          updated_at: string
          validation_json: Json | null
          weight: number
        }
        Insert: {
          ai_extract_hint?: string | null
          answer_key?: string | null
          block_key: string
          block_title: string
          created_at?: string
          field_type?: string
          help_text?: string | null
          id?: string
          impacts_quality?: boolean
          is_active?: boolean
          is_decision_field?: boolean
          is_required?: boolean
          options_json?: Json | null
          order_index?: number
          placeholder?: string | null
          question_text: string
          updated_at?: string
          validation_json?: Json | null
          weight?: number
        }
        Update: {
          ai_extract_hint?: string | null
          answer_key?: string | null
          block_key?: string
          block_title?: string
          created_at?: string
          field_type?: string
          help_text?: string | null
          id?: string
          impacts_quality?: boolean
          is_active?: boolean
          is_decision_field?: boolean
          is_required?: boolean
          options_json?: Json | null
          order_index?: number
          placeholder?: string | null
          question_text?: string
          updated_at?: string
          validation_json?: Json | null
          weight?: number
        }
        Relationships: []
      }
      cs_onboarding_task_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          onboarding_task_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          onboarding_task_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          onboarding_task_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_onboarding_task_files_onboarding_task_id_fkey"
            columns: ["onboarding_task_id"]
            isOneToOne: false
            referencedRelation: "cs_client_onboarding_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_onboarding_task_history: {
        Row: {
          action: string
          changed_by_member_id: string | null
          created_at: string
          from_value: string | null
          id: string
          onboarding_task_id: string
          to_value: string | null
        }
        Insert: {
          action: string
          changed_by_member_id?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          onboarding_task_id: string
          to_value?: string | null
        }
        Update: {
          action?: string
          changed_by_member_id?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          onboarding_task_id?: string
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_onboarding_task_history_changed_by_member_id_fkey"
            columns: ["changed_by_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_onboarding_task_history_onboarding_task_id_fkey"
            columns: ["onboarding_task_id"]
            isOneToOne: false
            referencedRelation: "cs_client_onboarding_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_onboardings: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          cs_owner_id: string | null
          current_step: number
          id: string
          started_at: string
          status: string
          step_1_status: string
          step_2_status: string
          step_3_status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          cs_owner_id?: string | null
          current_step?: number
          id?: string
          started_at?: string
          status?: string
          step_1_status?: string
          step_2_status?: string
          step_3_status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          cs_owner_id?: string | null
          current_step?: number
          id?: string
          started_at?: string
          status?: string
          step_1_status?: string
          step_2_status?: string
          step_3_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_onboardings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_onboardings_cs_owner_id_fkey"
            columns: ["cs_owner_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_playbook_tasks: {
        Row: {
          assignee_member_id: string | null
          completed_at: string | null
          created_at: string
          description_rich: string | null
          due_at: string | null
          id: string
          playbook_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_member_id?: string | null
          completed_at?: string | null
          created_at?: string
          description_rich?: string | null
          due_at?: string | null
          id?: string
          playbook_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_member_id?: string | null
          completed_at?: string | null
          created_at?: string
          description_rich?: string | null
          due_at?: string | null
          id?: string
          playbook_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_playbook_tasks_assignee_member_id_fkey"
            columns: ["assignee_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_playbook_tasks_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "cs_playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_playbooks: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          notes_rich: string | null
          responsible_member_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notes_rich?: string | null
          responsible_member_id?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notes_rich?: string | null
          responsible_member_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_playbooks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_playbooks_responsible_member_id_fkey"
            columns: ["responsible_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_risk_action_items: {
        Row: {
          assignee_member_id: string | null
          created_at: string
          details_rich: string | null
          due_at: string | null
          id: string
          responsible_role_key: string
          risk_case_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_member_id?: string | null
          created_at?: string
          details_rich?: string | null
          due_at?: string | null
          id?: string
          responsible_role_key?: string
          risk_case_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_member_id?: string | null
          created_at?: string
          details_rich?: string | null
          due_at?: string | null
          id?: string
          responsible_role_key?: string
          risk_case_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_risk_action_items_assignee_member_id_fkey"
            columns: ["assignee_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_risk_action_items_risk_case_id_fkey"
            columns: ["risk_case_id"]
            isOneToOne: false
            referencedRelation: "cs_risk_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_risk_cases: {
        Row: {
          client_id: string
          created_at: string
          details_rich: string | null
          due_at: string | null
          id: string
          level: string
          owner_member_id: string | null
          reason: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          details_rich?: string | null
          due_at?: string | null
          id?: string
          level?: string
          owner_member_id?: string | null
          reason: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          details_rich?: string | null
          due_at?: string | null
          id?: string
          level?: string
          owner_member_id?: string | null
          reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_risk_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_risk_cases_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_sales_transcripts: {
        Row: {
          client_id: string
          created_at: string
          created_by_member_id: string | null
          id: string
          transcript_text: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by_member_id?: string | null
          id?: string
          transcript_text: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by_member_id?: string | null
          id?: string
          transcript_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_sales_transcripts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_sales_transcripts_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      cs_transcripts: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          onboarding_id: string | null
          source: string
          transcript_text: string
          transcript_type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          onboarding_id?: string | null
          source?: string
          transcript_text: string
          transcript_type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          onboarding_id?: string | null
          source?: string
          transcript_text?: string
          transcript_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_transcripts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_transcripts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_transcripts_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "cs_onboardings"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          unit: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          unit?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          unit?: string | null
        }
        Relationships: []
      }
      job_roles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      member_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          member_id: string
          permission_key: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          member_id: string
          permission_key: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          member_id?: string
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_permissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      meta_ad_account_snapshots: {
        Row: {
          ad_account_id: string
          amount_spent: number | null
          available_balance: number | null
          fetched_at: string
          id: string
          raw_json: Json | null
          spend_cap: number | null
        }
        Insert: {
          ad_account_id: string
          amount_spent?: number | null
          available_balance?: number | null
          fetched_at?: string
          id?: string
          raw_json?: Json | null
          spend_cap?: number | null
        }
        Update: {
          ad_account_id?: string
          amount_spent?: number | null
          available_balance?: number | null
          fetched_at?: string
          id?: string
          raw_json?: Json | null
          spend_cap?: number | null
        }
        Relationships: []
      }
      meta_bm_ad_accounts: {
        Row: {
          ad_account_id: string
          created_at: string
          currency: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          created_at?: string
          currency?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      meta_bm_connection: {
        Row: {
          access_token_encrypted: string
          business_id: string
          created_at: string
          id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted: string
          business_id: string
          created_at?: string
          id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string
          business_id?: string
          created_at?: string
          id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      niches: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      personal_notes: {
        Row: {
          completed: boolean
          content: string
          created_at: string
          id: string
          member_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          completed?: boolean
          content: string
          created_at?: string
          id?: string
          member_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          completed?: boolean
          content?: string
          created_at?: string
          id?: string
          member_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_notes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      petron_funnel_benchmarks: {
        Row: {
          bad_threshold: number
          created_at: string
          good_threshold: number
          id: string
          is_higher_better: boolean
          is_percentage: boolean
          metric_key: string
          metric_label: string
          regular_threshold: number
          updated_at: string
        }
        Insert: {
          bad_threshold: number
          created_at?: string
          good_threshold: number
          id?: string
          is_higher_better?: boolean
          is_percentage?: boolean
          metric_key: string
          metric_label: string
          regular_threshold: number
          updated_at?: string
        }
        Update: {
          bad_threshold?: number
          created_at?: string
          good_threshold?: number
          id?: string
          is_higher_better?: boolean
          is_percentage?: boolean
          metric_key?: string
          metric_label?: string
          regular_threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      petron_sales_funnel_actuals: {
        Row: {
          appointments_actual: number | null
          avg_ticket_actual: number | null
          cpl_actual: number | null
          created_at: string
          created_by: string | null
          id: string
          investment_actual: number | null
          leads_actual: number | null
          meetings_held_actual: number | null
          month: string
          notes: string | null
          rate_attendance_actual: number | null
          rate_close_actual: number | null
          rate_scheduling_actual: number | null
          revenue_actual: number | null
          roas_actual: number | null
          sales_actual: number | null
          updated_at: string
        }
        Insert: {
          appointments_actual?: number | null
          avg_ticket_actual?: number | null
          cpl_actual?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          investment_actual?: number | null
          leads_actual?: number | null
          meetings_held_actual?: number | null
          month: string
          notes?: string | null
          rate_attendance_actual?: number | null
          rate_close_actual?: number | null
          rate_scheduling_actual?: number | null
          revenue_actual?: number | null
          roas_actual?: number | null
          sales_actual?: number | null
          updated_at?: string
        }
        Update: {
          appointments_actual?: number | null
          avg_ticket_actual?: number | null
          cpl_actual?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          investment_actual?: number | null
          leads_actual?: number | null
          meetings_held_actual?: number | null
          month?: string
          notes?: string | null
          rate_attendance_actual?: number | null
          rate_close_actual?: number | null
          rate_scheduling_actual?: number | null
          revenue_actual?: number | null
          roas_actual?: number | null
          sales_actual?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      petron_sales_funnel_targets: {
        Row: {
          appointments_target: number | null
          avg_ticket_target: number | null
          cpl_target: number | null
          created_at: string
          created_by: string | null
          id: string
          investment_target: number | null
          leads_target: number | null
          meetings_held_target: number | null
          month: string
          notes: string | null
          rate_attendance_target: number | null
          rate_close_target: number | null
          rate_scheduling_target: number | null
          revenue_target: number | null
          roas_target: number | null
          sales_target: number | null
          updated_at: string
        }
        Insert: {
          appointments_target?: number | null
          avg_ticket_target?: number | null
          cpl_target?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          investment_target?: number | null
          leads_target?: number | null
          meetings_held_target?: number | null
          month: string
          notes?: string | null
          rate_attendance_target?: number | null
          rate_close_target?: number | null
          rate_scheduling_target?: number | null
          revenue_target?: number | null
          roas_target?: number | null
          sales_target?: number | null
          updated_at?: string
        }
        Update: {
          appointments_target?: number | null
          avg_ticket_target?: number | null
          cpl_target?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          investment_target?: number | null
          leads_target?: number | null
          meetings_held_target?: number | null
          month?: string
          notes?: string | null
          rate_attendance_target?: number | null
          rate_close_target?: number | null
          rate_scheduling_target?: number | null
          revenue_target?: number | null
          roas_target?: number | null
          sales_target?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      post_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          post_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission_key: string
          role_key: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_key: string
          role_key: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_key?: string
          role_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      route_permissions: {
        Row: {
          action: string
          category: string
          created_at: string
          id: string
          is_sensitive: boolean
          key: string
          label: string
          module: string
          path: string
          route_id: string
        }
        Insert: {
          action: string
          category: string
          created_at?: string
          id?: string
          is_sensitive?: boolean
          key: string
          label: string
          module: string
          path: string
          route_id: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          id?: string
          is_sensitive?: boolean
          key?: string
          label?: string
          module?: string
          path?: string
          route_id?: string
        }
        Relationships: []
      }
      service_deliverables: {
        Row: {
          created_at: string
          deliverable_id: string
          id: string
          notes: string | null
          quantity: number
          service_id: string
        }
        Insert: {
          created_at?: string
          deliverable_id: string
          id?: string
          notes?: string | null
          quantity?: number
          service_id: string
        }
        Update: {
          created_at?: string
          deliverable_id?: string
          id?: string
          notes?: string | null
          quantity?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_deliverables_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_deliverables_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          has_content: boolean
          has_traffic: boolean
          id: string
          name: string
          traffic_cycle_id: string | null
          traffic_routine_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          has_content?: boolean
          has_traffic?: boolean
          id?: string
          name: string
          traffic_cycle_id?: string | null
          traffic_routine_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          has_content?: boolean
          has_traffic?: boolean
          id?: string
          name?: string
          traffic_cycle_id?: string | null
          traffic_routine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_traffic_cycle_id_fkey"
            columns: ["traffic_cycle_id"]
            isOneToOne: false
            referencedRelation: "traffic_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_traffic_routine_id_fkey"
            columns: ["traffic_routine_id"]
            isOneToOne: false
            referencedRelation: "traffic_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          account_id: string | null
          created_at: string
          due_date: string | null
          id: string
          status: string
          title: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          status?: string
          title: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          active: boolean
          admission_date: string | null
          auth_user_id: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          name: string
          profile_completed_at: string | null
          profile_photo_path: string | null
          role_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          admission_date?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          name: string
          profile_completed_at?: string | null
          profile_photo_path?: string | null
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          admission_date?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          name?: string
          profile_completed_at?: string | null
          profile_photo_path?: string | null
          role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_alert_rules: {
        Row: {
          action_hint: string | null
          condition: string
          created_at: string
          id: string
          is_active: boolean
          message: string
          metric_slug: string
          name: string
          severity: string
          threshold: number | null
          updated_at: string
          window_days: number
        }
        Insert: {
          action_hint?: string | null
          condition?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          metric_slug: string
          name: string
          severity?: string
          threshold?: number | null
          updated_at?: string
          window_days?: number
        }
        Update: {
          action_hint?: string | null
          condition?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          metric_slug?: string
          name?: string
          severity?: string
          threshold?: number | null
          updated_at?: string
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "traffic_alert_rules_metric_slug_fkey"
            columns: ["metric_slug"]
            isOneToOne: false
            referencedRelation: "traffic_metric_catalog"
            referencedColumns: ["slug"]
          },
        ]
      }
      traffic_creative_request_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          public_url: string | null
          request_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          public_url?: string | null
          request_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          public_url?: string | null
          request_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_creative_request_files_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "traffic_creative_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_creative_requests: {
        Row: {
          assignee_id: string | null
          brief_rich: string | null
          brief_title: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          format: string
          id: string
          month_ref: string
          objective: string | null
          priority: string
          requested_by_member_id: string | null
          requested_by_role_key: string
          responsible_role_key: string
          reviewer_member_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          brief_rich?: string | null
          brief_title?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          format?: string
          id?: string
          month_ref: string
          objective?: string | null
          priority?: string
          requested_by_member_id?: string | null
          requested_by_role_key?: string
          responsible_role_key?: string
          reviewer_member_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          brief_rich?: string | null
          brief_title?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          format?: string
          id?: string
          month_ref?: string
          objective?: string | null
          priority?: string
          requested_by_member_id?: string | null
          requested_by_role_key?: string
          responsible_role_key?: string
          reviewer_member_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_creative_requests_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_creative_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_creative_requests_requested_by_member_id_fkey"
            columns: ["requested_by_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_creative_requests_reviewer_member_id_fkey"
            columns: ["reviewer_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_cycle_routines: {
        Row: {
          active: boolean
          created_at: string
          cycle_id: string
          description: string | null
          frequency: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cycle_id: string
          description?: string | null
          frequency: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cycle_id?: string
          description?: string | null
          frequency?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_cycle_routines_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "traffic_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_cycle_tasks: {
        Row: {
          active: boolean
          created_at: string
          cycle_id: string
          default_priority: string
          details: string | null
          due_offset_days: number
          id: string
          task_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cycle_id: string
          default_priority?: string
          details?: string | null
          due_offset_days?: number
          id?: string
          task_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cycle_id?: string
          default_priority?: string
          details?: string | null
          due_offset_days?: number
          id?: string
          task_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_cycle_tasks_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "traffic_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_cycles: {
        Row: {
          active: boolean
          cadence_days: number
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cadence_days: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cadence_days?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      traffic_dashboard_layout: {
        Row: {
          cards: Json
          columns: Json
          created_at: string
          id: string
          objective: string | null
          scope: string
          updated_at: string
        }
        Insert: {
          cards?: Json
          columns?: Json
          created_at?: string
          id?: string
          objective?: string | null
          scope?: string
          updated_at?: string
        }
        Update: {
          cards?: Json
          columns?: Json
          created_at?: string
          id?: string
          objective?: string | null
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      traffic_metric_catalog: {
        Row: {
          availability_objectives: Json | null
          availability_platforms: Json | null
          category: string
          created_at: string
          default_order: number
          dependencies: Json | null
          description: string | null
          formula: string | null
          id: string
          is_active: boolean
          metric_type: string
          name: string
          slug: string
          source: string
          unit: string
          updated_at: string
          visible_for_managers: boolean
        }
        Insert: {
          availability_objectives?: Json | null
          availability_platforms?: Json | null
          category?: string
          created_at?: string
          default_order?: number
          dependencies?: Json | null
          description?: string | null
          formula?: string | null
          id?: string
          is_active?: boolean
          metric_type?: string
          name: string
          slug: string
          source?: string
          unit?: string
          updated_at?: string
          visible_for_managers?: boolean
        }
        Update: {
          availability_objectives?: Json | null
          availability_platforms?: Json | null
          category?: string
          created_at?: string
          default_order?: number
          dependencies?: Json | null
          description?: string | null
          formula?: string | null
          id?: string
          is_active?: boolean
          metric_type?: string
          name?: string
          slug?: string
          source?: string
          unit?: string
          updated_at?: string
          visible_for_managers?: boolean
        }
        Relationships: []
      }
      traffic_metric_targets: {
        Row: {
          better_when: string
          created_at: string
          green_max: number | null
          green_min: number | null
          id: string
          invest_max: number | null
          invest_min: number | null
          metric_slug: string
          niche_id: string | null
          objective: string | null
          red_max: number | null
          red_min: number | null
          scope: string
          updated_at: string
          yellow_max: number | null
          yellow_min: number | null
        }
        Insert: {
          better_when?: string
          created_at?: string
          green_max?: number | null
          green_min?: number | null
          id?: string
          invest_max?: number | null
          invest_min?: number | null
          metric_slug: string
          niche_id?: string | null
          objective?: string | null
          red_max?: number | null
          red_min?: number | null
          scope?: string
          updated_at?: string
          yellow_max?: number | null
          yellow_min?: number | null
        }
        Update: {
          better_when?: string
          created_at?: string
          green_max?: number | null
          green_min?: number | null
          id?: string
          invest_max?: number | null
          invest_min?: number | null
          metric_slug?: string
          niche_id?: string | null
          objective?: string | null
          red_max?: number | null
          red_min?: number | null
          scope?: string
          updated_at?: string
          yellow_max?: number | null
          yellow_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "traffic_metric_targets_metric_slug_fkey"
            columns: ["metric_slug"]
            isOneToOne: false
            referencedRelation: "traffic_metric_catalog"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "traffic_metric_targets_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_periods: {
        Row: {
          client_id: string
          created_at: string
          cycle_id: string
          id: string
          period_end: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          cycle_id: string
          id?: string
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          cycle_id?: string
          id?: string
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_periods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_periods_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "traffic_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_routine_cycles: {
        Row: {
          active: boolean
          anchor_rule: string | null
          created_at: string
          cycle_id: string
          frequency: string
          id: string
          routine_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          anchor_rule?: string | null
          created_at?: string
          cycle_id: string
          frequency: string
          id?: string
          routine_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          anchor_rule?: string | null
          created_at?: string
          cycle_id?: string
          frequency?: string
          id?: string
          routine_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_routine_cycles_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "traffic_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_routine_cycles_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "traffic_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_routine_tasks: {
        Row: {
          active: boolean
          created_at: string
          default_priority: string
          details: string | null
          due_offset_days: number
          id: string
          routine_id: string
          task_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_priority?: string
          details?: string | null
          due_offset_days?: number
          id?: string
          routine_id: string
          task_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_priority?: string
          details?: string | null
          due_offset_days?: number
          id?: string
          routine_id?: string
          task_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_routine_tasks_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "traffic_cycle_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_routines: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      traffic_saved_views: {
        Row: {
          columns_json: Json
          created_at: string
          filters_json: Json
          id: string
          name: string
          user_id: string
        }
        Insert: {
          columns_json?: Json
          created_at?: string
          filters_json?: Json
          id?: string
          name: string
          user_id: string
        }
        Update: {
          columns_json?: Json
          created_at?: string
          filters_json?: Json
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_saved_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_scores: {
        Row: {
          config_json: Json
          created_at: string
          green_threshold: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
          yellow_threshold: number
        }
        Insert: {
          config_json?: Json
          created_at?: string
          green_threshold?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          yellow_threshold?: number
        }
        Update: {
          config_json?: Json
          created_at?: string
          green_threshold?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          yellow_threshold?: number
        }
        Relationships: []
      }
      traffic_tasks: {
        Row: {
          assignee_id: string | null
          client_id: string
          created_at: string
          details: string | null
          due_date: string | null
          id: string
          period_id: string
          priority: string
          routine_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          client_id: string
          created_at?: string
          details?: string | null
          due_date?: string | null
          id?: string
          period_id: string
          priority?: string
          routine_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          client_id?: string
          created_at?: string
          details?: string | null
          due_date?: string | null
          id?: string
          period_id?: string
          priority?: string
          routine_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_tasks_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "traffic_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_tasks_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "traffic_cycle_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          layout: Json
          page_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout?: Json
          page_key?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout?: Json
          page_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_note_events: {
        Row: {
          actor_member_id: string | null
          created_at: string
          event_type: string
          id: string
          note_id: string
          payload: Json | null
        }
        Insert: {
          actor_member_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          note_id: string
          payload?: Json | null
        }
        Update: {
          actor_member_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          note_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_note_events_actor_member_id_fkey"
            columns: ["actor_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_note_events_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "user_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notes: {
        Row: {
          content: string | null
          created_at: string
          due_date: string | null
          id: string
          member_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          member_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          member_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed: boolean
          created_at?: string
          id?: string
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      petron_sales_funnel_kpis_monthly: {
        Row: {
          actual_notes: string | null
          appointments_actual: number | null
          appointments_target: number | null
          avg_ticket_actual: number | null
          avg_ticket_target: number | null
          conv_appointments_to_meetings: number | null
          conv_leads_to_appointments: number | null
          conv_leads_to_sales: number | null
          conv_meetings_to_sales: number | null
          cpl_actual: number | null
          cpl_target: number | null
          investment_actual: number | null
          investment_target: number | null
          leads_achievement: number | null
          leads_actual: number | null
          leads_mom_change: number | null
          leads_target: number | null
          meetings_held_actual: number | null
          meetings_held_target: number | null
          meetings_mom_change: number | null
          month: string | null
          rate_attendance_actual: number | null
          rate_attendance_target: number | null
          rate_close_actual: number | null
          rate_close_target: number | null
          rate_scheduling_actual: number | null
          rate_scheduling_target: number | null
          revenue_achievement: number | null
          revenue_actual: number | null
          revenue_target: number | null
          roas_achievement: number | null
          roas_actual: number | null
          roas_mom_change: number | null
          roas_target: number | null
          sales_achievement: number | null
          sales_actual: number | null
          sales_mom_change: number | null
          sales_target: number | null
          target_notes: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_edit_commercial: { Args: { _user_id: string }; Returns: boolean }
      can_view_commercial: { Args: { _user_id: string }; Returns: boolean }
      generate_contract_number: { Args: never; Returns: string }
      get_batch_status: { Args: { p_batch_id: string }; Returns: string }
      get_client_id_from_batch: {
        Args: { p_batch_id: string }
        Returns: string
      }
      get_client_id_from_meeting: {
        Args: { p_meeting_id: string }
        Returns: string
      }
      get_client_id_from_onboarding: {
        Args: { p_onboarding_id: string }
        Returns: string
      }
      get_client_id_from_risk_case: {
        Args: { p_risk_case_id: string }
        Returns: string
      }
      get_current_member_id: { Args: never; Returns: string }
      get_role_key_from_format: { Args: { p_format: string }; Returns: string }
      get_stage_default_role_key: {
        Args: { p_stage_key: string }
        Returns: string
      }
      has_commercial_role: {
        Args: {
          _role: Database["public"]["Enums"]["commercial_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _auth_user_id: string }; Returns: boolean }
      reassign_batch_posts_by_format: {
        Args: { p_batch_id: string }
        Returns: Json
      }
      resolve_assignee_from_account_team: {
        Args: { p_client_id: string; p_responsible_role_key: string }
        Returns: string
      }
      update_onboarding_step: {
        Args: { p_client_id: string; p_new_status: string; p_step: number }
        Returns: {
          client_id: string
          completed_at: string | null
          created_at: string
          cs_owner_id: string | null
          current_step: number
          id: string
          started_at: string
          status: string
          step_1_status: string
          step_2_status: string
          step_3_status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cs_onboardings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      commercial_role: "admin" | "commercial_manager" | "viewer"
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
      commercial_role: ["admin", "commercial_manager", "viewer"],
    },
  },
} as const
