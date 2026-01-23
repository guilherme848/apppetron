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
          designer_member_id: string | null
          id: string
          monthly_value: number | null
          name: string
          neighborhood: string | null
          niche: string | null
          niche_id: string | null
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
          designer_member_id?: string | null
          id?: string
          monthly_value?: number | null
          name: string
          neighborhood?: string | null
          niche?: string | null
          niche_id?: string | null
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
          designer_member_id?: string | null
          id?: string
          monthly_value?: number | null
          name?: string
          neighborhood?: string | null
          niche?: string | null
          niche_id?: string | null
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
          id: string
          role_id: string | null
          stage_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id?: string | null
          stage_key: string
        }
        Update: {
          created_at?: string
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
          id: string
          name: string
          traffic_cycle_id: string | null
          traffic_routine_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          traffic_cycle_id?: string | null
          traffic_routine_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      is_admin: { Args: { _auth_user_id: string }; Returns: boolean }
      resolve_assignee_from_account_team: {
        Args: { p_client_id: string; p_responsible_role_key: string }
        Returns: string
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
