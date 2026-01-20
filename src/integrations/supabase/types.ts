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
          updated_at: string | null
          videomaker_member_id: string | null
          website: string | null
        }
        Insert: {
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
          updated_at?: string | null
          videomaker_member_id?: string | null
          website?: string | null
        }
        Update: {
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
      content_posts: {
        Row: {
          assignee_id: string | null
          batch_id: string
          briefing: string | null
          caption: string | null
          channel: string | null
          created_at: string
          due_date: string | null
          format: string | null
          id: string
          item_type: string | null
          responsible_role_id: string | null
          responsible_role_key: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          batch_id: string
          briefing?: string | null
          caption?: string | null
          channel?: string | null
          created_at?: string
          due_date?: string | null
          format?: string | null
          id?: string
          item_type?: string | null
          responsible_role_id?: string | null
          responsible_role_key?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          batch_id?: string
          briefing?: string | null
          caption?: string | null
          channel?: string | null
          created_at?: string
          due_date?: string | null
          format?: string | null
          id?: string
          item_type?: string | null
          responsible_role_id?: string | null
          responsible_role_key?: string | null
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
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          traffic_cycle_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          traffic_cycle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_traffic_cycle_id_fkey"
            columns: ["traffic_cycle_id"]
            isOneToOne: false
            referencedRelation: "traffic_cycles"
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
          created_at: string
          email: string | null
          id: string
          name: string
          role_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
