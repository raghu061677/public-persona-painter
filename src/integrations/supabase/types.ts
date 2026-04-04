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
      access_requests: {
        Row: {
          created_at: string
          current_roles: Json | null
          denial_reason: string | null
          id: string
          requested_action: string
          requested_module: string
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_roles?: Json | null
          denial_reason?: string | null
          id?: string
          requested_action: string
          requested_module: string
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_roles?: Json | null
          denial_reason?: string | null
          id?: string
          requested_action?: string
          requested_module?: string
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistant_logs: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          intent: string | null
          query_text: string
          response_time_ms: number | null
          response_type: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          query_text: string
          response_time_ms?: number | null
          response_type?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          query_text?: string
          response_time_ms?: number | null
          response_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          company_id: string | null
          confidence_score: number | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          is_dismissed: boolean | null
          recommendation_text: string
          recommendation_type: string
        }
        Insert: {
          company_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          is_dismissed?: boolean | null
          recommendation_text: string
          recommendation_type: string
        }
        Update: {
          company_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          is_dismissed?: boolean | null
          recommendation_text?: string
          recommendation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_email_templates: {
        Row: {
          body_template: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          subject_template: string
          template_key: string
          updated_at: string
        }
        Insert: {
          body_template: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          subject_template: string
          template_key: string
          updated_at?: string
        }
        Update: {
          body_template?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          subject_template?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      alert_log: {
        Row: {
          alert_date: string
          alert_type: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          alert_date: string
          alert_type: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          alert_date?: string
          alert_type?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      alert_settings: {
        Row: {
          budget_variance_threshold: number
          created_at: string | null
          id: string
          schedule_critical_days: number
          schedule_warning_days: number
          updated_at: string | null
          updated_by: string | null
          verification_delay_critical_days: number
          verification_delay_warning_days: number
          verification_lag_threshold: number
        }
        Insert: {
          budget_variance_threshold?: number
          created_at?: string | null
          id?: string
          schedule_critical_days?: number
          schedule_warning_days?: number
          updated_at?: string | null
          updated_by?: string | null
          verification_delay_critical_days?: number
          verification_delay_warning_days?: number
          verification_lag_threshold?: number
        }
        Update: {
          budget_variance_threshold?: number
          created_at?: string | null
          id?: string
          schedule_critical_days?: number
          schedule_warning_days?: number
          updated_at?: string | null
          updated_by?: string | null
          verification_delay_critical_days?: number
          verification_delay_warning_days?: number
          verification_lag_threshold?: number
        }
        Relationships: []
      }
      analytics_daily: {
        Row: {
          created_at: string | null
          date: string
          expenses_by_category: Json | null
          fy: string
          occupancy: Json | null
          revenue_by_city: Json | null
          revenue_by_client: Json | null
          totals: Json | null
          updated_at: string | null
          vacant_by_city: Json | null
        }
        Insert: {
          created_at?: string | null
          date: string
          expenses_by_category?: Json | null
          fy: string
          occupancy?: Json | null
          revenue_by_city?: Json | null
          revenue_by_client?: Json | null
          totals?: Json | null
          updated_at?: string | null
          vacant_by_city?: Json | null
        }
        Update: {
          created_at?: string | null
          date?: string
          expenses_by_category?: Json | null
          fy?: string
          occupancy?: Json | null
          revenue_by_city?: Json | null
          revenue_by_client?: Json | null
          totals?: Json | null
          updated_at?: string | null
          vacant_by_city?: Json | null
        }
        Relationships: []
      }
      approval_delegations: {
        Row: {
          created_at: string | null
          delegate_id: string
          delegator_id: string
          end_date: string
          id: string
          is_active: boolean | null
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delegate_id: string
          delegator_id: string
          end_date: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          role: Database["public"]["Enums"]["app_role"]
          start_date?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delegate_id?: string
          delegator_id?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      approval_rules: {
        Row: {
          client_type: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_amount: number | null
          min_amount: number | null
          min_discount_percent: number | null
          name: string
          plan_type: string | null
          priority: number | null
          require_director_approval: boolean | null
          require_finance_approval: boolean | null
          require_operations_approval: boolean | null
          require_sales_approval: boolean | null
          updated_at: string | null
        }
        Insert: {
          client_type?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          min_discount_percent?: number | null
          name: string
          plan_type?: string | null
          priority?: number | null
          require_director_approval?: boolean | null
          require_finance_approval?: boolean | null
          require_operations_approval?: boolean | null
          require_sales_approval?: boolean | null
          updated_at?: string | null
        }
        Update: {
          client_type?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          min_discount_percent?: number | null
          name?: string
          plan_type?: string | null
          priority?: number | null
          require_director_approval?: boolean | null
          require_finance_approval?: boolean | null
          require_operations_approval?: boolean | null
          require_sales_approval?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_settings: {
        Row: {
          approval_levels: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          max_amount: number | null
          min_amount: number
          plan_type: Database["public"]["Enums"]["plan_type"]
          updated_at: string | null
        }
        Insert: {
          approval_levels?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number
          plan_type: Database["public"]["Enums"]["plan_type"]
          updated_at?: string | null
        }
        Update: {
          approval_levels?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number
          plan_type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      asset_bookings: {
        Row: {
          asset_id: string
          booking_end_date: string | null
          booking_start_date: string | null
          booking_status: string | null
          booking_type: string
          campaign_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          end_date: string
          id: string
          notes: string | null
          plan_id: string | null
          priority: number | null
          source_id: string | null
          source_item_id: string | null
          source_type: string | null
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          booking_end_date?: string | null
          booking_start_date?: string | null
          booking_status?: string | null
          booking_type: string
          campaign_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date: string
          id?: string
          notes?: string | null
          plan_id?: string | null
          priority?: number | null
          source_id?: string | null
          source_item_id?: string | null
          source_type?: string | null
          start_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          booking_end_date?: string | null
          booking_start_date?: string | null
          booking_status?: string | null
          booking_type?: string
          campaign_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          plan_id?: string | null
          priority?: number | null
          source_id?: string | null
          source_item_id?: string | null
          source_type?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_bookings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_bookings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_bookings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_bookings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_bookings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "asset_bookings_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_bookings_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_demand_scores: {
        Row: {
          asset_id: string
          bookings_last_12_months: number | null
          company_id: string | null
          demand_score: number | null
          id: string
          revenue_generated: number | null
          updated_at: string | null
          vacancy_days: number | null
        }
        Insert: {
          asset_id: string
          bookings_last_12_months?: number | null
          company_id?: string | null
          demand_score?: number | null
          id?: string
          revenue_generated?: number | null
          updated_at?: string | null
          vacancy_days?: number | null
        }
        Update: {
          asset_id?: string
          bookings_last_12_months?: number | null
          company_id?: string | null
          demand_score?: number | null
          id?: string
          revenue_generated?: number | null
          updated_at?: string | null
          vacancy_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_demand_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_expenses: {
        Row: {
          amount: number
          asset_id: string
          category: string
          created_at: string | null
          created_by: string | null
          description: string
          expense_date: string
          id: string
          metadata: Json | null
          notes: string | null
          payment_date: string | null
          payment_status: string | null
          receipt_url: string | null
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          asset_id: string
          category: string
          created_at?: string | null
          created_by?: string | null
          description: string
          expense_date: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_date?: string | null
          payment_status?: string | null
          receipt_url?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          asset_id?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_date?: string | null
          payment_status?: string | null
          receipt_url?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
        ]
      }
      asset_holds: {
        Row: {
          asset_id: string
          client_id: string | null
          client_name: string | null
          company_id: string
          converted_campaign_id: string | null
          created_at: string
          created_by: string | null
          end_date: string
          hold_type: string
          id: string
          notes: string | null
          priority: number
          source: string | null
          source_plan_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          client_id?: string | null
          client_name?: string | null
          company_id: string
          converted_campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          hold_type: string
          id?: string
          notes?: string | null
          priority?: number
          source?: string | null
          source_plan_id?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          client_id?: string | null
          client_name?: string | null
          company_id?: string
          converted_campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          hold_type?: string
          id?: string
          notes?: string | null
          priority?: number
          source?: string | null
          source_plan_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_holds_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_holds_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_holds_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_holds_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_holds_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_holds_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_holds_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_holds_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_holds_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_holds_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_holds_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_holds_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_holds_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_holds_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_holds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_holds_converted_campaign_id_fkey"
            columns: ["converted_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_holds_converted_campaign_id_fkey"
            columns: ["converted_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_holds_converted_campaign_id_fkey"
            columns: ["converted_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_holds_converted_campaign_id_fkey"
            columns: ["converted_campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_holds_converted_campaign_id_fkey"
            columns: ["converted_campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "asset_holds_source_plan_id_fkey"
            columns: ["source_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_holds_source_plan_id_fkey"
            columns: ["source_plan_id"]
            isOneToOne: false
            referencedRelation: "plans_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance: {
        Row: {
          asset_id: string
          attachments: Json | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          maintenance_date: string
          maintenance_type: string
          notes: string | null
          status: string | null
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          asset_id: string
          attachments?: Json | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          maintenance_date: string
          maintenance_type: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          asset_id?: string
          attachments?: Json | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
        ]
      }
      asset_power_bills: {
        Row: {
          acd_amount: number | null
          address: string | null
          anomaly_details: Json | null
          anomaly_type: string | null
          area: string | null
          arrears: number | null
          asset_id: string
          bill_amount: number
          bill_date: string | null
          bill_month: string
          bill_url: string | null
          consumer_address: string | null
          consumer_name: string | null
          created_at: string | null
          created_by: string | null
          current_month_bill: number | null
          direction: string | null
          due_date: string | null
          energy_charges: number | null
          ero: string | null
          ero_name: string | null
          fixed_charges: number | null
          id: string
          is_anomaly: boolean | null
          is_primary_bill: boolean | null
          last_reconciled_at: string | null
          location: string | null
          notes: string | null
          paid: boolean | null
          paid_amount: number | null
          paid_receipt_url: string | null
          payment_date: string | null
          payment_link: string | null
          payment_reference: string | null
          payment_status: string | null
          primary_bill_id: string | null
          section_name: string | null
          service_number: string | null
          share_percentage: number | null
          shared_with_assets: Json | null
          total_due: number | null
          unique_service_number: string | null
          units: number | null
          updated_at: string | null
        }
        Insert: {
          acd_amount?: number | null
          address?: string | null
          anomaly_details?: Json | null
          anomaly_type?: string | null
          area?: string | null
          arrears?: number | null
          asset_id: string
          bill_amount?: number
          bill_date?: string | null
          bill_month: string
          bill_url?: string | null
          consumer_address?: string | null
          consumer_name?: string | null
          created_at?: string | null
          created_by?: string | null
          current_month_bill?: number | null
          direction?: string | null
          due_date?: string | null
          energy_charges?: number | null
          ero?: string | null
          ero_name?: string | null
          fixed_charges?: number | null
          id?: string
          is_anomaly?: boolean | null
          is_primary_bill?: boolean | null
          last_reconciled_at?: string | null
          location?: string | null
          notes?: string | null
          paid?: boolean | null
          paid_amount?: number | null
          paid_receipt_url?: string | null
          payment_date?: string | null
          payment_link?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          primary_bill_id?: string | null
          section_name?: string | null
          service_number?: string | null
          share_percentage?: number | null
          shared_with_assets?: Json | null
          total_due?: number | null
          unique_service_number?: string | null
          units?: number | null
          updated_at?: string | null
        }
        Update: {
          acd_amount?: number | null
          address?: string | null
          anomaly_details?: Json | null
          anomaly_type?: string | null
          area?: string | null
          arrears?: number | null
          asset_id?: string
          bill_amount?: number
          bill_date?: string | null
          bill_month?: string
          bill_url?: string | null
          consumer_address?: string | null
          consumer_name?: string | null
          created_at?: string | null
          created_by?: string | null
          current_month_bill?: number | null
          direction?: string | null
          due_date?: string | null
          energy_charges?: number | null
          ero?: string | null
          ero_name?: string | null
          fixed_charges?: number | null
          id?: string
          is_anomaly?: boolean | null
          is_primary_bill?: boolean | null
          last_reconciled_at?: string | null
          location?: string | null
          notes?: string | null
          paid?: boolean | null
          paid_amount?: number | null
          paid_receipt_url?: string | null
          payment_date?: string | null
          payment_link?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          primary_bill_id?: string | null
          section_name?: string | null
          service_number?: string | null
          share_percentage?: number | null
          shared_with_assets?: Json | null
          total_due?: number | null
          unique_service_number?: string | null
          units?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_power_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_power_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_power_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_power_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_power_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_power_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_power_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_power_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_power_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_power_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_power_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_power_bills_primary_bill_id_fkey"
            columns: ["primary_bill_id"]
            isOneToOne: false
            referencedRelation: "asset_power_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_reminder_settings: {
        Row: {
          buckets_enabled: number[]
          company_id: string
          email_enabled: boolean
          enabled: boolean
          id: string
          last_run_at: string | null
          updated_at: string | null
          updated_by: string | null
          whatsapp_enabled: boolean
        }
        Insert: {
          buckets_enabled?: number[]
          company_id: string
          email_enabled?: boolean
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_enabled?: boolean
        }
        Update: {
          buckets_enabled?: number[]
          company_id?: string
          email_enabled?: boolean
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "auto_reminder_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          execution_time: number | null
          id: string
          rule_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          execution_time?: number | null
          id?: string
          rule_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          execution_time?: number | null
          id?: string
          rule_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json | null
          company_id: string
          conditions: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          rule_name: string
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json | null
          company_id: string
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_name: string
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json | null
          company_id?: string
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_name?: string
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_reminders: {
        Row: {
          bill_id: string
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          recipient: string
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
        }
        Insert: {
          bill_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          recipient: string
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          bill_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          recipient?: string
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_reminders_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "asset_power_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          asset_id: string
          campaign_name: string | null
          client_name: string | null
          created_at: string
          end_date: string
          id: string
          notes: string | null
          owner_company_id: string
          proposed_rate: number
          rejection_reason: string | null
          requested_by: string
          requester_company_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          asset_id: string
          campaign_name?: string | null
          client_name?: string | null
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          owner_company_id: string
          proposed_rate: number
          rejection_reason?: string | null
          requested_by: string
          requester_company_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          asset_id?: string
          campaign_name?: string | null
          client_name?: string | null
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          owner_company_id?: string
          proposed_rate?: number
          rejection_reason?: string | null
          requested_by?: string
          requester_company_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "booking_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "booking_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "booking_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "booking_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "booking_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "booking_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "booking_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "booking_requests_owner_company_id_fkey"
            columns: ["owner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_requester_company_id_fkey"
            columns: ["requester_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_analytics: {
        Row: {
          area_demand_score: number | null
          campaign_id: string
          company_id: string | null
          created_at: string | null
          id: string
          impressions_estimated: number | null
          traffic_score: number | null
          updated_at: string | null
          visibility_score: number | null
        }
        Insert: {
          area_demand_score?: number | null
          campaign_id: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          impressions_estimated?: number | null
          traffic_score?: number | null
          updated_at?: string | null
          visibility_score?: number | null
        }
        Update: {
          area_demand_score?: number | null
          campaign_id?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          impressions_estimated?: number | null
          traffic_score?: number | null
          updated_at?: string | null
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_asset_creative_changes: {
        Row: {
          campaign_asset_id: string
          campaign_id: string
          change_date: string
          company_id: string
          created_at: string | null
          creative_id: string
          id: string
          mounting_cost_override: number | null
          printing_cost_override: number | null
          remount_required: boolean
          reprint_required: boolean
        }
        Insert: {
          campaign_asset_id: string
          campaign_id: string
          change_date: string
          company_id: string
          created_at?: string | null
          creative_id: string
          id?: string
          mounting_cost_override?: number | null
          printing_cost_override?: number | null
          remount_required?: boolean
          reprint_required?: boolean
        }
        Update: {
          campaign_asset_id?: string
          campaign_id?: string
          change_date?: string
          company_id?: string
          created_at?: string | null
          creative_id?: string
          id?: string
          mounting_cost_override?: number | null
          printing_cost_override?: number | null
          remount_required?: boolean
          reprint_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "campaign_asset_creative_changes_campaign_asset_id_fkey"
            columns: ["campaign_asset_id"]
            isOneToOne: false
            referencedRelation: "campaign_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_asset_creative_changes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_asset_creative_changes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_asset_creative_changes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_asset_creative_changes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_asset_creative_changes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_asset_creative_changes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_asset_creative_changes_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "campaign_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_assets: {
        Row: {
          area: string
          asset_id: string
          assigned_at: string | null
          assigned_mounter_id: string | null
          base_rate_monthly: number | null
          billing_mode: string
          billing_mode_override: string | null
          billing_override_amount: number | null
          booked_days: number | null
          booking_end_date: string | null
          booking_start_date: string | null
          campaign_id: string
          card_rate: number
          city: string
          completed_at: string | null
          created_at: string | null
          daily_rate: number | null
          dimensions: string | null
          direction: string | null
          district: string | null
          drop_reason: string | null
          dropped_on: string | null
          effective_end_date: string | null
          effective_start_date: string | null
          end_date: string | null
          id: string
          illumination_type: string | null
          installation_status: string | null
          invoice_generated_months: string[] | null
          is_removed: boolean
          latitude: number | null
          location: string
          longitude: number | null
          media_type: string
          mounter_name: string | null
          mounting_billed: boolean | null
          mounting_charges: number | null
          mounting_cost: number
          mounting_cost_default: number | null
          mounting_rate_per_sqft: number
          municipal_authority: string | null
          municipal_id: string | null
          negotiated_rate: number | null
          photos: Json | null
          printing_billed: boolean | null
          printing_charges: number | null
          printing_cost: number
          printing_cost_default: number | null
          printing_rate_per_sqft: number
          removal_notes: string | null
          removal_type: string | null
          rent_amount: number | null
          replacement_asset_id: string | null
          start_date: string | null
          state: string | null
          status: Database["public"]["Enums"]["asset_installation_status"]
          tax_percent: number | null
          total_price: number | null
          total_sqft: number | null
          unmount_approved: boolean
          unmount_approved_at: string | null
          unmount_approved_by: string | null
          unmount_required: boolean
          unmounted_at: string | null
        }
        Insert: {
          area: string
          asset_id: string
          assigned_at?: string | null
          assigned_mounter_id?: string | null
          base_rate_monthly?: number | null
          billing_mode?: string
          billing_mode_override?: string | null
          billing_override_amount?: number | null
          booked_days?: number | null
          booking_end_date?: string | null
          booking_start_date?: string | null
          campaign_id: string
          card_rate: number
          city: string
          completed_at?: string | null
          created_at?: string | null
          daily_rate?: number | null
          dimensions?: string | null
          direction?: string | null
          district?: string | null
          drop_reason?: string | null
          dropped_on?: string | null
          effective_end_date?: string | null
          effective_start_date?: string | null
          end_date?: string | null
          id?: string
          illumination_type?: string | null
          installation_status?: string | null
          invoice_generated_months?: string[] | null
          is_removed?: boolean
          latitude?: number | null
          location: string
          longitude?: number | null
          media_type: string
          mounter_name?: string | null
          mounting_billed?: boolean | null
          mounting_charges?: number | null
          mounting_cost?: number
          mounting_cost_default?: number | null
          mounting_rate_per_sqft?: number
          municipal_authority?: string | null
          municipal_id?: string | null
          negotiated_rate?: number | null
          photos?: Json | null
          printing_billed?: boolean | null
          printing_charges?: number | null
          printing_cost?: number
          printing_cost_default?: number | null
          printing_rate_per_sqft?: number
          removal_notes?: string | null
          removal_type?: string | null
          rent_amount?: number | null
          replacement_asset_id?: string | null
          start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["asset_installation_status"]
          tax_percent?: number | null
          total_price?: number | null
          total_sqft?: number | null
          unmount_approved?: boolean
          unmount_approved_at?: string | null
          unmount_approved_by?: string | null
          unmount_required?: boolean
          unmounted_at?: string | null
        }
        Update: {
          area?: string
          asset_id?: string
          assigned_at?: string | null
          assigned_mounter_id?: string | null
          base_rate_monthly?: number | null
          billing_mode?: string
          billing_mode_override?: string | null
          billing_override_amount?: number | null
          booked_days?: number | null
          booking_end_date?: string | null
          booking_start_date?: string | null
          campaign_id?: string
          card_rate?: number
          city?: string
          completed_at?: string | null
          created_at?: string | null
          daily_rate?: number | null
          dimensions?: string | null
          direction?: string | null
          district?: string | null
          drop_reason?: string | null
          dropped_on?: string | null
          effective_end_date?: string | null
          effective_start_date?: string | null
          end_date?: string | null
          id?: string
          illumination_type?: string | null
          installation_status?: string | null
          invoice_generated_months?: string[] | null
          is_removed?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          media_type?: string
          mounter_name?: string | null
          mounting_billed?: boolean | null
          mounting_charges?: number | null
          mounting_cost?: number
          mounting_cost_default?: number | null
          mounting_rate_per_sqft?: number
          municipal_authority?: string | null
          municipal_id?: string | null
          negotiated_rate?: number | null
          photos?: Json | null
          printing_billed?: boolean | null
          printing_charges?: number | null
          printing_cost?: number
          printing_cost_default?: number | null
          printing_rate_per_sqft?: number
          removal_notes?: string | null
          removal_type?: string | null
          rent_amount?: number | null
          replacement_asset_id?: string | null
          start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["asset_installation_status"]
          tax_percent?: number | null
          total_price?: number | null
          total_sqft?: number | null
          unmount_approved?: boolean
          unmount_approved_at?: string | null
          unmount_approved_by?: string | null
          unmount_required?: boolean
          unmounted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_assets_assigned_mounter_id_fkey"
            columns: ["assigned_mounter_id"]
            isOneToOne: false
            referencedRelation: "mounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      campaign_billing_periods: {
        Row: {
          campaign_id: string
          company_id: string
          created_at: string | null
          id: string
          month_key: string
          period_end: string
          period_start: string
          status: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          company_id: string
          created_at?: string | null
          id?: string
          month_key: string
          period_end: string
          period_start: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          month_key?: string
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_billing_periods_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_billing_periods_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_billing_periods_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_billing_periods_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_billing_periods_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_billing_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_creatives: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          campaign_id: string
          created_at: string | null
          creative_version: number | null
          effective_from: string | null
          effective_to: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_id: string
          created_at?: string | null
          creative_version?: number | null
          effective_from?: string | null
          effective_to?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string
          created_at?: string | null
          creative_version?: number | null
          effective_from?: string | null
          effective_to?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      campaign_deletions: {
        Row: {
          assets_released: number | null
          campaign_data: Json | null
          campaign_id: string
          campaign_name: string | null
          client_name: string | null
          deleted_at: string | null
          deleted_by: string
          deletion_reason: string
          id: string
        }
        Insert: {
          assets_released?: number | null
          campaign_data?: Json | null
          campaign_id: string
          campaign_name?: string | null
          client_name?: string | null
          deleted_at?: string | null
          deleted_by: string
          deletion_reason: string
          id?: string
        }
        Update: {
          assets_released?: number | null
          campaign_data?: Json | null
          campaign_id?: string
          campaign_name?: string | null
          client_name?: string | null
          deleted_at?: string | null
          deleted_by?: string
          deletion_reason?: string
          id?: string
        }
        Relationships: []
      }
      campaign_item_faces: {
        Row: {
          asset_id: string
          campaign_item_id: string
          created_at: string | null
          face_label: string
          height: number | null
          id: string
          illumination_type: string | null
          order_index: number | null
          photo_url: string | null
          sqft: number | null
          width: number | null
        }
        Insert: {
          asset_id: string
          campaign_item_id: string
          created_at?: string | null
          face_label: string
          height?: number | null
          id?: string
          illumination_type?: string | null
          order_index?: number | null
          photo_url?: string | null
          sqft?: number | null
          width?: number | null
        }
        Update: {
          asset_id?: string
          campaign_item_id?: string
          created_at?: string | null
          face_label?: string
          height?: number | null
          id?: string
          illumination_type?: string | null
          order_index?: number | null
          photo_url?: string | null
          sqft?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_item_faces_campaign_item_id_fkey"
            columns: ["campaign_item_id"]
            isOneToOne: false
            referencedRelation: "campaign_items"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_items: {
        Row: {
          asset_id: string
          campaign_id: string
          card_rate: number
          created_at: string | null
          end_date: string
          final_price: number
          id: string
          mounting_charge: number
          negotiated_rate: number
          plan_item_id: string | null
          printing_charge: number
          quantity: number
          start_date: string
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          campaign_id: string
          card_rate?: number
          created_at?: string | null
          end_date: string
          final_price?: number
          id?: string
          mounting_charge?: number
          negotiated_rate?: number
          plan_item_id?: string | null
          printing_charge?: number
          quantity?: number
          start_date: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          campaign_id?: string
          card_rate?: number
          created_at?: string | null
          end_date?: string
          final_price?: number
          id?: string
          mounting_charge?: number
          negotiated_rate?: number
          plan_item_id?: string | null
          printing_charge?: number
          quantity?: number
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "campaign_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_items_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_status_history: {
        Row: {
          campaign_id: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["campaign_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["campaign_status"] | null
        }
        Insert: {
          campaign_id: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["campaign_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["campaign_status"] | null
        }
        Update: {
          campaign_id?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["campaign_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["campaign_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_status_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_status_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_status_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_status_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_status_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          asset_preferences: Json | null
          client_type: string | null
          created_at: string | null
          created_by: string
          default_status: string | null
          description: string | null
          duration_days: number | null
          id: string
          is_active: boolean | null
          template_name: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          asset_preferences?: Json | null
          client_type?: string | null
          created_at?: string | null
          created_by: string
          default_status?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          template_name: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          asset_preferences?: Json | null
          client_type?: string | null
          created_at?: string | null
          created_by?: string
          default_status?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          template_name?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      campaign_timeline: {
        Row: {
          campaign_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          event_description: string | null
          event_time: string | null
          event_title: string | null
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          campaign_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          event_description?: string | null
          event_time?: string | null
          event_title?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          campaign_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          event_description?: string | null
          event_time?: string | null
          event_title?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_timeline_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_timeline_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_timeline_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_timeline_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_timeline_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_timeline_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          assigned_to: string | null
          billing_cycle: string | null
          campaign_code: string | null
          campaign_group_id: string | null
          campaign_name: string
          cgst_amount: number | null
          client_id: string
          client_name: string
          client_po_date: string | null
          client_po_document_url: string | null
          client_po_number: string | null
          company_id: string | null
          created_at: string | null
          created_by: string
          created_from: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          end_date: string
          grand_total: number
          gst_amount: number
          gst_percent: number
          id: string
          igst_amount: number | null
          is_deleted: boolean | null
          is_historical_entry: boolean | null
          is_recurring: boolean | null
          manual_discount_amount: number | null
          manual_discount_reason: string | null
          mounting_total: number | null
          notes: string | null
          notification_settings: Json | null
          owner_id: string | null
          parent_campaign_id: string | null
          plan_id: string | null
          printing_total: number | null
          public_share_enabled: boolean | null
          public_tracking_token: string | null
          secondary_owner_ids: string[] | null
          sgst_amount: number | null
          signed_ro_uploaded_at: string | null
          signed_ro_uploaded_by: string | null
          signed_ro_url: string | null
          start_date: string
          status: Database["public"]["Enums"]["campaign_status"]
          subtotal: number | null
          tax_type: string | null
          total_amount: number
          total_assets: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          billing_cycle?: string | null
          campaign_code?: string | null
          campaign_group_id?: string | null
          campaign_name: string
          cgst_amount?: number | null
          client_id: string
          client_name: string
          client_po_date?: string | null
          client_po_document_url?: string | null
          client_po_number?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by: string
          created_from?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          end_date: string
          grand_total: number
          gst_amount: number
          gst_percent: number
          id: string
          igst_amount?: number | null
          is_deleted?: boolean | null
          is_historical_entry?: boolean | null
          is_recurring?: boolean | null
          manual_discount_amount?: number | null
          manual_discount_reason?: string | null
          mounting_total?: number | null
          notes?: string | null
          notification_settings?: Json | null
          owner_id?: string | null
          parent_campaign_id?: string | null
          plan_id?: string | null
          printing_total?: number | null
          public_share_enabled?: boolean | null
          public_tracking_token?: string | null
          secondary_owner_ids?: string[] | null
          sgst_amount?: number | null
          signed_ro_uploaded_at?: string | null
          signed_ro_uploaded_by?: string | null
          signed_ro_url?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["campaign_status"]
          subtotal?: number | null
          tax_type?: string | null
          total_amount: number
          total_assets?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          billing_cycle?: string | null
          campaign_code?: string | null
          campaign_group_id?: string | null
          campaign_name?: string
          cgst_amount?: number | null
          client_id?: string
          client_name?: string
          client_po_date?: string | null
          client_po_document_url?: string | null
          client_po_number?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string
          created_from?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          end_date?: string
          grand_total?: number
          gst_amount?: number
          gst_percent?: number
          id?: string
          igst_amount?: number | null
          is_deleted?: boolean | null
          is_historical_entry?: boolean | null
          is_recurring?: boolean | null
          manual_discount_amount?: number | null
          manual_discount_reason?: string | null
          mounting_total?: number | null
          notes?: string | null
          notification_settings?: Json | null
          owner_id?: string | null
          parent_campaign_id?: string | null
          plan_id?: string | null
          printing_total?: number | null
          public_share_enabled?: boolean | null
          public_tracking_token?: string | null
          secondary_owner_ids?: string[] | null
          sgst_amount?: number | null
          signed_ro_uploaded_at?: string | null
          signed_ro_uploaded_by?: string | null
          signed_ro_url?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          subtotal?: number | null
          tax_type?: string | null
          total_amount?: number
          total_assets?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_parent_campaign_id_fkey"
            columns: ["parent_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_parent_campaign_id_fkey"
            columns: ["parent_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_parent_campaign_id_fkey"
            columns: ["parent_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_parent_campaign_id_fkey"
            columns: ["parent_campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_parent_campaign_id_fkey"
            columns: ["parent_campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaigns_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaigns_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaigns_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaigns_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      client_audit_log: {
        Row: {
          action: string
          changed_fields: Json | null
          client_id: string
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action: string
          changed_fields?: Json | null
          client_id: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          changed_fields?: Json | null
          client_id?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      client_contacts: {
        Row: {
          client_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          designation: string | null
          email: string | null
          first_name: string | null
          id: string
          is_primary: boolean | null
          last_name: string | null
          mobile: string | null
          name: string
          notes: string | null
          phone: string | null
          salutation: string | null
          updated_at: string | null
          work_phone: string | null
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          designation?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean | null
          last_name?: string | null
          mobile?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          salutation?: string | null
          updated_at?: string | null
          work_phone?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          designation?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean | null
          last_name?: string | null
          mobile?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          salutation?: string | null
          updated_at?: string | null
          work_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string | null
          document_name: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          notes: string | null
          updated_at: string | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          document_name: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          notes?: string | null
          updated_at?: string | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          document_name?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          notes?: string | null
          updated_at?: string | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      client_portal_access_logs: {
        Row: {
          action: string
          client_id: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          client_id: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          client_id?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      client_portal_users: {
        Row: {
          auth_user_id: string | null
          client_id: string
          created_at: string | null
          email: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          last_login: string | null
          magic_link_expires_at: string | null
          magic_link_token: string | null
          name: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          client_id: string
          created_at?: string | null
          email: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_login?: string | null
          magic_link_expires_at?: string | null
          magic_link_token?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          client_id?: string
          created_at?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_login?: string | null
          magic_link_expires_at?: string | null
          magic_link_token?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tags: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          id: string
          tag_color: string | null
          tag_name: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          tag_color?: string | null
          tag_name: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          tag_color?: string | null
          tag_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_pincode: string | null
          billing_state: string | null
          city: string | null
          client_type: Database["public"]["Enums"]["client_type"] | null
          company: string | null
          company_id: string
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          default_tds_rate: number | null
          email: string | null
          finance_contact: string | null
          gst_number: string | null
          id: string
          is_gst_applicable: boolean | null
          is_registered: boolean
          legal_name: string | null
          name: string
          notes: string | null
          owner_id: string | null
          pan_number: string | null
          payment_terms: string | null
          phone: string | null
          search_vector: unknown
          secondary_owner_ids: string[] | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_pincode: string | null
          shipping_same_as_billing: boolean | null
          shipping_state: string | null
          state: string | null
          state_code: string | null
          tan_number: string | null
          tds_applicable: boolean
          tds_notes: string | null
          tds_section: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_pincode?: string | null
          billing_state?: string | null
          city?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          default_tds_rate?: number | null
          email?: string | null
          finance_contact?: string | null
          gst_number?: string | null
          id: string
          is_gst_applicable?: boolean | null
          is_registered?: boolean
          legal_name?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          pan_number?: string | null
          payment_terms?: string | null
          phone?: string | null
          search_vector?: unknown
          secondary_owner_ids?: string[] | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_pincode?: string | null
          shipping_same_as_billing?: boolean | null
          shipping_state?: string | null
          state?: string | null
          state_code?: string | null
          tan_number?: string | null
          tds_applicable?: boolean
          tds_notes?: string | null
          tds_section?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_pincode?: string | null
          billing_state?: string | null
          city?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          default_tds_rate?: number | null
          email?: string | null
          finance_contact?: string | null
          gst_number?: string | null
          id?: string
          is_gst_applicable?: boolean | null
          is_registered?: boolean
          legal_name?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          pan_number?: string | null
          payment_terms?: string | null
          phone?: string | null
          search_vector?: unknown
          secondary_owner_ids?: string[] | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_pincode?: string | null
          shipping_same_as_billing?: boolean | null
          shipping_state?: string | null
          state?: string | null
          state_code?: string | null
          tan_number?: string | null
          tds_applicable?: boolean
          tds_notes?: string | null
          tds_section?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      code_counters: {
        Row: {
          counter_key: string
          counter_type: string
          created_at: string | null
          current_value: number
          id: string
          period: string
          updated_at: string | null
        }
        Insert: {
          counter_key: string
          counter_type: string
          created_at?: string | null
          current_value?: number
          id?: string
          period: string
          updated_at?: string | null
        }
        Update: {
          counter_key?: string
          counter_type?: string
          created_at?: string | null
          current_value?: number
          id?: string
          period?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          applies_to_company_type: string | null
          commission_type: string
          commission_value: number
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_from: string
          effective_until: string | null
          id: string
          is_active: boolean | null
          max_booking_amount: number | null
          metadata: Json | null
          min_booking_amount: number | null
          rule_name: string
          updated_at: string | null
        }
        Insert: {
          applies_to_company_type?: string | null
          commission_type?: string
          commission_value: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          max_booking_amount?: number | null
          metadata?: Json | null
          min_booking_amount?: number | null
          rule_name: string
          updated_at?: string | null
        }
        Update: {
          applies_to_company_type?: string | null
          commission_type?: string
          commission_value?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          max_booking_amount?: number | null
          metadata?: Json | null
          min_booking_amount?: number | null
          rule_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bank_account_name: string | null
          bank_account_no: string | null
          bank_branch: string | null
          bank_ifsc: string | null
          bank_name: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gstin: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          metadata: Json | null
          name: string
          pan: string | null
          phone: string | null
          pincode: string | null
          secondary_color: string | null
          slug: string | null
          state: string | null
          state_code: string | null
          status: Database["public"]["Enums"]["company_status"]
          terms_conditions: string[] | null
          theme_color: string | null
          type: Database["public"]["Enums"]["company_type"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          secondary_color?: string | null
          slug?: string | null
          state?: string | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          terms_conditions?: string[] | null
          theme_color?: string | null
          type: Database["public"]["Enums"]["company_type"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          secondary_color?: string | null
          slug?: string | null
          state?: string | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          terms_conditions?: string[] | null
          theme_color?: string | null
          type?: Database["public"]["Enums"]["company_type"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_code_settings: {
        Row: {
          asset_code_prefix: string | null
          campaign_code_prefix: string | null
          client_code_prefix: string | null
          company_id: string
          created_at: string | null
          estimation_code_prefix: string | null
          expense_code_prefix: string | null
          id: string
          invoice_code_prefix: string | null
          plan_code_prefix: string | null
          updated_at: string | null
          use_custom_asset_codes: boolean | null
          use_custom_campaign_codes: boolean | null
          use_custom_client_codes: boolean | null
          use_custom_estimation_codes: boolean | null
          use_custom_expense_codes: boolean | null
          use_custom_invoice_codes: boolean | null
          use_custom_plan_codes: boolean | null
        }
        Insert: {
          asset_code_prefix?: string | null
          campaign_code_prefix?: string | null
          client_code_prefix?: string | null
          company_id: string
          created_at?: string | null
          estimation_code_prefix?: string | null
          expense_code_prefix?: string | null
          id?: string
          invoice_code_prefix?: string | null
          plan_code_prefix?: string | null
          updated_at?: string | null
          use_custom_asset_codes?: boolean | null
          use_custom_campaign_codes?: boolean | null
          use_custom_client_codes?: boolean | null
          use_custom_estimation_codes?: boolean | null
          use_custom_expense_codes?: boolean | null
          use_custom_invoice_codes?: boolean | null
          use_custom_plan_codes?: boolean | null
        }
        Update: {
          asset_code_prefix?: string | null
          campaign_code_prefix?: string | null
          client_code_prefix?: string | null
          company_id?: string
          created_at?: string | null
          estimation_code_prefix?: string | null
          expense_code_prefix?: string | null
          id?: string
          invoice_code_prefix?: string | null
          plan_code_prefix?: string | null
          updated_at?: string | null
          use_custom_asset_codes?: boolean | null
          use_custom_campaign_codes?: boolean | null
          use_custom_client_codes?: boolean | null
          use_custom_estimation_codes?: boolean | null
          use_custom_expense_codes?: boolean | null
          use_custom_invoice_codes?: boolean | null
          use_custom_plan_codes?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "company_code_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_counters: {
        Row: {
          company_id: string
          counter_type: string
          created_at: string | null
          current_value: number
          id: string
          period: string
          prefix: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          counter_type: string
          created_at?: string | null
          current_value?: number
          id?: string
          period: string
          prefix?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          counter_type?: string
          created_at?: string | null
          current_value?: number
          id?: string
          period?: string
          prefix?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          amount: number
          asset_limit: number | null
          auto_renew: boolean | null
          billing_cycle: string
          campaign_limit: number | null
          company_id: string
          created_at: string | null
          created_by: string | null
          currency: string
          end_date: string | null
          id: string
          metadata: Json | null
          modules: Json
          start_date: string
          status: string
          tier: string
          updated_at: string | null
          user_limit: number
        }
        Insert: {
          amount?: number
          asset_limit?: number | null
          auto_renew?: boolean | null
          billing_cycle?: string
          campaign_limit?: number | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          end_date?: string | null
          id?: string
          metadata?: Json | null
          modules?: Json
          start_date?: string
          status?: string
          tier?: string
          updated_at?: string | null
          user_limit?: number
        }
        Update: {
          amount?: number
          asset_limit?: number | null
          auto_renew?: boolean | null
          billing_cycle?: string
          campaign_limit?: number | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          end_date?: string | null
          id?: string
          metadata?: Json | null
          modules?: Json
          start_date?: string
          status?: string
          tier?: string
          updated_at?: string | null
          user_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          company_id: string
          id: string
          invited_by: string | null
          is_primary: boolean | null
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          invited_by?: string | null
          is_primary?: boolean | null
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          invited_by?: string | null
          is_primary?: boolean | null
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      concession_contracts: {
        Row: {
          active: boolean
          advertisement_fee: number | null
          allocation_method: string
          annual_escalation_percent: number | null
          applies_to: string
          asset_count: number | null
          authority_name: string | null
          base_year_fee: number | null
          billing_cycle: string
          company_id: string
          contract_name: string
          contract_ref: string | null
          created_at: string
          end_date: string | null
          fee_type: string
          filter_json: Json | null
          gst_inclusive: boolean | null
          gst_percent: number | null
          id: string
          rcm_applicable: boolean | null
          start_date: string
          total_fee: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          advertisement_fee?: number | null
          allocation_method: string
          annual_escalation_percent?: number | null
          applies_to: string
          asset_count?: number | null
          authority_name?: string | null
          base_year_fee?: number | null
          billing_cycle: string
          company_id: string
          contract_name: string
          contract_ref?: string | null
          created_at?: string
          end_date?: string | null
          fee_type?: string
          filter_json?: Json | null
          gst_inclusive?: boolean | null
          gst_percent?: number | null
          id?: string
          rcm_applicable?: boolean | null
          start_date: string
          total_fee: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          advertisement_fee?: number | null
          allocation_method?: string
          annual_escalation_percent?: number | null
          applies_to?: string
          asset_count?: number | null
          authority_name?: string | null
          base_year_fee?: number | null
          billing_cycle?: string
          company_id?: string
          contract_name?: string
          contract_ref?: string | null
          created_at?: string
          end_date?: string | null
          fee_type?: string
          filter_json?: Json | null
          gst_inclusive?: boolean | null
          gst_percent?: number | null
          id?: string
          rcm_applicable?: boolean | null
          start_date?: string
          total_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concession_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      concession_postings: {
        Row: {
          allocated_amount: number
          allocation_method: string
          asset_id: string
          basis_value: number
          company_id: string
          contract_id: string
          created_at: string
          expense_id: string | null
          id: string
          period_end: string
          period_month: number
          period_start: string
          period_year: number
          posting_date: string
          status: string
        }
        Insert: {
          allocated_amount: number
          allocation_method: string
          asset_id: string
          basis_value: number
          company_id: string
          contract_id: string
          created_at?: string
          expense_id?: string | null
          id?: string
          period_end: string
          period_month: number
          period_start: string
          period_year: number
          posting_date: string
          status?: string
        }
        Update: {
          allocated_amount?: number
          allocation_method?: string
          asset_id?: string
          basis_value?: number
          company_id?: string
          contract_id?: string
          created_at?: string
          expense_id?: string | null
          id?: string
          period_end?: string
          period_month?: number
          period_start?: string
          period_year?: number
          posting_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "concession_postings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concession_postings_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "concession_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string | null
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_note_counters: {
        Row: {
          company_id: string
          fy_label: string
          id: string
          last_seq: number
          updated_at: string | null
        }
        Insert: {
          company_id: string
          fy_label: string
          id?: string
          last_seq?: number
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          fy_label?: string
          id?: string
          last_seq?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_note_items: {
        Row: {
          amount: number
          campaign_asset_id: string | null
          created_at: string | null
          credit_note_id: string
          description: string
          id: string
        }
        Insert: {
          amount?: number
          campaign_asset_id?: string | null
          created_at?: string | null
          credit_note_id: string
          description: string
          id?: string
        }
        Update: {
          amount?: number
          campaign_asset_id?: string | null
          created_at?: string | null
          credit_note_id?: string
          description?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_items_campaign_asset_id_fkey"
            columns: ["campaign_asset_id"]
            isOneToOne: false
            referencedRelation: "campaign_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "gst_credit_note_documents_v"
            referencedColumns: ["credit_note_uuid"]
          },
        ]
      }
      credit_notes: {
        Row: {
          cess_amount: number
          cgst_amount: number | null
          client_gstin_snapshot: string | null
          client_id: string
          client_name_snapshot: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          credit_date: string
          credit_note_id: string
          gst_amount: number
          gst_mode: string | null
          id: string
          igst_amount: number | null
          invoice_id: string
          is_cancelled: boolean
          issued_at: string | null
          notes: string | null
          original_invoice_no_snapshot: string | null
          place_of_supply_snapshot: string | null
          reason: string
          sgst_amount: number | null
          status: string
          subtotal: number
          supplier_state_code_snapshot: string | null
          tax_type: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          cess_amount?: number
          cgst_amount?: number | null
          client_gstin_snapshot?: string | null
          client_id: string
          client_name_snapshot?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          credit_date?: string
          credit_note_id: string
          gst_amount?: number
          gst_mode?: string | null
          id?: string
          igst_amount?: number | null
          invoice_id: string
          is_cancelled?: boolean
          issued_at?: string | null
          notes?: string | null
          original_invoice_no_snapshot?: string | null
          place_of_supply_snapshot?: string | null
          reason: string
          sgst_amount?: number | null
          status?: string
          subtotal?: number
          supplier_state_code_snapshot?: string | null
          tax_type?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          cess_amount?: number
          cgst_amount?: number | null
          client_gstin_snapshot?: string | null
          client_id?: string
          client_name_snapshot?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          credit_date?: string
          credit_note_id?: string
          gst_amount?: number
          gst_mode?: string | null
          id?: string
          igst_amount?: number | null
          invoice_id?: string
          is_cancelled?: boolean
          issued_at?: string | null
          notes?: string | null
          original_invoice_no_snapshot?: string | null
          place_of_supply_snapshot?: string | null
          reason?: string
          sgst_amount?: number | null
          status?: string
          subtotal?: number
          supplier_state_code_snapshot?: string | null
          tax_type?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_no"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_aging_report"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_dues"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      csrf_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_digest_settings: {
        Row: {
          campaign_end_window_days: number
          created_at: string
          daily_digest_enabled: boolean
          daily_time: string
          enabled: boolean
          id: string
          invoice_buckets: string[]
          per_campaign_enabled: boolean
          per_invoice_enabled: boolean
          recipients_cc: string[]
          recipients_to: string[]
          sender_name: string | null
          timezone: string
          updated_at: string
          whatsapp_enabled: boolean
          whatsapp_recipients: string[]
          windows_days: number[]
        }
        Insert: {
          campaign_end_window_days?: number
          created_at?: string
          daily_digest_enabled?: boolean
          daily_time?: string
          enabled?: boolean
          id?: string
          invoice_buckets?: string[]
          per_campaign_enabled?: boolean
          per_invoice_enabled?: boolean
          recipients_cc?: string[]
          recipients_to?: string[]
          sender_name?: string | null
          timezone?: string
          updated_at?: string
          whatsapp_enabled?: boolean
          whatsapp_recipients?: string[]
          windows_days?: number[]
        }
        Update: {
          campaign_end_window_days?: number
          created_at?: string
          daily_digest_enabled?: boolean
          daily_time?: string
          enabled?: boolean
          id?: string
          invoice_buckets?: string[]
          per_campaign_enabled?: boolean
          per_invoice_enabled?: boolean
          recipients_cc?: string[]
          recipients_to?: string[]
          sender_name?: string | null
          timezone?: string
          updated_at?: string
          whatsapp_enabled?: boolean
          whatsapp_recipients?: string[]
          windows_days?: number[]
        }
        Relationships: []
      }
      dashboard_configurations: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_default: boolean | null
          layout: Json
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          layout?: Json
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          layout?: Json
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      data_quality_alert_thresholds: {
        Row: {
          created_at: string
          id: string
          increase_percent: number | null
          is_active: boolean
          notify_on_increase: boolean
          severity: string
          threshold_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          increase_percent?: number | null
          is_active?: boolean
          notify_on_increase?: boolean
          severity: string
          threshold_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          increase_percent?: number | null
          is_active?: boolean
          notify_on_increase?: boolean
          severity?: string
          threshold_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      data_quality_issues: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          context: string | null
          created_at: string
          detail: string | null
          field_name: string
          first_seen: string
          id: string
          is_resolved: boolean
          issue_type: string
          last_seen: string
          occurrences: number
          raw_value: string | null
          record_id: string
          resolution_note: string | null
          resolved_at: string | null
          severity: string
          table_name: string
          workflow_status: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          context?: string | null
          created_at?: string
          detail?: string | null
          field_name: string
          first_seen?: string
          id?: string
          is_resolved?: boolean
          issue_type: string
          last_seen?: string
          occurrences?: number
          raw_value?: string | null
          record_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          table_name: string
          workflow_status?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          context?: string | null
          created_at?: string
          detail?: string | null
          field_name?: string
          first_seen?: string
          id?: string
          is_resolved?: boolean
          issue_type?: string
          last_seen?: string
          occurrences?: number
          raw_value?: string | null
          record_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: string
          table_name?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_quality_issues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      data_quality_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          issues_found: number | null
          issues_new: number | null
          issues_resolved: number | null
          started_at: string
          status: string
          tables_scanned: string[] | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          issues_found?: number | null
          issues_new?: number | null
          issues_resolved?: number | null
          started_at?: string
          status?: string
          tables_scanned?: string[] | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          issues_found?: number | null
          issues_new?: number | null
          issues_resolved?: number | null
          started_at?: string
          status?: string
          tables_scanned?: string[] | null
        }
        Relationships: []
      }
      default_role_settings: {
        Row: {
          auto_assign_role: boolean
          company_id: string | null
          created_at: string
          default_role: Database["public"]["Enums"]["app_role"]
          id: string
          notify_admins_on_signup: boolean
          require_admin_approval: boolean
          updated_at: string
        }
        Insert: {
          auto_assign_role?: boolean
          company_id?: string | null
          created_at?: string
          default_role?: Database["public"]["Enums"]["app_role"]
          id?: string
          notify_admins_on_signup?: boolean
          require_admin_approval?: boolean
          updated_at?: string
        }
        Update: {
          auto_assign_role?: boolean
          company_id?: string | null
          created_at?: string
          default_role?: Database["public"]["Enums"]["app_role"]
          id?: string
          notify_admins_on_signup?: boolean
          require_admin_approval?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "default_role_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          company_id: string
          doc_type: string
          id: string
          last_number: number
          period_key: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          doc_type: string
          id?: string
          last_number?: number
          period_key: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          doc_type?: string
          id?: string
          last_number?: number
          period_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_delivery_logs: {
        Row: {
          attempt_no: number
          created_at: string
          error_message: string | null
          id: string
          outbox_id: string | null
          provider_name: string | null
          provider_type: string | null
          request_payload_meta: Json | null
          response_meta: Json | null
          status: string
        }
        Insert: {
          attempt_no?: number
          created_at?: string
          error_message?: string | null
          id?: string
          outbox_id?: string | null
          provider_name?: string | null
          provider_type?: string | null
          request_payload_meta?: Json | null
          response_meta?: Json | null
          status?: string
        }
        Update: {
          attempt_no?: number
          created_at?: string
          error_message?: string | null
          id?: string
          outbox_id?: string | null
          provider_name?: string | null
          provider_type?: string | null
          request_payload_meta?: Json | null
          response_meta?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_logs_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "email_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          ai_parsed_data: Json | null
          body_preview: string | null
          created_at: string | null
          error_message: string | null
          gmail_message_id: string
          id: string
          lead_id: string | null
          parsing_status: string | null
          sender_email: string
          subject: string | null
        }
        Insert: {
          ai_parsed_data?: Json | null
          body_preview?: string | null
          created_at?: string | null
          error_message?: string | null
          gmail_message_id: string
          id?: string
          lead_id?: string | null
          parsing_status?: string | null
          sender_email: string
          subject?: string | null
        }
        Update: {
          ai_parsed_data?: Json | null
          body_preview?: string | null
          created_at?: string | null
          error_message?: string | null
          gmail_message_id?: string
          id?: string
          lead_id?: string | null
          parsing_status?: string | null
          sender_email?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          attempt_count: number | null
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_key: string | null
          failed_at: string | null
          html_rendered: string
          id: string
          last_error: string | null
          payload_json: Json | null
          provider_config_id: string | null
          recipient_bcc: string | null
          recipient_cc: string | null
          recipient_to: string
          recipient_type: string | null
          retry_count: number
          scheduled_at: string | null
          sent_at: string | null
          source_id: string | null
          source_module: string | null
          status: string
          subject_rendered: string
          template_key: string | null
          text_rendered: string | null
        }
        Insert: {
          attempt_count?: number | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_key?: string | null
          failed_at?: string | null
          html_rendered: string
          id?: string
          last_error?: string | null
          payload_json?: Json | null
          provider_config_id?: string | null
          recipient_bcc?: string | null
          recipient_cc?: string | null
          recipient_to: string
          recipient_type?: string | null
          retry_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          source_id?: string | null
          source_module?: string | null
          status?: string
          subject_rendered: string
          template_key?: string | null
          text_rendered?: string | null
        }
        Update: {
          attempt_count?: number | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_key?: string | null
          failed_at?: string | null
          html_rendered?: string
          id?: string
          last_error?: string | null
          payload_json?: Json | null
          provider_config_id?: string | null
          recipient_bcc?: string | null
          recipient_cc?: string | null
          recipient_to?: string
          recipient_type?: string | null
          retry_count?: number
          scheduled_at?: string | null
          sent_at?: string | null
          source_id?: string | null
          source_module?: string | null
          status?: string
          subject_rendered?: string
          template_key?: string | null
          text_rendered?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_provider_config_id_fkey"
            columns: ["provider_config_id"]
            isOneToOne: false
            referencedRelation: "email_provider_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_provider_configs: {
        Row: {
          company_id: string
          created_at: string
          daily_limit: number | null
          from_email: string | null
          from_name: string | null
          id: string
          is_active: boolean
          is_default: boolean
          provider_name: string
          provider_type: string
          reply_to_email: string | null
          resend_api_key_encrypted: string | null
          smtp_host: string | null
          smtp_password_encrypted: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_username: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          daily_limit?: number | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          provider_name?: string
          provider_type?: string
          reply_to_email?: string | null
          resend_api_key_encrypted?: string | null
          smtp_host?: string | null
          smtp_password_encrypted?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_username?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          daily_limit?: number | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          provider_name?: string
          provider_type?: string
          reply_to_email?: string | null
          resend_api_key_encrypted?: string | null
          smtp_host?: string | null
          smtp_password_encrypted?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_username?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_provider_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_providers: {
        Row: {
          company_id: string
          created_at: string | null
          from_email: string
          from_name: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          provider_type: string
          reply_to_email: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_user: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          provider_type?: string
          reply_to_email?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          provider_type?: string
          reply_to_email?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_providers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_logs: {
        Row: {
          company_id: string
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          provider_used: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          subject: string
          template_key: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider_used?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_key?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider_used?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppressions: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          reason: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          reason?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_suppressions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          audience: string | null
          category: string | null
          channel: string
          company_id: string
          created_at: string | null
          description: string | null
          html_template: string
          id: string
          is_active: boolean | null
          is_system: boolean
          send_mode: string | null
          subject_template: string
          template_key: string
          template_name: string
          text_template: string | null
          trigger_event: string | null
          updated_at: string | null
          variables_json: Json | null
          version: number
        }
        Insert: {
          audience?: string | null
          category?: string | null
          channel?: string
          company_id: string
          created_at?: string | null
          description?: string | null
          html_template?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          send_mode?: string | null
          subject_template: string
          template_key: string
          template_name: string
          text_template?: string | null
          trigger_event?: string | null
          updated_at?: string | null
          variables_json?: Json | null
          version?: number
        }
        Update: {
          audience?: string | null
          category?: string | null
          channel?: string
          company_id?: string
          created_at?: string | null
          description?: string | null
          html_template?: string
          id?: string
          is_active?: boolean | null
          is_system?: boolean
          send_mode?: string | null
          subject_template?: string
          template_key?: string
          template_name?: string
          text_template?: string | null
          trigger_event?: string | null
          updated_at?: string | null
          variables_json?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_webhook_events: {
        Row: {
          company_id: string | null
          created_at: string
          event_at: string | null
          event_type: string
          external_message_id: string | null
          id: string
          payload: Json | null
          provider_type: string
          recipient_email: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          event_at?: string | null
          event_type: string
          external_message_id?: string | null
          id?: string
          payload?: Json | null
          provider_type: string
          recipient_email?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          event_at?: string | null
          event_type?: string
          external_message_id?: string | null
          id?: string
          payload?: Json | null
          provider_type?: string
          recipient_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_webhook_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      estimations: {
        Row: {
          client_id: string
          client_name: string
          company_id: string | null
          created_at: string | null
          created_by: string
          estimation_date: string
          gst_amount: number
          gst_percent: number
          id: string
          items: Json | null
          notes: string | null
          plan_id: string | null
          status: Database["public"]["Enums"]["estimation_status"]
          sub_total: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          client_name: string
          company_id?: string | null
          created_at?: string | null
          created_by: string
          estimation_date: string
          gst_amount: number
          gst_percent?: number
          id: string
          items?: Json | null
          notes?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["estimation_status"]
          sub_total: number
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          client_name?: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string
          estimation_date?: string
          gst_amount?: number
          gst_percent?: number
          id?: string
          items?: Json | null
          notes?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["estimation_status"]
          sub_total?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_approvals_log: {
        Row: {
          action: string
          created_at: string | null
          expense_id: string | null
          from_status: string | null
          id: string
          remarks: string | null
          to_status: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          expense_id?: string | null
          from_status?: string | null
          id?: string
          remarks?: string | null
          to_status?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          expense_id?: string | null
          from_status?: string | null
          id?: string
          remarks?: string | null
          to_status?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_approvals_log_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_attachments: {
        Row: {
          expense_id: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          expense_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          expense_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_attachments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_budgets: {
        Row: {
          budget_amount: number
          category_id: string | null
          company_id: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          updated_at: string | null
        }
        Insert: {
          budget_amount?: number
          category_id?: string | null
          company_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          updated_at?: string | null
        }
        Update: {
          budget_amount?: number
          category_id?: string | null
          company_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_budgets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string | null
          default_gst_percent: number | null
          default_gst_type: string | null
          default_tds_percent: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          default_gst_percent?: number | null
          default_gst_type?: string | null
          default_tds_percent?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          default_gst_percent?: number | null
          default_gst_type?: string | null
          default_tds_percent?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          allocation_type: string | null
          amount: number
          amount_before_tax: number | null
          approval_status: string | null
          approved_by: string | null
          asset_id: string | null
          attachments_count: number | null
          bill_id: string | null
          bill_month: string | null
          campaign_id: string | null
          category: Database["public"]["Enums"]["expense_category"]
          category_id: string | null
          cgst: number | null
          company_id: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          expense_date: string | null
          expense_no: string | null
          gst_amount: number
          gst_percent: number
          gst_type_enum: string | null
          id: string
          igst: number | null
          invoice_date: string | null
          invoice_no: string | null
          invoice_url: string | null
          net_payable: number | null
          notes: string | null
          paid_date: string | null
          payment_mode: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          plan_id: string | null
          rejected_reason: string | null
          sgst: number | null
          subcategory: string | null
          tags: string[] | null
          tds_amount: number | null
          tds_applicable: boolean | null
          tds_percent: number | null
          total_amount: number
          total_tax: number | null
          updated_at: string | null
          vendor_gstin: string | null
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          allocation_type?: string | null
          amount: number
          amount_before_tax?: number | null
          approval_status?: string | null
          approved_by?: string | null
          asset_id?: string | null
          attachments_count?: number | null
          bill_id?: string | null
          bill_month?: string | null
          campaign_id?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          category_id?: string | null
          cgst?: number | null
          company_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expense_date?: string | null
          expense_no?: string | null
          gst_amount: number
          gst_percent?: number
          gst_type_enum?: string | null
          id: string
          igst?: number | null
          invoice_date?: string | null
          invoice_no?: string | null
          invoice_url?: string | null
          net_payable?: number | null
          notes?: string | null
          paid_date?: string | null
          payment_mode?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          plan_id?: string | null
          rejected_reason?: string | null
          sgst?: number | null
          subcategory?: string | null
          tags?: string[] | null
          tds_amount?: number | null
          tds_applicable?: boolean | null
          tds_percent?: number | null
          total_amount: number
          total_tax?: number | null
          updated_at?: string | null
          vendor_gstin?: string | null
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          allocation_type?: string | null
          amount?: number
          amount_before_tax?: number | null
          approval_status?: string | null
          approved_by?: string | null
          asset_id?: string | null
          attachments_count?: number | null
          bill_id?: string | null
          bill_month?: string | null
          campaign_id?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          category_id?: string | null
          cgst?: number | null
          company_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          expense_date?: string | null
          expense_no?: string | null
          gst_amount?: number
          gst_percent?: number
          gst_type_enum?: string | null
          id?: string
          igst?: number | null
          invoice_date?: string | null
          invoice_no?: string | null
          invoice_url?: string | null
          net_payable?: number | null
          notes?: string | null
          paid_date?: string | null
          payment_mode?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          plan_id?: string | null
          rejected_reason?: string | null
          sgst?: number | null
          subcategory?: string | null
          tags?: string[] | null
          tds_amount?: number | null
          tds_applicable?: boolean | null
          tds_percent?: number | null
          total_amount?: number
          total_tax?: number | null
          updated_at?: string | null
          vendor_gstin?: string | null
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "asset_power_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expenses_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expenses_cost_center"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      export_field_settings: {
        Row: {
          created_at: string | null
          export_type: string
          field_key: string
          id: string
          is_visible: boolean | null
          label: string
          module: string
          order_index: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          export_type: string
          field_key: string
          id?: string
          is_visible?: boolean | null
          label: string
          module: string
          order_index?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          export_type?: string
          field_key?: string
          id?: string
          is_visible?: boolean | null
          label?: string
          module?: string
          order_index?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      finance_override_requests: {
        Row: {
          admin_decision_at: string | null
          admin_decision_by: string | null
          admin_decision_reason: string | null
          company_id: string
          created_at: string
          executed_at: string | null
          id: string
          payload: Json | null
          reason: string
          requested_by: string
          requested_by_role: string
          scope_action: string
          scope_record_id: string
          scope_table: string
          status: string
        }
        Insert: {
          admin_decision_at?: string | null
          admin_decision_by?: string | null
          admin_decision_reason?: string | null
          company_id: string
          created_at?: string
          executed_at?: string | null
          id?: string
          payload?: Json | null
          reason: string
          requested_by: string
          requested_by_role?: string
          scope_action: string
          scope_record_id: string
          scope_table: string
          status?: string
        }
        Update: {
          admin_decision_at?: string | null
          admin_decision_by?: string | null
          admin_decision_reason?: string | null
          company_id?: string
          created_at?: string
          executed_at?: string | null
          id?: string
          payload?: Json | null
          reason?: string
          requested_by?: string
          requested_by_role?: string
          scope_action?: string
          scope_record_id?: string
          scope_table?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_override_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_overrides: {
        Row: {
          approved_by: string
          company_id: string
          created_at: string
          expires_at: string
          id: string
          reason: string
          request_id: string | null
          requested_by: string
          scope_action: string
          scope_record_id: string
          scope_table: string
          status: string
          used_at: string | null
        }
        Insert: {
          approved_by: string
          company_id: string
          created_at?: string
          expires_at: string
          id?: string
          reason: string
          request_id?: string | null
          requested_by: string
          scope_action: string
          scope_record_id: string
          scope_table: string
          status?: string
          used_at?: string | null
        }
        Update: {
          approved_by?: string
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          reason?: string
          request_id?: string | null
          requested_by?: string
          scope_action?: string
          scope_record_id?: string
          scope_table?: string
          status?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_overrides_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "finance_override_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_periods: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          id: string
          lock_reason: string | null
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          period_month: number
          period_year: number
          start_date: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          lock_reason?: string | null
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          period_month: number
          period_year: number
          start_date: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          lock_reason?: string | null
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          period_month?: number
          period_year?: number
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_years: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          fy_label: string
          id: string
          lock_reason: string | null
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          start_date: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          fy_label: string
          id?: string
          lock_reason?: string | null
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          start_date: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          fy_label?: string
          id?: string
          lock_reason?: string | null
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_years_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_return_snapshots: {
        Row: {
          company_id: string
          created_at: string
          export_version: number
          filing_month: number
          filing_year: number
          generated_at: string
          generated_by: string | null
          id: string
          period_end: string
          period_start: string
          source_hash: string | null
          summary_json: Json
          validation_json: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          export_version?: number
          filing_month: number
          filing_year: number
          generated_at?: string
          generated_by?: string | null
          id?: string
          period_end: string
          period_start: string
          source_hash?: string | null
          summary_json?: Json
          validation_json?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          export_version?: number
          filing_month?: number
          filing_year?: number
          generated_at?: string
          generated_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          source_hash?: string | null
          summary_json?: Json
          validation_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "gst_return_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string | null
          entity_type: string
          error_count: number
          errors: Json | null
          file_name: string
          id: string
          imported_by: string | null
          skipped_count: number
          skipped_records: Json | null
          success_count: number
          total_records: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_type: string
          error_count?: number
          errors?: Json | null
          file_name: string
          id?: string
          imported_by?: string | null
          skipped_count?: number
          skipped_records?: Json | null
          success_count?: number
          total_records?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_type?: string
          error_count?: number
          errors?: Json | null
          file_name?: string
          id?: string
          imported_by?: string | null
          skipped_count?: number
          skipped_records?: Json | null
          success_count?: number
          total_records?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_counters: {
        Row: {
          company_id: string
          fy_label: string
          id: string
          last_seq: number
          prefix: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          fy_label: string
          id?: string
          last_seq?: number
          prefix: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          fy_label?: string
          id?: string
          last_seq?: number
          prefix?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          area: string | null
          asset_code: string | null
          asset_id: string | null
          base_amount: number
          bill_end_date: string
          bill_start_date: string
          billable_days: number
          campaign_asset_id: string | null
          cgst_amount: number
          created_at: string | null
          description: string | null
          dimension_text: string | null
          direction: string | null
          gst_rate: number | null
          hsn_sac: string | null
          id: string
          igst_amount: number
          illumination: string | null
          invoice_id: string
          line_total: number
          location: string | null
          media_type: string | null
          mounting_cost: number | null
          printing_cost: number | null
          quantity: number | null
          rate_type: string
          rate_value: number
          sgst_amount: number
          unit: string | null
        }
        Insert: {
          area?: string | null
          asset_code?: string | null
          asset_id?: string | null
          base_amount?: number
          bill_end_date: string
          bill_start_date: string
          billable_days: number
          campaign_asset_id?: string | null
          cgst_amount?: number
          created_at?: string | null
          description?: string | null
          dimension_text?: string | null
          direction?: string | null
          gst_rate?: number | null
          hsn_sac?: string | null
          id?: string
          igst_amount?: number
          illumination?: string | null
          invoice_id: string
          line_total?: number
          location?: string | null
          media_type?: string | null
          mounting_cost?: number | null
          printing_cost?: number | null
          quantity?: number | null
          rate_type?: string
          rate_value?: number
          sgst_amount?: number
          unit?: string | null
        }
        Update: {
          area?: string | null
          asset_code?: string | null
          asset_id?: string | null
          base_amount?: number
          bill_end_date?: string
          bill_start_date?: string
          billable_days?: number
          campaign_asset_id?: string | null
          cgst_amount?: number
          created_at?: string | null
          description?: string | null
          dimension_text?: string | null
          direction?: string | null
          gst_rate?: number | null
          hsn_sac?: string | null
          id?: string
          igst_amount?: number
          illumination?: string | null
          invoice_id?: string
          line_total?: number
          location?: string | null
          media_type?: string | null
          mounting_cost?: number | null
          printing_cost?: number | null
          quantity?: number | null
          rate_type?: string
          rate_value?: number
          sgst_amount?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_campaign_asset_id_fkey"
            columns: ["campaign_asset_id"]
            isOneToOne: false
            referencedRelation: "campaign_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_no"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_aging_report"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_dues"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          campaign_asset_id: string | null
          created_at: string | null
          description: string
          hsn_sac_code: string | null
          id: string
          invoice_id: string
          line_type: string
          media_asset_id: string | null
          qty: number
          rate: number
        }
        Insert: {
          amount?: number
          campaign_asset_id?: string | null
          created_at?: string | null
          description: string
          hsn_sac_code?: string | null
          id?: string
          invoice_id: string
          line_type: string
          media_asset_id?: string | null
          qty?: number
          rate?: number
        }
        Update: {
          amount?: number
          campaign_asset_id?: string | null
          created_at?: string | null
          description?: string
          hsn_sac_code?: string | null
          id?: string
          invoice_id?: string
          line_type?: string
          media_asset_id?: string | null
          qty?: number
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_campaign_asset_id_fkey"
            columns: ["campaign_asset_id"]
            isOneToOne: false
            referencedRelation: "campaign_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_no"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_aging_report"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_dues"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_line_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "invoice_line_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "invoice_line_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "invoice_line_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "invoice_line_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "invoice_line_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "invoice_line_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "invoice_line_items_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
        ]
      }
      invoice_reminders: {
        Row: {
          aging_bucket: number
          created_at: string | null
          error_message: string | null
          id: string
          invoice_id: string
          message_content: string | null
          reminder_type: string
          sent_at: string
          status: string
        }
        Insert: {
          aging_bucket: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          invoice_id: string
          message_content?: string | null
          reminder_type: string
          sent_at?: string
          status?: string
        }
        Update: {
          aging_bucket?: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string
          message_content?: string | null
          reminder_type?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_no"]
          },
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_aging_report"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_dues"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          company_id: string
          created_at: string | null
          fy_key: string
          id: string
          next_number: number
          prefix: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          fy_key: string
          id?: string
          next_number?: number
          prefix?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          fy_key?: string
          id?: string
          next_number?: number
          prefix?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_share_tokens: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          invoice_id: string
          is_revoked: boolean
          max_uses: number | null
          revoked_at: string | null
          revoked_by: string | null
          token: string
          token_hash: string | null
          use_count: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          invoice_id: string
          is_revoked?: boolean
          max_uses?: number | null
          revoked_at?: string | null
          revoked_by?: string | null
          token?: string
          token_hash?: string | null
          use_count?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          invoice_id?: string
          is_revoked?: boolean
          max_uses?: number | null
          revoked_at?: string | null
          revoked_by?: string | null
          token?: string
          token_hash?: string | null
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_share_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance_due: number
          billing_month: string | null
          billing_period_id: string | null
          billing_state_code_snapshot: string | null
          campaign_id: string | null
          cancelled_at: string | null
          cess_amount: number
          cgst_amount: number | null
          cgst_percent: number | null
          client_gstin_snapshot: string | null
          client_id: string
          client_name: string
          client_name_snapshot: string | null
          client_po_date: string | null
          client_po_number: string | null
          company_id: string | null
          created_at: string | null
          created_by: string
          credited_amount: number
          draft_number: string | null
          due_date: string
          estimation_id: string | null
          finalized_at: string | null
          gst_amount: number
          gst_mode: string | null
          gst_percent: number
          id: string
          igst_amount: number | null
          igst_percent: number | null
          invoice_date: string
          invoice_no: string | null
          invoice_period_end: string | null
          invoice_period_start: string | null
          invoice_series_prefix: string | null
          invoice_type: string
          is_cancelled: boolean
          is_draft: boolean | null
          is_monthly_split: boolean | null
          items: Json | null
          notes: string | null
          paid_amount: number | null
          parent_invoice_id: string | null
          payments: Json | null
          pdf_template_key: string | null
          pdf_template_version: number | null
          place_of_supply: string | null
          reference_plan_id: string | null
          reverse_charge_applicable: boolean
          round_off_amount: number
          sales_person: string | null
          sgst_amount: number | null
          sgst_percent: number | null
          status: Database["public"]["Enums"]["invoice_status"]
          sub_total: number
          supplier_state_code: string | null
          tax_type: string | null
          template_style: string
          terms_days: number
          terms_mode: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          balance_due: number
          billing_month?: string | null
          billing_period_id?: string | null
          billing_state_code_snapshot?: string | null
          campaign_id?: string | null
          cancelled_at?: string | null
          cess_amount?: number
          cgst_amount?: number | null
          cgst_percent?: number | null
          client_gstin_snapshot?: string | null
          client_id: string
          client_name: string
          client_name_snapshot?: string | null
          client_po_date?: string | null
          client_po_number?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by: string
          credited_amount?: number
          draft_number?: string | null
          due_date: string
          estimation_id?: string | null
          finalized_at?: string | null
          gst_amount: number
          gst_mode?: string | null
          gst_percent?: number
          id: string
          igst_amount?: number | null
          igst_percent?: number | null
          invoice_date: string
          invoice_no?: string | null
          invoice_period_end?: string | null
          invoice_period_start?: string | null
          invoice_series_prefix?: string | null
          invoice_type?: string
          is_cancelled?: boolean
          is_draft?: boolean | null
          is_monthly_split?: boolean | null
          items?: Json | null
          notes?: string | null
          paid_amount?: number | null
          parent_invoice_id?: string | null
          payments?: Json | null
          pdf_template_key?: string | null
          pdf_template_version?: number | null
          place_of_supply?: string | null
          reference_plan_id?: string | null
          reverse_charge_applicable?: boolean
          round_off_amount?: number
          sales_person?: string | null
          sgst_amount?: number | null
          sgst_percent?: number | null
          status?: Database["public"]["Enums"]["invoice_status"]
          sub_total: number
          supplier_state_code?: string | null
          tax_type?: string | null
          template_style?: string
          terms_days?: number
          terms_mode?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          balance_due?: number
          billing_month?: string | null
          billing_period_id?: string | null
          billing_state_code_snapshot?: string | null
          campaign_id?: string | null
          cancelled_at?: string | null
          cess_amount?: number
          cgst_amount?: number | null
          cgst_percent?: number | null
          client_gstin_snapshot?: string | null
          client_id?: string
          client_name?: string
          client_name_snapshot?: string | null
          client_po_date?: string | null
          client_po_number?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string
          credited_amount?: number
          draft_number?: string | null
          due_date?: string
          estimation_id?: string | null
          finalized_at?: string | null
          gst_amount?: number
          gst_mode?: string | null
          gst_percent?: number
          id?: string
          igst_amount?: number | null
          igst_percent?: number | null
          invoice_date?: string
          invoice_no?: string | null
          invoice_period_end?: string | null
          invoice_period_start?: string | null
          invoice_series_prefix?: string | null
          invoice_type?: string
          is_cancelled?: boolean
          is_draft?: boolean | null
          is_monthly_split?: boolean | null
          items?: Json | null
          notes?: string | null
          paid_amount?: number | null
          parent_invoice_id?: string | null
          payments?: Json | null
          pdf_template_key?: string | null
          pdf_template_version?: number | null
          place_of_supply?: string | null
          reference_plan_id?: string | null
          reverse_charge_applicable?: boolean
          round_off_amount?: number
          sales_person?: string | null
          sgst_amount?: number | null
          sgst_percent?: number | null
          status?: Database["public"]["Enums"]["invoice_status"]
          sub_total?: number
          supplier_state_code?: string | null
          tax_type?: string | null
          template_style?: string
          terms_days?: number
          terms_mode?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_estimation_id_fkey"
            columns: ["estimation_id"]
            isOneToOne: false
            referencedRelation: "estimations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_followups: {
        Row: {
          created_at: string | null
          created_by: string | null
          followup_date: string | null
          id: string
          lead_id: string
          note: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          followup_date?: string | null
          id?: string
          lead_id: string
          note: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          followup_date?: string | null
          id?: string
          lead_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          company: string | null
          company_id: string | null
          converted_at: string | null
          created_at: string | null
          email: string | null
          id: string
          location: string | null
          matched_client_id: string | null
          merge_confidence: number | null
          merge_reason: string | null
          merge_status: string
          metadata: Json | null
          name: string
          phone: string | null
          raw_message: string | null
          requirement: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
          synced_to_zoho: boolean | null
          updated_at: string | null
          zoho_lead_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          company?: string | null
          company_id?: string | null
          converted_at?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          matched_client_id?: string | null
          merge_confidence?: number | null
          merge_reason?: string | null
          merge_status?: string
          metadata?: Json | null
          name: string
          phone?: string | null
          raw_message?: string | null
          requirement?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: string
          status?: string
          synced_to_zoho?: boolean | null
          updated_at?: string | null
          zoho_lead_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          company?: string | null
          company_id?: string | null
          converted_at?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          matched_client_id?: string | null
          merge_confidence?: number | null
          merge_reason?: string | null
          merge_status?: string
          metadata?: Json | null
          name?: string
          phone?: string | null
          raw_message?: string | null
          requirement?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          synced_to_zoho?: boolean | null
          updated_at?: string | null
          zoho_lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_matched_client_id_fkey"
            columns: ["matched_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_matched_client_id_fkey"
            columns: ["matched_client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_matched_client_id_fkey"
            columns: ["matched_client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      list_view_presets: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          export_format: string
          export_style: Json
          field_order: string[]
          filters: Json
          id: string
          is_default: boolean
          is_shared: boolean
          page_key: string
          preset_name: string
          search_query: string | null
          selected_fields: string[]
          sort: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          export_format?: string
          export_style?: Json
          field_order?: string[]
          filters?: Json
          id?: string
          is_default?: boolean
          is_shared?: boolean
          page_key: string
          preset_name: string
          search_query?: string | null
          selected_fields?: string[]
          sort?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          export_format?: string
          export_style?: Json
          field_order?: string[]
          filters?: Json
          id?: string
          is_default?: boolean
          is_shared?: boolean
          page_key?: string
          preset_name?: string
          search_query?: string | null
          selected_fields?: string[]
          sort?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_view_presets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_inquiries: {
        Row: {
          asset_id: string | null
          budget: number | null
          campaign_end_date: string | null
          campaign_start_date: string | null
          company_id: string
          company_name: string | null
          created_at: string | null
          email: string
          id: string
          lead_id: string | null
          message: string | null
          name: string
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          budget?: number | null
          campaign_end_date?: string | null
          campaign_start_date?: string | null
          company_id: string
          company_name?: string | null
          created_at?: string | null
          email: string
          id?: string
          lead_id?: string | null
          message?: string | null
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          budget?: number | null
          campaign_end_date?: string | null
          campaign_start_date?: string | null
          company_id?: string
          company_name?: string | null
          created_at?: string | null
          email?: string
          id?: string
          lead_id?: string | null
          message?: string | null
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_inquiries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_inquiry_assets: {
        Row: {
          asset_id: string
          created_at: string | null
          id: string
          inquiry_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          id?: string
          inquiry_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          id?: string
          inquiry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_inquiry_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_inquiry_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_inquiry_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_inquiry_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_inquiry_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_inquiry_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_inquiry_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_inquiry_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_inquiry_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_inquiry_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_inquiry_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_inquiry_assets_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "marketplace_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          asset_id: string
          availability_end: string
          availability_start: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          inquiries_count: number | null
          min_booking_days: number | null
          rate: number
          status: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          asset_id: string
          availability_end: string
          availability_start: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          inquiries_count?: number | null
          min_booking_days?: number | null
          rate?: number
          status?: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          asset_id?: string
          availability_end?: string
          availability_start?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          inquiries_count?: number | null
          min_booking_days?: number | null
          rate?: number
          status?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_listings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_listings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_listings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_listings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_listings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_listings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_listings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "marketplace_listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_requests: {
        Row: {
          campaign_name: string | null
          client_name: string | null
          counter_notes: string | null
          counter_offer_price: number | null
          created_at: string
          created_campaign_id: string | null
          end_date: string
          id: string
          listing_id: string
          notes: string | null
          offer_price: number
          rejection_reason: string | null
          requested_by: string | null
          requesting_company_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          campaign_name?: string | null
          client_name?: string | null
          counter_notes?: string | null
          counter_offer_price?: number | null
          created_at?: string
          created_campaign_id?: string | null
          end_date: string
          id?: string
          listing_id: string
          notes?: string | null
          offer_price?: number
          rejection_reason?: string | null
          requested_by?: string | null
          requesting_company_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_name?: string | null
          client_name?: string | null
          counter_notes?: string | null
          counter_offer_price?: number | null
          created_at?: string
          created_campaign_id?: string | null
          end_date?: string
          id?: string
          listing_id?: string
          notes?: string | null
          offer_price?: number
          rejection_reason?: string | null
          requested_by?: string | null
          requesting_company_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_requests_created_campaign_id_fkey"
            columns: ["created_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_requests_created_campaign_id_fkey"
            columns: ["created_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_requests_created_campaign_id_fkey"
            columns: ["created_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_requests_created_campaign_id_fkey"
            columns: ["created_campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_requests_created_campaign_id_fkey"
            columns: ["created_campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "marketplace_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_requests_requesting_company_id_fkey"
            columns: ["requesting_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_transactions: {
        Row: {
          booking_request_id: string | null
          buyer_company_id: string
          campaign_id: string | null
          created_at: string
          id: string
          listing_id: string | null
          net_amount: number
          notes: string | null
          platform_fee: number
          platform_fee_percent: number
          platform_fee_type: string
          seller_company_id: string
          status: string
          transaction_value: number
          updated_at: string
        }
        Insert: {
          booking_request_id?: string | null
          buyer_company_id: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          net_amount?: number
          notes?: string | null
          platform_fee?: number
          platform_fee_percent?: number
          platform_fee_type?: string
          seller_company_id: string
          status?: string
          transaction_value?: number
          updated_at?: string
        }
        Update: {
          booking_request_id?: string | null
          buyer_company_id?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          net_amount?: number
          notes?: string | null
          platform_fee?: number
          platform_fee_percent?: number
          platform_fee_type?: string
          seller_company_id?: string
          status?: string
          transaction_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_transactions_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_transactions_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "marketplace_transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_transactions_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      media_asset_faces: {
        Row: {
          asset_id: string
          created_at: string | null
          face_label: string
          height: number | null
          id: string
          illumination_type: string | null
          is_active: boolean | null
          order_index: number | null
          photo_url: string | null
          sqft: number | null
          updated_at: string | null
          width: number | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          face_label: string
          height?: number | null
          id?: string
          illumination_type?: string | null
          is_active?: boolean | null
          order_index?: number | null
          photo_url?: string | null
          sqft?: number | null
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          face_label?: string
          height?: number | null
          id?: string
          illumination_type?: string | null
          is_active?: boolean | null
          order_index?: number | null
          photo_url?: string | null
          sqft?: number | null
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_asset_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_asset_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "media_asset_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "media_asset_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "media_asset_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "media_asset_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_asset_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "media_asset_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_asset_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "media_asset_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "media_asset_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
        ]
      }
      media_asset_sequences: {
        Row: {
          city: string
          created_at: string | null
          media_type: string
          next_value: number
          prefix: string
          updated_at: string | null
        }
        Insert: {
          city: string
          created_at?: string | null
          media_type: string
          next_value?: number
          prefix?: string
          updated_at?: string | null
        }
        Update: {
          city?: string
          created_at?: string | null
          media_type?: string
          next_value?: number
          prefix?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          ad_tax: number | null
          area: string
          base_margin: number | null
          base_rate: number | null
          booked_from: string | null
          booked_to: string | null
          card_rate: number
          category: Database["public"]["Enums"]["media_category"]
          city: string
          company_id: string
          concession_fee: number | null
          consumer_name: string | null
          created_at: string | null
          created_by: string | null
          current_campaign_id: string | null
          default_duration_mode: string | null
          dimensions: string
          direction: string | null
          display_title: string | null
          district: string | null
          duplicate_group_id: string | null
          electricity: number | null
          ero: string | null
          faces: Json | null
          google_street_view_url: string | null
          gst_percent: number | null
          id: string
          illumination_type: string | null
          installation_type: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_multi_face: boolean | null
          is_public: boolean | null
          last_maintenance_date: string | null
          latitude: number | null
          legacy_codes: string[] | null
          location: string
          longitude: number | null
          maintenance: number | null
          media_asset_code: string | null
          media_type: string
          min_booking_days: number | null
          monthly_land_rent: number | null
          mounting_rate_default: number | null
          municipal_authority: string | null
          municipal_id: string | null
          next_maintenance_due: string | null
          ownership: Database["public"]["Enums"]["ownership_type"] | null
          primary_photo_url: string | null
          printing_rate_default: number | null
          qr_code_url: string | null
          remarks: string | null
          search_tokens: string[] | null
          section_name: string | null
          seo_description: string | null
          service_number: string | null
          slug: string | null
          state: string | null
          status: Database["public"]["Enums"]["media_asset_status"]
          structure_ownership: string | null
          sub_zone: string | null
          tags: string[] | null
          target_audience: string[] | null
          total_sqft: number | null
          traffic_density: string | null
          unique_service_number: string | null
          updated_at: string | null
          vendor_details: Json | null
          visibility_score: number | null
          zone: string | null
        }
        Insert: {
          ad_tax?: number | null
          area: string
          base_margin?: number | null
          base_rate?: number | null
          booked_from?: string | null
          booked_to?: string | null
          card_rate: number
          category?: Database["public"]["Enums"]["media_category"]
          city: string
          company_id: string
          concession_fee?: number | null
          consumer_name?: string | null
          created_at?: string | null
          created_by?: string | null
          current_campaign_id?: string | null
          default_duration_mode?: string | null
          dimensions: string
          direction?: string | null
          display_title?: string | null
          district?: string | null
          duplicate_group_id?: string | null
          electricity?: number | null
          ero?: string | null
          faces?: Json | null
          google_street_view_url?: string | null
          gst_percent?: number | null
          id: string
          illumination_type?: string | null
          installation_type?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_multi_face?: boolean | null
          is_public?: boolean | null
          last_maintenance_date?: string | null
          latitude?: number | null
          legacy_codes?: string[] | null
          location: string
          longitude?: number | null
          maintenance?: number | null
          media_asset_code?: string | null
          media_type: string
          min_booking_days?: number | null
          monthly_land_rent?: number | null
          mounting_rate_default?: number | null
          municipal_authority?: string | null
          municipal_id?: string | null
          next_maintenance_due?: string | null
          ownership?: Database["public"]["Enums"]["ownership_type"] | null
          primary_photo_url?: string | null
          printing_rate_default?: number | null
          qr_code_url?: string | null
          remarks?: string | null
          search_tokens?: string[] | null
          section_name?: string | null
          seo_description?: string | null
          service_number?: string | null
          slug?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["media_asset_status"]
          structure_ownership?: string | null
          sub_zone?: string | null
          tags?: string[] | null
          target_audience?: string[] | null
          total_sqft?: number | null
          traffic_density?: string | null
          unique_service_number?: string | null
          updated_at?: string | null
          vendor_details?: Json | null
          visibility_score?: number | null
          zone?: string | null
        }
        Update: {
          ad_tax?: number | null
          area?: string
          base_margin?: number | null
          base_rate?: number | null
          booked_from?: string | null
          booked_to?: string | null
          card_rate?: number
          category?: Database["public"]["Enums"]["media_category"]
          city?: string
          company_id?: string
          concession_fee?: number | null
          consumer_name?: string | null
          created_at?: string | null
          created_by?: string | null
          current_campaign_id?: string | null
          default_duration_mode?: string | null
          dimensions?: string
          direction?: string | null
          display_title?: string | null
          district?: string | null
          duplicate_group_id?: string | null
          electricity?: number | null
          ero?: string | null
          faces?: Json | null
          google_street_view_url?: string | null
          gst_percent?: number | null
          id?: string
          illumination_type?: string | null
          installation_type?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_multi_face?: boolean | null
          is_public?: boolean | null
          last_maintenance_date?: string | null
          latitude?: number | null
          legacy_codes?: string[] | null
          location?: string
          longitude?: number | null
          maintenance?: number | null
          media_asset_code?: string | null
          media_type?: string
          min_booking_days?: number | null
          monthly_land_rent?: number | null
          mounting_rate_default?: number | null
          municipal_authority?: string | null
          municipal_id?: string | null
          next_maintenance_due?: string | null
          ownership?: Database["public"]["Enums"]["ownership_type"] | null
          primary_photo_url?: string | null
          printing_rate_default?: number | null
          qr_code_url?: string | null
          remarks?: string | null
          search_tokens?: string[] | null
          section_name?: string | null
          seo_description?: string | null
          service_number?: string | null
          slug?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["media_asset_status"]
          structure_ownership?: string | null
          sub_zone?: string | null
          tags?: string[] | null
          target_audience?: string[] | null
          total_sqft?: number | null
          traffic_density?: string | null
          unique_service_number?: string | null
          updated_at?: string | null
          vendor_details?: Json | null
          visibility_score?: number | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_current_campaign_id_fkey"
            columns: ["current_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_current_campaign_id_fkey"
            columns: ["current_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_current_campaign_id_fkey"
            columns: ["current_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_current_campaign_id_fkey"
            columns: ["current_campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_current_campaign_id_fkey"
            columns: ["current_campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      media_photos: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          asset_id: string
          campaign_id: string | null
          category: string
          client_id: string | null
          company_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          photo_url: string
          rejection_reason: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_id: string
          campaign_id?: string | null
          category: string
          client_id?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          photo_url: string
          rejection_reason?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string
          campaign_id?: string | null
          category?: string
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          photo_url?: string
          rejection_reason?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mounters: {
        Row: {
          active: boolean | null
          area: string | null
          capacity_per_day: number | null
          company_id: string
          created_at: string | null
          id: string
          name: string
          phone: string | null
          sub_zone: string | null
          user_id: string | null
          zone: string | null
        }
        Insert: {
          active?: boolean | null
          area?: string | null
          capacity_per_day?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          sub_zone?: string | null
          user_id?: string | null
          zone?: string | null
        }
        Update: {
          active?: boolean | null
          area?: string | null
          capacity_per_day?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          sub_zone?: string | null
          user_id?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mounters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          alerts: Json | null
          company_id: string
          created_at: string | null
          id: string
          reminders: Json | null
          updated_at: string | null
        }
        Insert: {
          alerts?: Json | null
          company_id: string
          created_at?: string | null
          id?: string
          reminders?: Json | null
          updated_at?: string | null
        }
        Update: {
          alerts?: Json | null
          company_id?: string
          created_at?: string | null
          id?: string
          reminders?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          company_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          module_name: string
          notes: string | null
          step_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          module_name: string
          notes?: string | null
          step_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          module_name?: string
          notes?: string | null
          step_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_photos: {
        Row: {
          file_path: string
          id: string
          operation_id: string
          photo_type: string | null
          uploaded_at: string | null
        }
        Insert: {
          file_path: string
          id?: string
          operation_id: string
          photo_type?: string | null
          uploaded_at?: string | null
        }
        Update: {
          file_path?: string
          id?: string
          operation_id?: string
          photo_type?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_photos_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          asset_id: string
          assigned_at: string | null
          assigned_by: string | null
          campaign_id: string
          company_id: string
          created_at: string | null
          deadline: string | null
          id: string
          mounter_id: string | null
          qr_location_lat: number | null
          qr_location_lng: number | null
          qr_verified: boolean | null
          qr_verified_at: string | null
          status: string | null
        }
        Insert: {
          asset_id: string
          assigned_at?: string | null
          assigned_by?: string | null
          campaign_id: string
          company_id: string
          created_at?: string | null
          deadline?: string | null
          id?: string
          mounter_id?: string | null
          qr_location_lat?: number | null
          qr_location_lng?: number | null
          qr_verified?: boolean | null
          qr_verified_at?: string | null
          status?: string | null
        }
        Update: {
          asset_id?: string
          assigned_at?: string | null
          assigned_by?: string | null
          campaign_id?: string
          company_id?: string
          created_at?: string | null
          deadline?: string | null
          id?: string
          mounter_id?: string | null
          qr_location_lat?: number | null
          qr_location_lng?: number | null
          qr_verified?: boolean | null
          qr_verified_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "operations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "operations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "operations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "operations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "operations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "operations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "operations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "operations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "operations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_mounter_id_fkey"
            columns: ["mounter_id"]
            isOneToOne: false
            referencedRelation: "mounters"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_notifications: {
        Row: {
          asset_id: string
          campaign_id: string
          created_at: string | null
          error_message: string | null
          id: string
          message: string | null
          metadata: Json | null
          notification_type: string
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          campaign_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          notification_type: string
          recipient: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          campaign_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          notification_type?: string
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      operations_photos: {
        Row: {
          asset_id: string
          campaign_id: string
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          photo_url: string
          tag: string
          tags: string[] | null
          updated_at: string | null
          uploaded_at: string
          uploaded_by: string | null
          validation_issues: Json | null
          validation_score: number | null
          validation_suggestions: Json | null
        }
        Insert: {
          asset_id: string
          campaign_id: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_url: string
          tag: string
          tags?: string[] | null
          updated_at?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          validation_issues?: Json | null
          validation_score?: number | null
          validation_suggestions?: Json | null
        }
        Update: {
          asset_id?: string
          campaign_id?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_url?: string
          tag?: string
          tags?: string[] | null
          updated_at?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          validation_issues?: Json | null
          validation_score?: number | null
          validation_suggestions?: Json | null
        }
        Relationships: []
      }
      operations_tasks: {
        Row: {
          area: string
          asset_id: string
          assigned_to: string | null
          campaign_id: string
          city: string
          company_id: string | null
          created_at: string | null
          deadline_date: string | null
          end_date: string | null
          id: string
          job_type: string
          location: string
          media_type: string
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          area: string
          asset_id: string
          assigned_to?: string | null
          campaign_id: string
          city: string
          company_id?: string | null
          created_at?: string | null
          deadline_date?: string | null
          end_date?: string | null
          id?: string
          job_type: string
          location: string
          media_type: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          area?: string
          asset_id?: string
          assigned_to?: string | null
          campaign_id?: string
          city?: string
          company_id?: string | null
          created_at?: string | null
          deadline_date?: string | null
          end_date?: string | null
          id?: string
          job_type?: string
          location?: string
          media_type?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_operations_tasks_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_operations_tasks_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_operations_tasks_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_operations_tasks_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_operations_tasks_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "operations_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          address: string | null
          auto_generate_ppt_on_completion: boolean | null
          city: string | null
          client_portal_settings: Json | null
          company_id: string | null
          created_at: string | null
          default_payment_terms: string | null
          email: string | null
          gps_tolerance_meters: number | null
          gstin: string | null
          hero_image_url: string | null
          id: string
          logo_url: string | null
          notify_manager_on_ppt_generation: boolean | null
          organization_name: string | null
          phone: string | null
          pincode: string | null
          ppt_accent_color: string | null
          ppt_footer_text: string | null
          ppt_include_company_logo: boolean | null
          ppt_layout_style: string | null
          ppt_primary_color: string | null
          ppt_secondary_color: string | null
          ppt_template_name: string | null
          ppt_watermark_enabled: boolean | null
          primary_color: string | null
          primary_contact: string | null
          require_proof_approval: boolean | null
          secondary_color: string | null
          state: string | null
          updated_at: string | null
          updated_by: string | null
          upi_id: string | null
          upi_name: string | null
          watermark_font_size: number | null
          watermark_include_logo: boolean | null
          watermark_include_timestamp: boolean | null
          watermark_opacity: number | null
          watermark_position: string | null
          watermark_text: string | null
        }
        Insert: {
          address?: string | null
          auto_generate_ppt_on_completion?: boolean | null
          city?: string | null
          client_portal_settings?: Json | null
          company_id?: string | null
          created_at?: string | null
          default_payment_terms?: string | null
          email?: string | null
          gps_tolerance_meters?: number | null
          gstin?: string | null
          hero_image_url?: string | null
          id?: string
          logo_url?: string | null
          notify_manager_on_ppt_generation?: boolean | null
          organization_name?: string | null
          phone?: string | null
          pincode?: string | null
          ppt_accent_color?: string | null
          ppt_footer_text?: string | null
          ppt_include_company_logo?: boolean | null
          ppt_layout_style?: string | null
          ppt_primary_color?: string | null
          ppt_secondary_color?: string | null
          ppt_template_name?: string | null
          ppt_watermark_enabled?: boolean | null
          primary_color?: string | null
          primary_contact?: string | null
          require_proof_approval?: boolean | null
          secondary_color?: string | null
          state?: string | null
          updated_at?: string | null
          updated_by?: string | null
          upi_id?: string | null
          upi_name?: string | null
          watermark_font_size?: number | null
          watermark_include_logo?: boolean | null
          watermark_include_timestamp?: boolean | null
          watermark_opacity?: number | null
          watermark_position?: string | null
          watermark_text?: string | null
        }
        Update: {
          address?: string | null
          auto_generate_ppt_on_completion?: boolean | null
          city?: string | null
          client_portal_settings?: Json | null
          company_id?: string | null
          created_at?: string | null
          default_payment_terms?: string | null
          email?: string | null
          gps_tolerance_meters?: number | null
          gstin?: string | null
          hero_image_url?: string | null
          id?: string
          logo_url?: string | null
          notify_manager_on_ppt_generation?: boolean | null
          organization_name?: string | null
          phone?: string | null
          pincode?: string | null
          ppt_accent_color?: string | null
          ppt_footer_text?: string | null
          ppt_include_company_logo?: boolean | null
          ppt_layout_style?: string | null
          ppt_primary_color?: string | null
          ppt_secondary_color?: string | null
          ppt_template_name?: string | null
          ppt_watermark_enabled?: boolean | null
          primary_color?: string | null
          primary_contact?: string | null
          require_proof_approval?: boolean | null
          secondary_color?: string | null
          state?: string | null
          updated_at?: string | null
          updated_by?: string | null
          upi_id?: string | null
          upi_name?: string | null
          watermark_font_size?: number | null
          watermark_include_logo?: boolean | null
          watermark_include_timestamp?: boolean | null
          watermark_opacity?: number | null
          watermark_position?: string | null
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      page_field_catalog: {
        Row: {
          created_at: string
          data_type: string
          field_key: string
          group_name: string
          id: string
          is_default: boolean
          is_exportable: boolean
          is_filterable: boolean
          label: string
          page_key: string
          sort_order: number
          updated_at: string
          width: number | null
        }
        Insert: {
          created_at?: string
          data_type?: string
          field_key: string
          group_name: string
          id?: string
          is_default?: boolean
          is_exportable?: boolean
          is_filterable?: boolean
          label: string
          page_key: string
          sort_order?: number
          updated_at?: string
          width?: number | null
        }
        Update: {
          created_at?: string
          data_type?: string
          field_key?: string
          group_name?: string
          id?: string
          is_default?: boolean
          is_exportable?: boolean
          is_filterable?: boolean
          label?: string
          page_key?: string
          sort_order?: number
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      payable_batches: {
        Row: {
          company_id: string
          generated_at: string
          generated_by: string | null
          id: string
          month_key: string
          notes: string | null
          total_amount: number
          total_entries: number
        }
        Insert: {
          company_id: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          month_key: string
          notes?: string | null
          total_amount?: number
          total_entries?: number
        }
        Update: {
          company_id?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          month_key?: string
          notes?: string | null
          total_amount?: number
          total_entries?: number
        }
        Relationships: [
          {
            foreignKeyName: "payable_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_confirmations: {
        Row: {
          approved_amount: number | null
          approved_at: string | null
          approved_by: string | null
          approved_date: string | null
          approved_method: string | null
          approved_reference: string | null
          claimed_amount: number
          claimed_date: string | null
          claimed_method: string | null
          claimed_reference: string | null
          client_id: string
          company_id: string | null
          created_at: string | null
          created_by: string | null
          email_send_error: string | null
          email_send_status: string | null
          email_sent_at: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_record_id: string | null
          receipt_id: string | null
          rejection_reason: string | null
          send_email: boolean | null
          send_whatsapp: boolean | null
          status: string
          submitted_at: string | null
          updated_at: string | null
          whatsapp_from: string | null
          whatsapp_media_url: string | null
          whatsapp_message: string | null
          whatsapp_send_error: string | null
          whatsapp_send_status: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          approved_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          approved_date?: string | null
          approved_method?: string | null
          approved_reference?: string | null
          claimed_amount: number
          claimed_date?: string | null
          claimed_method?: string | null
          claimed_reference?: string | null
          client_id: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email_send_error?: string | null
          email_send_status?: string | null
          email_sent_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_record_id?: string | null
          receipt_id?: string | null
          rejection_reason?: string | null
          send_email?: boolean | null
          send_whatsapp?: boolean | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          whatsapp_from?: string | null
          whatsapp_media_url?: string | null
          whatsapp_message?: string | null
          whatsapp_send_error?: string | null
          whatsapp_send_status?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          approved_amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          approved_date?: string | null
          approved_method?: string | null
          approved_reference?: string | null
          claimed_amount?: number
          claimed_date?: string | null
          claimed_method?: string | null
          claimed_reference?: string | null
          client_id?: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email_send_error?: string | null
          email_send_status?: string | null
          email_sent_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_record_id?: string | null
          receipt_id?: string | null
          rejection_reason?: string | null
          send_email?: boolean | null
          send_whatsapp?: boolean | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          whatsapp_from?: string | null
          whatsapp_media_url?: string | null
          whatsapp_message?: string | null
          whatsapp_send_error?: string | null
          whatsapp_send_status?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_confirmations_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payment_confirmations_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payment_confirmations_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_no"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_aging_report"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_dues"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payment_confirmations_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          campaign_id: string | null
          client_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          invoice_id: string
          is_deleted: boolean | null
          method: string
          notes: string | null
          payment_date: string
          reference_no: string | null
          tds_amount: number
          tds_certificate_no: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          invoice_id: string
          is_deleted?: boolean | null
          method?: string
          notes?: string | null
          payment_date?: string
          reference_no?: string | null
          tds_amount?: number
          tds_certificate_no?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          invoice_id?: string
          is_deleted?: boolean | null
          method?: string
          notes?: string | null
          payment_date?: string
          reference_no?: string | null
          tds_amount?: number
          tds_certificate_no?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          invoice_id: string
          method: string
          reminder_number: number
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          invoice_id: string
          method: string
          reminder_number: number
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string
          method?: string
          reminder_number?: number
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          asset_id: string
          bank_name: string | null
          bill_id: string
          completed_at: string | null
          created_at: string | null
          failure_reason: string | null
          id: string
          initiated_at: string | null
          initiated_by: string | null
          metadata: Json | null
          payment_gateway: string | null
          payment_method: string
          status: string
          transaction_id: string | null
          updated_at: string | null
          upi_id: string | null
        }
        Insert: {
          amount: number
          asset_id: string
          bank_name?: string | null
          bill_id: string
          completed_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          metadata?: Json | null
          payment_gateway?: string | null
          payment_method: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          upi_id?: string | null
        }
        Update: {
          amount?: number
          asset_id?: string
          bank_name?: string | null
          bill_id?: string
          completed_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          metadata?: Json | null
          payment_gateway?: string | null
          payment_method?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "asset_power_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_favorites: {
        Row: {
          created_at: string | null
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_favorites_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "operations_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_tags: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          usage_count: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          usage_count?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      plan_approvals: {
        Row: {
          approval_level: Database["public"]["Enums"]["approval_level"]
          approved_at: string | null
          approver_id: string | null
          comments: string | null
          created_at: string | null
          id: string
          plan_id: string
          required_role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string | null
        }
        Insert: {
          approval_level: Database["public"]["Enums"]["approval_level"]
          approved_at?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          plan_id: string
          required_role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string | null
        }
        Update: {
          approval_level?: Database["public"]["Enums"]["approval_level"]
          approved_at?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string | null
          id?: string
          plan_id?: string
          required_role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_approvals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_approvals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_item_faces: {
        Row: {
          asset_id: string
          created_at: string | null
          face_label: string
          height: number | null
          id: string
          illumination_type: string | null
          order_index: number | null
          photo_url: string | null
          plan_item_id: string
          sqft: number | null
          width: number | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          face_label: string
          height?: number | null
          id?: string
          illumination_type?: string | null
          order_index?: number | null
          photo_url?: string | null
          plan_item_id: string
          sqft?: number | null
          width?: number | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          face_label?: string
          height?: number | null
          id?: string
          illumination_type?: string | null
          order_index?: number | null
          photo_url?: string | null
          plan_item_id?: string
          sqft?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_item_faces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_item_faces_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          area: string
          asset_id: string
          base_rent: number | null
          billing_mode: string
          booked_days: number | null
          card_rate: number
          cgst_amount: number | null
          city: string
          created_at: string | null
          daily_rate: number | null
          dimensions: string
          direction: string | null
          discount_amount: number | null
          discount_type: string | null
          discount_value: number | null
          district: string | null
          end_date: string | null
          gst_amount: number
          id: string
          igst_amount: number | null
          illumination_type: string | null
          installation_cost: number | null
          installation_mode: string | null
          installation_rate: number | null
          latitude: number | null
          location: string
          longitude: number | null
          media_type: string
          mounting_charges: number | null
          mounting_cost: number
          mounting_rate: number
          plan_id: string
          printing_charges: number | null
          printing_cost: number | null
          printing_mode: string | null
          printing_rate: number | null
          rent_amount: number | null
          sales_price: number
          sgst_amount: number | null
          start_date: string | null
          state: string | null
          subtotal: number
          tax_type: string | null
          total_sqft: number | null
          total_with_gst: number
        }
        Insert: {
          area: string
          asset_id: string
          base_rent?: number | null
          billing_mode?: string
          booked_days?: number | null
          card_rate: number
          cgst_amount?: number | null
          city: string
          created_at?: string | null
          daily_rate?: number | null
          dimensions: string
          direction?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          district?: string | null
          end_date?: string | null
          gst_amount: number
          id?: string
          igst_amount?: number | null
          illumination_type?: string | null
          installation_cost?: number | null
          installation_mode?: string | null
          installation_rate?: number | null
          latitude?: number | null
          location: string
          longitude?: number | null
          media_type: string
          mounting_charges?: number | null
          mounting_cost?: number
          mounting_rate?: number
          plan_id: string
          printing_charges?: number | null
          printing_cost?: number | null
          printing_mode?: string | null
          printing_rate?: number | null
          rent_amount?: number | null
          sales_price: number
          sgst_amount?: number | null
          start_date?: string | null
          state?: string | null
          subtotal: number
          tax_type?: string | null
          total_sqft?: number | null
          total_with_gst: number
        }
        Update: {
          area?: string
          asset_id?: string
          base_rent?: number | null
          billing_mode?: string
          booked_days?: number | null
          card_rate?: number
          cgst_amount?: number | null
          city?: string
          created_at?: string | null
          daily_rate?: number | null
          dimensions?: string
          direction?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          district?: string | null
          end_date?: string | null
          gst_amount?: number
          id?: string
          igst_amount?: number | null
          illumination_type?: string | null
          installation_cost?: number | null
          installation_mode?: string | null
          installation_rate?: number | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          media_type?: string
          mounting_charges?: number | null
          mounting_cost?: number
          mounting_rate?: number
          plan_id?: string
          printing_charges?: number | null
          printing_cost?: number | null
          printing_mode?: string | null
          printing_rate?: number | null
          rent_amount?: number | null
          sales_price?: number
          sgst_amount?: number | null
          start_date?: string | null
          state?: string | null
          subtotal?: number
          tax_type?: string | null
          total_sqft?: number | null
          total_with_gst?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_ro_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          plan_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          plan_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          plan_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_ro_tokens_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_ro_tokens_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_template_items: {
        Row: {
          asset_id: string
          company_id: string
          created_at: string | null
          default_base_rent: number | null
          default_mounting_charges: number | null
          default_printing_charges: number | null
          id: string
          position_index: number | null
          template_id: string
        }
        Insert: {
          asset_id: string
          company_id: string
          created_at?: string | null
          default_base_rent?: number | null
          default_mounting_charges?: number | null
          default_printing_charges?: number | null
          id?: string
          position_index?: number | null
          template_id: string
        }
        Update: {
          asset_id?: string
          company_id?: string
          created_at?: string | null
          default_base_rent?: number | null
          default_mounting_charges?: number | null
          default_printing_charges?: number | null
          id?: string
          position_index?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_template_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_template_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_template_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_template_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_template_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_template_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_template_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_template_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_template_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_template_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_template_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "plan_template_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_template_usage: {
        Row: {
          company_id: string
          id: string
          plan_id: string | null
          template_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          company_id: string
          id?: string
          plan_id?: string | null
          template_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          company_id?: string
          id?: string
          plan_id?: string | null
          template_id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_template_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_template_usage_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_template_usage_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_template_usage_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_templates: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          default_client_id: string | null
          description: string | null
          duration_days: number | null
          gst_percent: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          plan_type: string | null
          tags: string[] | null
          template_name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          default_client_id?: string | null
          description?: string | null
          duration_days?: number | null
          gst_percent?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          plan_type?: string | null
          tags?: string[] | null
          template_name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          default_client_id?: string | null
          description?: string | null
          duration_days?: number | null
          gst_percent?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          plan_type?: string | null
          tags?: string[] | null
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_templates_default_client_id_fkey"
            columns: ["default_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_templates_default_client_id_fkey"
            columns: ["default_client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_templates_default_client_id_fkey"
            columns: ["default_client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_terms_settings: {
        Row: {
          created_at: string | null
          id: string
          terms: string[]
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          terms?: string[]
          title?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          terms?: string[]
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          archived_at: string | null
          archived_reason: string | null
          cgst_amount: number | null
          cgst_percent: number | null
          client_id: string
          client_name: string
          company_id: string
          converted_at: string | null
          converted_to_campaign_id: string | null
          created_at: string | null
          created_by: string
          duration_days: number
          duration_mode: string | null
          end_date: string
          export_links: Json | null
          grand_total: number
          gst_amount: number
          gst_percent: number
          id: string
          igst_amount: number | null
          igst_percent: number | null
          is_archived: boolean
          manual_discount_amount: number | null
          manual_discount_reason: string | null
          months_count: number | null
          notes: string | null
          owner_company_id: string | null
          owner_id: string | null
          payment_terms: string | null
          plan_name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          quotation_validity_days: number | null
          secondary_owner_ids: string[] | null
          sgst_amount: number | null
          sgst_percent: number | null
          share_link_active: boolean | null
          share_token: string | null
          signed_ro_uploaded_at: string | null
          signed_ro_uploaded_by: string | null
          signed_ro_url: string | null
          start_date: string
          status: Database["public"]["Enums"]["plan_status"]
          tax_type: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_reason?: string | null
          cgst_amount?: number | null
          cgst_percent?: number | null
          client_id: string
          client_name: string
          company_id: string
          converted_at?: string | null
          converted_to_campaign_id?: string | null
          created_at?: string | null
          created_by: string
          duration_days: number
          duration_mode?: string | null
          end_date: string
          export_links?: Json | null
          grand_total?: number
          gst_amount?: number
          gst_percent?: number
          id: string
          igst_amount?: number | null
          igst_percent?: number | null
          is_archived?: boolean
          manual_discount_amount?: number | null
          manual_discount_reason?: string | null
          months_count?: number | null
          notes?: string | null
          owner_company_id?: string | null
          owner_id?: string | null
          payment_terms?: string | null
          plan_name: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          quotation_validity_days?: number | null
          secondary_owner_ids?: string[] | null
          sgst_amount?: number | null
          sgst_percent?: number | null
          share_link_active?: boolean | null
          share_token?: string | null
          signed_ro_uploaded_at?: string | null
          signed_ro_uploaded_by?: string | null
          signed_ro_url?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["plan_status"]
          tax_type?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_reason?: string | null
          cgst_amount?: number | null
          cgst_percent?: number | null
          client_id?: string
          client_name?: string
          company_id?: string
          converted_at?: string | null
          converted_to_campaign_id?: string | null
          created_at?: string | null
          created_by?: string
          duration_days?: number
          duration_mode?: string | null
          end_date?: string
          export_links?: Json | null
          grand_total?: number
          gst_amount?: number
          gst_percent?: number
          id?: string
          igst_amount?: number | null
          igst_percent?: number | null
          is_archived?: boolean
          manual_discount_amount?: number | null
          manual_discount_reason?: string | null
          months_count?: number | null
          notes?: string | null
          owner_company_id?: string | null
          owner_id?: string | null
          payment_terms?: string | null
          plan_name?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          quotation_validity_days?: number | null
          secondary_owner_ids?: string[] | null
          sgst_amount?: number | null
          sgst_percent?: number | null
          share_link_active?: boolean | null
          share_token?: string | null
          signed_ro_uploaded_at?: string | null
          signed_ro_uploaded_by?: string | null
          signed_ro_url?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["plan_status"]
          tax_type?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_converted_campaign"
            columns: ["converted_to_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_converted_campaign"
            columns: ["converted_to_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_converted_campaign"
            columns: ["converted_to_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_converted_campaign"
            columns: ["converted_to_campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_converted_campaign"
            columns: ["converted_to_campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_owner_company_id_fkey"
            columns: ["owner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_role_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_update: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module_name: string
          role_id: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_update?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_name: string
          role_id?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_update?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_name?: string
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "platform_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system_role: boolean | null
          role_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          role_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          role_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      power_bill_jobs: {
        Row: {
          asset_id: string
          created_at: string | null
          error_message: string | null
          id: string
          job_status: string
          job_type: string
          result: Json | null
          run_date: string
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_status?: string
          job_type?: string
          result?: Json | null
          run_date?: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_status?: string
          job_type?: string
          result?: Json | null
          run_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          phone: string | null
          tour_completed: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id: string
          phone?: string | null
          tour_completed?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          phone?: string | null
          tour_completed?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      proforma_invoice_items: {
        Row: {
          area: string | null
          asset_id: string
          company_id: string | null
          created_at: string
          dimension_height: number
          dimension_width: number
          direction: string | null
          discount: number
          display_name: string
          id: string
          illumination_type: string | null
          line_total: number
          location: string | null
          mounting_charge: number
          negotiated_rate: number
          printing_charge: number
          proforma_invoice_id: string
          total_sqft: number
        }
        Insert: {
          area?: string | null
          asset_id: string
          company_id?: string | null
          created_at?: string
          dimension_height?: number
          dimension_width?: number
          direction?: string | null
          discount?: number
          display_name: string
          id?: string
          illumination_type?: string | null
          line_total?: number
          location?: string | null
          mounting_charge?: number
          negotiated_rate?: number
          printing_charge?: number
          proforma_invoice_id: string
          total_sqft?: number
        }
        Update: {
          area?: string | null
          asset_id?: string
          company_id?: string | null
          created_at?: string
          dimension_height?: number
          dimension_width?: number
          direction?: string | null
          discount?: number
          display_name?: string
          id?: string
          illumination_type?: string | null
          line_total?: number
          location?: string | null
          mounting_charge?: number
          negotiated_rate?: number
          printing_charge?: number
          proforma_invoice_id?: string
          total_sqft?: number
        }
        Relationships: [
          {
            foreignKeyName: "proforma_invoice_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_invoice_items_proforma_invoice_id_fkey"
            columns: ["proforma_invoice_id"]
            isOneToOne: false
            referencedRelation: "proforma_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      proforma_invoices: {
        Row: {
          additional_notes: string | null
          campaign_end_date: string | null
          campaign_start_date: string | null
          cgst_amount: number
          client_address: string | null
          client_gstin: string | null
          client_name: string
          client_state: string | null
          company_id: string | null
          created_at: string
          discount_total: number
          grand_total: number
          id: string
          mounting_total: number
          plan_name: string | null
          printing_total: number
          proforma_date: string
          proforma_number: string
          reference_plan_id: string | null
          sgst_amount: number
          status: string
          subtotal: number
          taxable_amount: number
          total_tax: number
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          campaign_end_date?: string | null
          campaign_start_date?: string | null
          cgst_amount?: number
          client_address?: string | null
          client_gstin?: string | null
          client_name: string
          client_state?: string | null
          company_id?: string | null
          created_at?: string
          discount_total?: number
          grand_total?: number
          id?: string
          mounting_total?: number
          plan_name?: string | null
          printing_total?: number
          proforma_date?: string
          proforma_number: string
          reference_plan_id?: string | null
          sgst_amount?: number
          status?: string
          subtotal?: number
          taxable_amount?: number
          total_tax?: number
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          campaign_end_date?: string | null
          campaign_start_date?: string | null
          cgst_amount?: number
          client_address?: string | null
          client_gstin?: string | null
          client_name?: string
          client_state?: string | null
          company_id?: string | null
          created_at?: string
          discount_total?: number
          grand_total?: number
          id?: string
          mounting_total?: number
          plan_name?: string | null
          printing_total?: number
          proforma_date?: string
          proforma_number?: string
          reference_plan_id?: string | null
          sgst_amount?: number
          status?: string
          subtotal?: number
          taxable_amount?: number
          total_tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proforma_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string | null
          id: string
          key: string
          last_request: string | null
          requests: number[] | null
          updated_at: string | null
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          key: string
          last_request?: string | null
          requests?: number[] | null
          updated_at?: string | null
        }
        Update: {
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          key?: string
          last_request?: string | null
          requests?: number[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_settings: {
        Row: {
          category: string
          city: string | null
          company_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          is_active: boolean
          media_type: string | null
          notes: string | null
          rate_value: number
          threshold_days: number | null
          updated_at: string
        }
        Insert: {
          category: string
          city?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          is_active?: boolean
          media_type?: string | null
          notes?: string | null
          rate_value?: number
          threshold_days?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          city?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          is_active?: boolean
          media_type?: string | null
          notes?: string | null
          rate_value?: number
          threshold_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_sequences: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          next_number: number
          updated_at: string | null
          year_month: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          next_number?: number
          updated_at?: string | null
          year_month: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          next_number?: number
          updated_at?: string | null
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount_received: number
          client_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_method: string | null
          payment_record_id: string | null
          pdf_url: string | null
          receipt_date: string
          receipt_no: string
          reference_no: string | null
        }
        Insert: {
          amount_received?: number
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_record_id?: string | null
          pdf_url?: string | null
          receipt_date?: string
          receipt_no: string
          reference_no?: string | null
        }
        Update: {
          amount_received?: number
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_record_id?: string | null
          pdf_url?: string | null
          receipt_date?: string
          receipt_no?: string
          reference_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_no"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_aging_report"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_dues"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "receipts_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: true
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_searches: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          search_query: string
          search_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          search_query: string
          search_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          search_query?: string
          search_type?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_settings: {
        Row: {
          created_at: string | null
          days_before: number
          email_template: string | null
          id: string
          is_active: boolean | null
          reminder_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_before: number
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          reminder_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_before?: number
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          reminder_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_approve: boolean
          can_assign: boolean
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean
          can_export: boolean
          can_update: boolean | null
          can_upload_proof: boolean
          can_view: boolean | null
          can_view_contacts: boolean
          can_view_financial: boolean
          can_view_sensitive: boolean
          company_id: string | null
          created_at: string | null
          id: string
          module: string
          role: string
          scope_mode: string
          updated_at: string | null
        }
        Insert: {
          can_approve?: boolean
          can_assign?: boolean
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean
          can_export?: boolean
          can_update?: boolean | null
          can_upload_proof?: boolean
          can_view?: boolean | null
          can_view_contacts?: boolean
          can_view_financial?: boolean
          can_view_sensitive?: boolean
          company_id?: string | null
          created_at?: string | null
          id?: string
          module: string
          role: string
          scope_mode?: string
          updated_at?: string | null
        }
        Update: {
          can_approve?: boolean
          can_assign?: boolean
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean
          can_export?: boolean
          can_update?: boolean | null
          can_upload_proof?: boolean
          can_view?: boolean | null
          can_view_contacts?: boolean
          can_view_financial?: boolean
          can_view_sensitive?: boolean
          company_id?: string | null
          created_at?: string | null
          id?: string
          module?: string
          role?: string
          scope_mode?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          is_favorite: boolean
          last_used_at: string | null
          name: string
          search_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          is_favorite?: boolean
          last_used_at?: string | null
          name: string
          search_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          is_favorite?: boolean
          last_used_at?: string | null
          name?: string
          search_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          ip_address: string | null
          metadata: Json | null
          record_ids: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          record_ids?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          record_ids?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          assets_count: number | null
          calculated_at: string | null
          campaigns_count: number | null
          company_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          storage_used_mb: number | null
          subscription_id: string
          users_count: number | null
        }
        Insert: {
          assets_count?: number | null
          calculated_at?: string | null
          campaigns_count?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          storage_used_mb?: number | null
          subscription_id: string
          users_count?: number | null
        }
        Update: {
          assets_count?: number | null
          calculated_at?: string | null
          campaigns_count?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          storage_used_mb?: number | null
          subscription_id?: string
          users_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean | null
          billing_cycle: string
          company_id: string
          created_at: string | null
          currency: string
          end_date: string
          id: string
          max_assets: number | null
          max_campaigns: number | null
          max_users: number | null
          metadata: Json | null
          razorpay_plan_id: string | null
          razorpay_subscription_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string | null
        }
        Insert: {
          amount?: number
          auto_renew?: boolean | null
          billing_cycle?: string
          company_id: string
          created_at?: string | null
          currency?: string
          end_date: string
          id?: string
          max_assets?: number | null
          max_campaigns?: number | null
          max_users?: number | null
          metadata?: Json | null
          razorpay_plan_id?: string | null
          razorpay_subscription_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Update: {
          amount?: number
          auto_renew?: boolean | null
          billing_cycle?: string
          company_id?: string
          created_at?: string | null
          currency?: string
          end_date?: string
          id?: string
          max_assets?: number | null
          max_campaigns?: number | null
          max_users?: number | null
          metadata?: Json | null
          razorpay_plan_id?: string | null
          razorpay_subscription_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      table_views: {
        Row: {
          configuration: Json
          created_at: string | null
          id: string
          is_default: boolean | null
          table_key: string
          updated_at: string | null
          user_id: string
          view_name: string
        }
        Insert: {
          configuration: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          table_key: string
          updated_at?: string | null
          user_id: string
          view_name: string
        }
        Update: {
          configuration?: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          table_key?: string
          updated_at?: string | null
          user_id?: string
          view_name?: string
        }
        Relationships: []
      }
      tax_settings: {
        Row: {
          company_id: string
          created_at: string | null
          default_tds_rate: number | null
          einvoicing_api_key: string | null
          einvoicing_api_secret: string | null
          einvoicing_enabled: boolean | null
          enable_einvoicing: boolean | null
          enable_eway_bill: boolean | null
          eway_bill_api_key: string | null
          eway_bill_api_secret: string | null
          eway_bill_enabled: boolean | null
          gstin: string | null
          id: string
          msme_number: string | null
          msme_registered: boolean | null
          pan: string | null
          tan_number: string | null
          tcs_default_rate: number | null
          tcs_enabled: boolean | null
          tcs_threshold: number | null
          tds_applicable: boolean | null
          tds_enabled: boolean | null
          tds_percentage: number | null
          tds_verify_pan: boolean | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          default_tds_rate?: number | null
          einvoicing_api_key?: string | null
          einvoicing_api_secret?: string | null
          einvoicing_enabled?: boolean | null
          enable_einvoicing?: boolean | null
          enable_eway_bill?: boolean | null
          eway_bill_api_key?: string | null
          eway_bill_api_secret?: string | null
          eway_bill_enabled?: boolean | null
          gstin?: string | null
          id?: string
          msme_number?: string | null
          msme_registered?: boolean | null
          pan?: string | null
          tan_number?: string | null
          tcs_default_rate?: number | null
          tcs_enabled?: boolean | null
          tcs_threshold?: number | null
          tds_applicable?: boolean | null
          tds_enabled?: boolean | null
          tds_percentage?: number | null
          tds_verify_pan?: boolean | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          default_tds_rate?: number | null
          einvoicing_api_key?: string | null
          einvoicing_api_secret?: string | null
          einvoicing_enabled?: boolean | null
          enable_einvoicing?: boolean | null
          enable_eway_bill?: boolean | null
          eway_bill_api_key?: string | null
          eway_bill_api_secret?: string | null
          eway_bill_enabled?: boolean | null
          gstin?: string | null
          id?: string
          msme_number?: string | null
          msme_registered?: boolean | null
          pan?: string | null
          tan_number?: string | null
          tcs_default_rate?: number | null
          tcs_enabled?: boolean | null
          tcs_threshold?: number | null
          tds_applicable?: boolean | null
          tds_enabled?: boolean | null
          tds_percentage?: number | null
          tds_verify_pan?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_ledger: {
        Row: {
          amount_received: number | null
          client_id: string
          company_id: string
          created_at: string
          financial_year: string
          followup_date: string | null
          followup_notes: string | null
          form16a_received: boolean
          id: string
          invoice_amount: number | null
          invoice_id: string
          payment_record_id: string | null
          quarter: string
          reflected_in_26as: boolean
          status: string
          tds_amount: number
          tds_certificate_no: string | null
          tds_section: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          amount_received?: number | null
          client_id: string
          company_id: string
          created_at?: string
          financial_year: string
          followup_date?: string | null
          followup_notes?: string | null
          form16a_received?: boolean
          id?: string
          invoice_amount?: number | null
          invoice_id: string
          payment_record_id?: string | null
          quarter: string
          reflected_in_26as?: boolean
          status?: string
          tds_amount?: number
          tds_certificate_no?: string | null
          tds_section?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          amount_received?: number | null
          client_id?: string
          company_id?: string
          created_at?: string
          financial_year?: string
          followup_date?: string | null
          followup_notes?: string | null
          form16a_received?: boolean
          id?: string
          invoice_amount?: number | null
          invoice_id?: string
          payment_record_id?: string | null
          quarter?: string
          reflected_in_26as?: boolean
          status?: string
          tds_amount?: number
          tds_certificate_no?: string | null
          tds_section?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tds_ledger_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_ledger_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          added_at: string | null
          added_by: string | null
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "user_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_permissions: {
        Row: {
          can_access: boolean | null
          created_at: string | null
          id: string
          module: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          can_access?: boolean | null
          created_at?: string | null
          id?: string
          module: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          can_access?: boolean | null
          created_at?: string | null
          id?: string
          module?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_permissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "user_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      template_favorites: {
        Row: {
          created_at: string | null
          id: string
          template_config: Json
          template_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          template_config: Json
          template_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          template_config?: Json
          template_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          booking_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string | null
          currency: string
          description: string | null
          gst_amount: number | null
          id: string
          metadata: Json | null
          payment_method: string | null
          plan_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          subscription_id: string | null
          total_amount: number
          transaction_date: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          gst_amount?: number | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          plan_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          subscription_id?: string | null
          total_amount: number
          transaction_date?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          gst_amount?: number | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          plan_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          subscription_id?: string | null
          total_amount?: number
          transaction_date?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      unused_asset_codes: {
        Row: {
          created_at: string | null
          generated_code: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          generated_code: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          generated_code?: string
          used?: boolean | null
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          activity_description: string | null
          activity_type: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_description?: string | null
          activity_type: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_description?: string | null
          activity_type?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_audit_logs: {
        Row: {
          action: string
          action_by: string
          changed_fields: Json | null
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          action_by: string
          changed_fields?: Json | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          action_by?: string
          changed_fields?: Json | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_menu_favorites: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          menu_item_label: string
          menu_item_path: string
          pinned_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          menu_item_label: string
          menu_item_path: string
          pinned_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          menu_item_label?: string
          menu_item_path?: string
          pinned_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_menu_preferences: {
        Row: {
          created_at: string | null
          hidden_sections: string[] | null
          id: string
          section_order: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hidden_sections?: string[] | null
          id?: string
          section_order?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hidden_sections?: string[] | null
          id?: string
          section_order?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_teams: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      watermark_settings: {
        Row: {
          background_color: string
          border_color: string
          company_id: string | null
          created_at: string
          fields_to_show: Json
          font_size: number
          id: string
          logo_url: string | null
          panel_padding: number
          panel_width: number
          position: Database["public"]["Enums"]["watermark_position"]
          show_logo: boolean
          text_color: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          border_color?: string
          company_id?: string | null
          created_at?: string
          fields_to_show?: Json
          font_size?: number
          id?: string
          logo_url?: string | null
          panel_padding?: number
          panel_width?: number
          position?: Database["public"]["Enums"]["watermark_position"]
          show_logo?: boolean
          text_color?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          border_color?: string
          company_id?: string | null
          created_at?: string
          fields_to_show?: Json
          font_size?: number
          id?: string
          logo_url?: string | null
          panel_padding?: number
          panel_width?: number
          position?: Database["public"]["Enums"]["watermark_position"]
          show_logo?: boolean
          text_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watermark_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          campaign_id: string | null
          content_type: string | null
          created_at: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          media_url: string | null
          message_body: string | null
          message_type: string
          phone_number: string
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          content_type?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          media_url?: string | null
          message_body?: string | null
          message_type: string
          phone_number: string
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          content_type?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          media_url?: string | null
          message_body?: string | null
          message_type?: string
          phone_number?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      asset_availability_view: {
        Row: {
          area: string | null
          asset_id: string | null
          authority: string | null
          availability_status: string | null
          base_rate: number | null
          booking_end_date: string | null
          booking_start_date: string | null
          booking_type: string | null
          card_rate: number | null
          category: Database["public"]["Enums"]["media_category"] | null
          city: string | null
          client_name: string | null
          company_id: string | null
          current_campaign_id: string | null
          current_campaign_name: string | null
          current_plan_id: string | null
          current_plan_name: string | null
          display_label: string | null
          effective_booking_end: string | null
          effective_booking_start: string | null
          facing: string | null
          illumination_type: string | null
          is_future_booking: boolean | null
          is_held: boolean | null
          is_running: boolean | null
          location: string | null
          media_asset_code: string | null
          media_type: string | null
          next_available_date: string | null
          size: string | null
          total_sqft: number | null
        }
        Relationships: []
      }
      asset_code_audit_view: {
        Row: {
          area: string | null
          city: string | null
          created_at: string | null
          current_asset_code: string | null
          duplicate_count: number | null
          id: string | null
          id_is_uuid: boolean | null
          is_city_mismatch: boolean | null
          is_duplicate: boolean | null
          is_malformed: boolean | null
          is_missing: boolean | null
          is_type_mismatch: boolean | null
          is_uuid_like: boolean | null
          issue_type: string | null
          location: string | null
          media_type: string | null
          status: string | null
        }
        Relationships: []
      }
      asset_expense_summary: {
        Row: {
          area: string | null
          asset_id: string | null
          city: string | null
          company_id: string | null
          expenses_by_category: Json | null
          fy_expenses: number | null
          location: string | null
          media_asset_code: string | null
          total_expense_records: number | null
          total_expenses: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_code_audit_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_profitability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_revenue_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_calendar_heatmap"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_availability"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_asset_booking_windows"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "v_assets_default"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "media_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_profitability: {
        Row: {
          area: string | null
          asset_id: string | null
          city: string | null
          company_id: string | null
          fy_campaigns: number | null
          fy_expenses: number | null
          fy_net_profit: number | null
          fy_revenue: number | null
          location: string | null
          media_asset_code: string | null
          media_type: string | null
          net_profit: number | null
          profit_margin_percent: number | null
          total_campaigns: number | null
          total_expenses: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_revenue_summary: {
        Row: {
          area: string | null
          asset_id: string | null
          city: string | null
          company_id: string | null
          fy_campaigns: number | null
          fy_revenue: number | null
          location: string | null
          media_asset_code: string | null
          media_type: string | null
          total_campaigns: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_utilization: {
        Row: {
          area: string | null
          asset_id: string | null
          card_rate: number | null
          city: string | null
          company_id: string | null
          current_status:
            | Database["public"]["Enums"]["media_asset_status"]
            | null
          currently_booked: number | null
          days_booked_last_year: number | null
          last_booking_date: string | null
          location: string | null
          media_type: string | null
          next_booking_date: string | null
          occupancy_percent: number | null
          revenue_this_month: number | null
          total_bookings: number | null
          total_revenue: number | null
          total_sqft: number | null
        }
        Insert: {
          area?: string | null
          asset_id?: string | null
          card_rate?: number | null
          city?: string | null
          company_id?: string | null
          current_status?:
            | Database["public"]["Enums"]["media_asset_status"]
            | null
          currently_booked?: never
          days_booked_last_year?: never
          last_booking_date?: never
          location?: string | null
          media_type?: string | null
          next_booking_date?: never
          occupancy_percent?: never
          revenue_this_month?: never
          total_bookings?: never
          total_revenue?: never
          total_sqft?: number | null
        }
        Update: {
          area?: string | null
          asset_id?: string | null
          card_rate?: number | null
          city?: string | null
          company_id?: string | null
          current_status?:
            | Database["public"]["Enums"]["media_asset_status"]
            | null
          currently_booked?: never
          days_booked_last_year?: never
          last_booking_date?: never
          location?: string | null
          media_type?: string | null
          next_booking_date?: never
          occupancy_percent?: never
          revenue_this_month?: never
          total_bookings?: never
          total_revenue?: never
          total_sqft?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_public_share_safe: {
        Row: {
          campaign_name: string | null
          client_name: string | null
          end_date: string | null
          id: string | null
          public_share_enabled: boolean | null
          public_tracking_token: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
        }
        Insert: {
          campaign_name?: string | null
          client_name?: string | null
          end_date?: string | null
          id?: string | null
          public_share_enabled?: boolean | null
          public_tracking_token?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
        }
        Update: {
          campaign_name?: string | null
          client_name?: string | null
          end_date?: string | null
          id?: string | null
          public_share_enabled?: boolean | null
          public_tracking_token?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
        }
        Relationships: []
      }
      campaigns_summary_secure: {
        Row: {
          campaign_name: string | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string | null
          owner_id: string | null
          plan_id: string | null
          public_share_enabled: boolean | null
          public_tracking_token: string | null
          secondary_owner_ids: string[] | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          total_assets: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_name?: string | null
          client_id?: string | null
          client_name?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string | null
          owner_id?: string | null
          plan_id?: string | null
          public_share_enabled?: boolean | null
          public_tracking_token?: string | null
          secondary_owner_ids?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          total_assets?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_name?: string | null
          client_id?: string | null
          client_name?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string | null
          owner_id?: string | null
          plan_id?: string | null
          public_share_enabled?: boolean | null
          public_tracking_token?: string | null
          secondary_owner_ids?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          total_assets?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaigns_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaigns_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaigns_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      client_outstanding_summary: {
        Row: {
          client_id: string | null
          client_name: string | null
          company_id: string | null
          invoice_count: number | null
          overdue_amount: number | null
          overdue_count: number | null
          total_invoiced: number | null
          total_outstanding: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients_basic: {
        Row: {
          city: string | null
          company: string | null
          company_id: string | null
          created_at: string | null
          id: string | null
          name: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          company?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          company?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients_summary_secure: {
        Row: {
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_pincode: string | null
          billing_state: string | null
          city: string | null
          client_name: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          gst_number: string | null
          id: string | null
          owner_id: string | null
          secondary_owner_ids: string[] | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_pincode: string | null
          shipping_state: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_pincode?: string | null
          billing_state?: string | null
          city?: string | null
          client_name?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          gst_number?: string | null
          id?: string | null
          owner_id?: string | null
          secondary_owner_ids?: string[] | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_pincode?: string | null
          shipping_state?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_pincode?: string | null
          billing_state?: string | null
          city?: string | null
          client_name?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          gst_number?: string | null
          id?: string | null
          owner_id?: string | null
          secondary_owner_ids?: string[] | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_pincode?: string | null
          shipping_state?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_eligible_campaigns: {
        Row: {
          campaign_name: string | null
          client_email: string | null
          client_gst: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          company_id: string | null
          created_at: string | null
          end_date: string | null
          grand_total: number | null
          gst_amount: number | null
          id: string | null
          plan_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaigns_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaigns_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaigns_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_b2b_v: {
        Row: {
          cess_amount: number | null
          cgst_amount: number | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          credited_amount: number | null
          filing_month: number | null
          filing_year: number | null
          finalized_at: string | null
          gstin: string | null
          igst_amount: number | null
          invoice_date: string | null
          invoice_id: string | null
          invoice_no: string | null
          invoice_status: string | null
          invoice_type: string | null
          party_type: string | null
          place_of_supply: string | null
          place_of_supply_state_code: string | null
          reverse_charge_applicable: boolean | null
          round_off_amount: number | null
          sgst_amount: number | null
          supplier_state_code: string | null
          supply_nature: string | null
          tax_type: string | null
          taxable_value: number | null
          total_invoice_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_b2c_v: {
        Row: {
          cess_amount: number | null
          cgst_amount: number | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          credited_amount: number | null
          filing_month: number | null
          filing_year: number | null
          finalized_at: string | null
          gstin: string | null
          igst_amount: number | null
          invoice_date: string | null
          invoice_id: string | null
          invoice_no: string | null
          invoice_status: string | null
          invoice_type: string | null
          party_type: string | null
          place_of_supply: string | null
          place_of_supply_state_code: string | null
          reverse_charge_applicable: boolean | null
          round_off_amount: number | null
          sgst_amount: number | null
          supplier_state_code: string | null
          supply_nature: string | null
          tax_type: string | null
          taxable_value: number | null
          total_invoice_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_credit_note_documents_v: {
        Row: {
          cess_adjustment: number | null
          cgst_adjustment: number | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          credit_note_no: string | null
          credit_note_uuid: string | null
          filing_month: number | null
          filing_year: number | null
          gstin: string | null
          igst_adjustment: number | null
          invoice_id: string | null
          issued_at: string | null
          original_invoice_no: string | null
          party_type: string | null
          place_of_supply: string | null
          reason: string | null
          sgst_adjustment: number | null
          status: string | null
          supplier_state_code: string | null
          supply_nature: string | null
          tax_type: string | null
          taxable_adjustment: number | null
          total_adjustment_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2b_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_b2c_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_documents_v"
            referencedColumns: ["invoice_no"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "gst_invoice_register_v"
            referencedColumns: ["document_no"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_aging_report"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_dues"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      gst_credit_note_register_v: {
        Row: {
          cess_adjustment: number | null
          cgst_adjustment: number | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          document_date: string | null
          document_id: string | null
          document_kind: string | null
          document_no: string | null
          filing_month: number | null
          filing_year: number | null
          gstin: string | null
          igst_adjustment: number | null
          original_invoice_no: string | null
          party_type: string | null
          place_of_supply: string | null
          reason: string | null
          sgst_adjustment: number | null
          status: string | null
          supplier_state_code: string | null
          supply_nature: string | null
          tax_type: string | null
          taxable_adjustment: number | null
          total_adjustment_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_hsn_summary_v: {
        Row: {
          cess_amount: number | null
          cgst_amount: number | null
          company_id: string | null
          filing_month: number | null
          filing_year: number | null
          hsn_sac_code: string | null
          hsn_sac_type: string | null
          igst_amount: number | null
          invoice_count: number | null
          item_description: string | null
          sgst_amount: number | null
          taxable_value: number | null
          total_quantity: number | null
          total_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_invoice_documents_v: {
        Row: {
          cess_amount: number | null
          cgst_amount: number | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          credited_amount: number | null
          filing_month: number | null
          filing_year: number | null
          finalized_at: string | null
          gstin: string | null
          igst_amount: number | null
          invoice_date: string | null
          invoice_id: string | null
          invoice_no: string | null
          invoice_status: string | null
          invoice_type: string | null
          party_type: string | null
          place_of_supply: string | null
          place_of_supply_state_code: string | null
          reverse_charge_applicable: boolean | null
          round_off_amount: number | null
          sgst_amount: number | null
          supplier_state_code: string | null
          supply_nature: string | null
          tax_type: string | null
          taxable_value: number | null
          total_invoice_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_invoice_register_v: {
        Row: {
          cess_amount: number | null
          cgst_amount: number | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          credited_amount: number | null
          document_date: string | null
          document_id: string | null
          document_kind: string | null
          document_no: string | null
          filing_month: number | null
          filing_year: number | null
          finalized_at: string | null
          gstin: string | null
          igst_amount: number | null
          original_invoice_no: string | null
          party_type: string | null
          place_of_supply: string | null
          place_of_supply_state_code: string | null
          reverse_charge_applicable: boolean | null
          round_off_amount: number | null
          sgst_amount: number | null
          status: string | null
          supplier_state_code: string | null
          supply_nature: string | null
          tax_type: string | null
          taxable_value: number | null
          total_document_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_monthly_summary_v: {
        Row: {
          b2b_taxable_value: number | null
          b2c_taxable_value: number | null
          company_id: string | null
          credit_note_cgst_reduction: number | null
          credit_note_count: number | null
          credit_note_igst_reduction: number | null
          credit_note_sgst_reduction: number | null
          credit_note_taxable_reduction: number | null
          credit_note_total_reduction: number | null
          filing_month: number | null
          filing_year: number | null
          gross_cgst_amount: number | null
          gross_igst_amount: number | null
          gross_invoice_taxable_value: number | null
          gross_sgst_amount: number | null
          gross_total_invoice_value: number | null
          invoice_count: number | null
          net_cgst_amount: number | null
          net_igst_amount: number | null
          net_sgst_amount: number | null
          net_taxable_value: number | null
          net_total_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_statewise_summary_v: {
        Row: {
          b2b_taxable_value: number | null
          b2c_taxable_value: number | null
          cgst_amount: number | null
          company_id: string | null
          filing_month: number | null
          filing_year: number | null
          igst_amount: number | null
          invoice_count: number | null
          place_of_supply: string | null
          place_of_supply_state_code: string | null
          sgst_amount: number | null
          total_invoice_value: number | null
          total_taxable_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_validation_v: {
        Row: {
          company_id: string | null
          filing_month: number | null
          filing_year: number | null
          issue_code: string | null
          issue_message: string | null
          severity: string | null
          source_document_no: string | null
          source_id: string | null
          source_table: string | null
          suggested_fix: string | null
        }
        Relationships: []
      }
      invoice_aging_report: {
        Row: {
          aging_bucket: string | null
          balance_due: number | null
          campaign_id: string | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          days_overdue: number | null
          due_date: string | null
          invoice_date: string | null
          invoice_id: string | null
          paid_amount: number | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          total_amount: number | null
        }
        Insert: {
          aging_bucket?: never
          balance_due?: never
          campaign_id?: string | null
          client_id?: string | null
          client_name?: string | null
          company_id?: string | null
          days_overdue?: never
          due_date?: string | null
          invoice_date?: string | null
          invoice_id?: string | null
          paid_amount?: never
          status?: Database["public"]["Enums"]["invoice_status"] | null
          total_amount?: never
        }
        Update: {
          aging_bucket?: never
          balance_due?: never
          campaign_id?: string | null
          client_id?: string | null
          client_name?: string | null
          company_id?: string | null
          days_overdue?: never
          due_date?: string | null
          invoice_date?: string | null
          invoice_id?: string | null
          paid_amount?: never
          status?: Database["public"]["Enums"]["invoice_status"] | null
          total_amount?: never
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices_summary_secure: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string | null
          invoice_date: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          client_name?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string | null
          invoice_date?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          client_name?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string | null
          invoice_date?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      media_asset_forecast: {
        Row: {
          area: string | null
          asset_id: string | null
          asset_status: Database["public"]["Enums"]["media_asset_status"] | null
          booking_end_date: string | null
          booking_start_date: string | null
          booking_value: number | null
          campaign_end: string | null
          campaign_id: string | null
          campaign_name: string | null
          campaign_start: string | null
          campaign_status: Database["public"]["Enums"]["campaign_status"] | null
          city: string | null
          client_name: string | null
          company_id: string | null
          location: string | null
          media_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      media_calendar_heatmap: {
        Row: {
          asset_id: string | null
          campaign_id: string | null
          city: string | null
          client_name: string | null
          company_id: string | null
          day: string | null
          day_status: string | null
          media_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      plans_summary_secure: {
        Row: {
          asset_count: number | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          duration_days: number | null
          end_date: string | null
          id: string | null
          owner_id: string | null
          plan_name: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          secondary_owner_ids: string[] | null
          start_date: string | null
          status: Database["public"]["Enums"]["plan_status"] | null
          updated_at: string | null
        }
        Insert: {
          asset_count?: never
          client_id?: string | null
          client_name?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string | null
          owner_id?: string | null
          plan_name?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          secondary_owner_ids?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["plan_status"] | null
          updated_at?: string | null
        }
        Update: {
          asset_count?: never
          client_id?: string | null
          client_name?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string | null
          owner_id?: string | null
          plan_name?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          secondary_owner_ids?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["plan_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      public_media_assets_safe: {
        Row: {
          area: string | null
          category: Database["public"]["Enums"]["media_category"] | null
          city: string | null
          company_id: string | null
          created_at: string | null
          dimensions: string | null
          direction: string | null
          display_title: string | null
          district: string | null
          google_street_view_url: string | null
          id: string | null
          illumination_type: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_public: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          media_asset_code: string | null
          media_type: string | null
          municipal_authority: string | null
          municipal_id: string | null
          primary_photo_url: string | null
          qr_code_url: string | null
          state: string | null
          status: Database["public"]["Enums"]["media_asset_status"] | null
          tags: string[] | null
          total_sqft: number | null
          updated_at: string | null
        }
        Insert: {
          area?: string | null
          category?: Database["public"]["Enums"]["media_category"] | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          dimensions?: string | null
          direction?: string | null
          display_title?: string | null
          district?: string | null
          google_street_view_url?: string | null
          id?: string | null
          illumination_type?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          media_asset_code?: string | null
          media_type?: string | null
          municipal_authority?: string | null
          municipal_id?: string | null
          primary_photo_url?: string | null
          qr_code_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["media_asset_status"] | null
          tags?: string[] | null
          total_sqft?: number | null
          updated_at?: string | null
        }
        Update: {
          area?: string | null
          category?: Database["public"]["Enums"]["media_category"] | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          dimensions?: string | null
          direction?: string | null
          display_title?: string | null
          district?: string | null
          google_street_view_url?: string | null
          id?: string | null
          illumination_type?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          media_asset_code?: string | null
          media_type?: string | null
          municipal_authority?: string | null
          municipal_id?: string | null
          primary_photo_url?: string | null
          qr_code_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["media_asset_status"] | null
          tags?: string[] | null
          total_sqft?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles_compat: {
        Row: {
          created_at: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Relationships: []
      }
      v_asset_availability: {
        Row: {
          area: string | null
          asset_id: string | null
          availability_status: string | null
          base_rate: number | null
          booking_source_type: string | null
          card_rate: number | null
          category: Database["public"]["Enums"]["media_category"] | null
          city: string | null
          company_id: string | null
          current_booking_end: string | null
          current_booking_start: string | null
          current_campaign_id: string | null
          current_campaign_name: string | null
          current_client_name: string | null
          current_hold_client: string | null
          current_hold_end: string | null
          current_hold_id: string | null
          current_hold_start: string | null
          dimensions: string | null
          direction: string | null
          illumination_type: string | null
          location: string | null
          media_asset_code: string | null
          media_type: string | null
          municipal_authority: string | null
          next_available_date: string | null
          next_booking_end: string | null
          next_booking_start: string | null
          next_campaign_id: string | null
          next_campaign_name: string | null
          total_sqft: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_asset_booking_windows: {
        Row: {
          asset_id: string | null
          last_end_date: string | null
          live_campaign_id: string | null
          live_campaign_name: string | null
          live_client_name: string | null
          live_end_date: string | null
          live_start_date: string | null
          next_campaign_id: string | null
          next_campaign_name: string | null
          next_client_name: string | null
          next_end_date: string | null
          next_start_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["live_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["next_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["live_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["next_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["live_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["next_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["live_campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["next_campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["live_campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["next_campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      v_assets_default: {
        Row: {
          area: string | null
          asset_id: string | null
          dimension: string | null
          direction: string | null
          illumination: string | null
          location: string | null
          sqft: number | null
        }
        Insert: {
          area?: string | null
          asset_id?: string | null
          dimension?: string | null
          direction?: string | null
          illumination?: string | null
          location?: string | null
          sqft?: number | null
        }
        Update: {
          area?: string | null
          asset_id?: string | null
          dimension?: string | null
          direction?: string | null
          illumination?: string | null
          location?: string | null
          sqft?: number | null
        }
        Relationships: []
      }
      v_invoice_dues: {
        Row: {
          campaign_id: string | null
          client_name: string | null
          due_bucket: string | null
          due_date: string | null
          invoice_date: string | null
          invoice_id: string | null
          invoice_status: Database["public"]["Enums"]["invoice_status"] | null
          outstanding: number | null
          paid_amount: number | null
          total_amount: number | null
        }
        Insert: {
          campaign_id?: string | null
          client_name?: string | null
          due_bucket?: never
          due_date?: string | null
          invoice_date?: string | null
          invoice_id?: string | null
          invoice_status?: Database["public"]["Enums"]["invoice_status"] | null
          outstanding?: never
          paid_amount?: never
          total_amount?: number | null
        }
        Update: {
          campaign_id?: string | null
          client_name?: string | null
          due_bucket?: never
          due_date?: string | null
          invoice_date?: string | null
          invoice_id?: string | null
          invoice_status?: Database["public"]["Enums"]["invoice_status"] | null
          outstanding?: never
          paid_amount?: never
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_public_share_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns_summary_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "finance_eligible_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "media_asset_forecast"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
    }
    Functions: {
      add_creative_version: {
        Args: {
          p_affected_assets?: Json
          p_campaign_id: string
          p_effective_from: string
          p_name: string
          p_notes?: string
        }
        Returns: Json
      }
      assign_user_to_company: {
        Args: {
          p_company_id: string
          p_is_primary?: boolean
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: Json
      }
      auto_update_campaign_status: { Args: never; Returns: undefined }
      backfill_missing_asset_codes: { Args: never; Returns: number }
      calculate_subscription_usage: {
        Args: { p_company_id: string }
        Returns: Json
      }
      check_asset_availability: {
        Args: {
          p_asset_id: string
          p_end_date: string
          p_exclude_booking_id?: string
          p_start_date: string
        }
        Returns: boolean
      }
      check_asset_conflict: {
        Args: {
          p_asset_id: string
          p_end_date: string
          p_exclude_campaign_id?: string
          p_start_date: string
        }
        Returns: Json
      }
      check_booking_conflict: {
        Args: {
          p_asset_id: string
          p_end_date: string
          p_exclude_source_id?: string
          p_exclude_source_type?: string
          p_start_date: string
        }
        Returns: Json
      }
      check_existing_monthly_invoice: {
        Args: {
          p_billing_month: string
          p_campaign_id: string
          p_company_id: string
        }
        Returns: {
          created_at: string
          invoice_id: string
          status: string
          total_amount: number
        }[]
      }
      check_media_asset_duplicate: {
        Args: {
          p_area: string
          p_city: string
          p_company_id: string
          p_dimensions: string
          p_direction: string
          p_exclude_id?: string
          p_latitude: number
          p_location: string
          p_longitude: number
          p_media_type: string
        }
        Returns: {
          created_at: string
          id: string
          location: string
          media_asset_code: string
        }[]
      }
      check_record_detail_access: {
        Args: { p_record_id: string; p_table_name: string; p_user_id: string }
        Returns: boolean
      }
      check_role_permission: {
        Args: { p_action: string; p_module: string; p_user_id: string }
        Returns: boolean
      }
      check_subscription_user_limit: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      cleanup_security_tables: { Args: never; Returns: undefined }
      consume_finance_override: {
        Args: {
          p_action: string
          p_company_id: string
          p_record_id: string
          p_table: string
        }
        Returns: undefined
      }
      create_billing_period_and_invoice: {
        Args: { p_campaign_id: string; p_month_key: string }
        Returns: Json
      }
      create_client_with_id: {
        Args: {
          p_billing_address_line1?: string
          p_billing_address_line2?: string
          p_billing_city?: string
          p_billing_pincode?: string
          p_billing_state?: string
          p_city?: string
          p_client_type?: string
          p_company_id: string
          p_company_name?: string
          p_email?: string
          p_gst_number?: string
          p_name: string
          p_notes?: string
          p_phone?: string
          p_shipping_address_line1?: string
          p_shipping_address_line2?: string
          p_shipping_city?: string
          p_shipping_pincode?: string
          p_shipping_same_as_billing?: boolean
          p_shipping_state?: string
          p_state?: string
          p_state_code: string
        }
        Returns: Json
      }
      create_plan_approval_workflow: {
        Args: { p_plan_id: string }
        Returns: undefined
      }
      create_user_with_role: {
        Args: {
          user_email: string
          user_name?: string
          user_password: string
          user_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      current_company_id: { Args: never; Returns: string }
      current_role: { Args: never; Returns: string }
      dates_overlap: {
        Args: { a_end: string; a_start: string; b_end: string; b_start: string }
        Returns: boolean
      }
      delete_user_account: { Args: never; Returns: undefined }
      derive_asset_display_status: {
        Args: { p_asset_id: string }
        Returns: string
      }
      detect_media_asset_duplicates: {
        Args: never
        Returns: {
          area: string
          asset_ids: string[]
          city: string
          duplicate_count: number
          group_id: string
          location: string
          media_type: string
        }[]
      }
      extract_state_code: { Args: { client_id: string }; Returns: string }
      finalize_invoice_number:
        | { Args: { p_draft_id: string; p_gst_rate?: number }; Returns: string }
        | {
            Args: {
              p_company_id: string
              p_draft_id: string
              p_gst_rate: number
            }
            Returns: string
          }
      fn_assets_ending_within: {
        Args: { days_ahead: number }
        Returns: {
          area: string
          asset_id: string
          booking_end_date: string
          bucket: string
          campaign_id: string
          campaign_name: string
          client_name: string
          dimension: string
          direction: string
          illumination: string
          location: string
          sqft: number
        }[]
      }
      fn_assets_for_campaign: {
        Args: { p_campaign_id: string }
        Returns: {
          area: string
          asset_id: string
          booking_end_date: string
          booking_start_date: string
          dimension: string
          direction: string
          illumination: string
          location: string
          sqft: number
        }[]
      }
      fn_assets_for_invoice: {
        Args: { p_invoice_id: string }
        Returns: {
          area: string
          asset_id: string
          booking_end_date: string
          booking_start_date: string
          dimension: string
          direction: string
          illumination: string
          location: string
          sqft: number
        }[]
      }
      fn_campaigns_ending_within: {
        Args: { days_ahead: number }
        Returns: {
          campaign_id: string
          campaign_name: string
          client_name: string
          end_date: string
          start_date: string
          total_assets: number
        }[]
      }
      fn_media_availability_range: {
        Args: {
          p_city?: string
          p_company_id: string
          p_end: string
          p_media_type?: string
          p_start: string
        }
        Returns: {
          area: string
          asset_id: string
          availability_status: string
          available_from: string
          booked_till: string
          booking_end: string
          booking_start: string
          card_rate: number
          city: string
          current_campaign_id: string
          current_campaign_name: string
          current_client_name: string
          dimension: string
          direction: string
          illumination: string
          latitude: number
          location: string
          longitude: number
          media_asset_code: string
          media_type: string
          primary_photo_url: string
          qr_code_url: string
          sqft: number
        }[]
      }
      generate_asset_qr_code: {
        Args: { asset_id_param: string }
        Returns: string
      }
      generate_campaign_code: {
        Args: { p_company_id: string; p_start_date: string }
        Returns: string
      }
      generate_campaign_id:
        | { Args: never; Returns: string }
        | { Args: { p_user_id?: string }; Returns: string }
      generate_campaign_id_v2: { Args: { p_user_id?: string }; Returns: string }
      generate_campaign_number: {
        Args: { p_company_id: string }
        Returns: string
      }
      generate_client_id: {
        Args: { p_company_id: string; p_state_code: string }
        Returns: string
      }
      generate_company_slug: { Args: { company_name: string }; Returns: string }
      generate_credit_note_id: {
        Args: { p_company_id: string }
        Returns: string
      }
      generate_csrf_token: { Args: never; Returns: string }
      generate_estimation_id: { Args: never; Returns: string }
      generate_expense_id: { Args: never; Returns: string }
      generate_expense_no: { Args: { p_company_id?: string }; Returns: string }
      generate_invoice_id: { Args: { p_gst_rate?: number }; Returns: string }
      generate_invoice_number:
        | {
            Args: { p_company_id: string; p_invoice_date?: string }
            Returns: string
          }
        | {
            Args: {
              p_company_id: string
              p_gst_rate?: number
              p_invoice_date?: string
            }
            Returns: string
          }
      generate_invoice_number_zoho: {
        Args: { p_company_id: string; p_invoice_date: string }
        Returns: string
      }
      generate_mns_code: {
        Args: { p_city: string; p_media_type: string }
        Returns: string
      }
      generate_monthly_invoices:
        | {
            Args: {
              p_campaign_id: string
              p_company_id: string
              p_created_by: string
            }
            Returns: Json
          }
        | {
            Args: { p_campaign_id: string; p_created_by: string }
            Returns: Json
          }
      generate_new_media_asset_code: {
        Args: { p_area: string; p_city: string; p_media_type: string }
        Returns: string
      }
      generate_plan_id: { Args: never; Returns: string }
      generate_plan_number: { Args: { p_company_id: string }; Returns: string }
      generate_receipt_number: {
        Args: { p_company_id: string; p_receipt_date: string }
        Returns: string
      }
      generate_share_token: { Args: never; Returns: string }
      get_active_subscription: {
        Args: { p_company_id: string }
        Returns: {
          end_date: string
          id: string
          max_assets: number
          max_campaigns: number
          max_users: number
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
        }[]
      }
      get_asset_by_code: {
        Args: { p_code: string }
        Returns: {
          ad_tax: number | null
          area: string
          base_margin: number | null
          base_rate: number | null
          booked_from: string | null
          booked_to: string | null
          card_rate: number
          category: Database["public"]["Enums"]["media_category"]
          city: string
          company_id: string
          concession_fee: number | null
          consumer_name: string | null
          created_at: string | null
          created_by: string | null
          current_campaign_id: string | null
          default_duration_mode: string | null
          dimensions: string
          direction: string | null
          display_title: string | null
          district: string | null
          duplicate_group_id: string | null
          electricity: number | null
          ero: string | null
          faces: Json | null
          google_street_view_url: string | null
          gst_percent: number | null
          id: string
          illumination_type: string | null
          installation_type: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_multi_face: boolean | null
          is_public: boolean | null
          last_maintenance_date: string | null
          latitude: number | null
          legacy_codes: string[] | null
          location: string
          longitude: number | null
          maintenance: number | null
          media_asset_code: string | null
          media_type: string
          min_booking_days: number | null
          monthly_land_rent: number | null
          mounting_rate_default: number | null
          municipal_authority: string | null
          municipal_id: string | null
          next_maintenance_due: string | null
          ownership: Database["public"]["Enums"]["ownership_type"] | null
          primary_photo_url: string | null
          printing_rate_default: number | null
          qr_code_url: string | null
          remarks: string | null
          search_tokens: string[] | null
          section_name: string | null
          seo_description: string | null
          service_number: string | null
          slug: string | null
          state: string | null
          status: Database["public"]["Enums"]["media_asset_status"]
          structure_ownership: string | null
          sub_zone: string | null
          tags: string[] | null
          target_audience: string[] | null
          total_sqft: number | null
          traffic_density: string | null
          unique_service_number: string | null
          updated_at: string | null
          vendor_details: Json | null
          visibility_score: number | null
          zone: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "media_assets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_asset_code_health: { Args: never; Returns: Json }
      get_asset_display_code: { Args: { p_asset_id: string }; Returns: string }
      get_asset_face_count: { Args: { p_asset_id: string }; Returns: number }
      get_asset_total_sqft: { Args: { p_asset_id: string }; Returns: number }
      get_campaign_billing_summary: {
        Args: { p_campaign_id: string }
        Returns: Json
      }
      get_campaign_limited: {
        Args: { p_id: string }
        Returns: {
          campaign_name: string
          client_id: string
          client_name: string
          created_at: string
          end_date: string
          id: string
          notes: string
          plan_id: string
          start_date: string
          status: string
          total_amount: number
        }[]
      }
      get_company_active_modules: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_company_counter: {
        Args: { p_company_id: string; p_counter_type: string; p_period: string }
        Returns: number
      }
      get_current_user_company_id: { Args: never; Returns: string }
      get_enum_values: { Args: { enum_name: string }; Returns: Json }
      get_financial_year: { Args: never; Returns: string }
      get_gst_mode: {
        Args: { p_client_state: string; p_company_state: string }
        Returns: string
      }
      get_invoice_limited: {
        Args: { p_id: string }
        Returns: {
          balance_due: number
          campaign_id: string
          client_id: string
          client_name: string
          due_date: string
          id: string
          invoice_date: string
          invoice_no: string
          notes: string
          status: string
          total_amount: number
        }[]
      }
      get_invoice_terms_label: {
        Args: { p_terms_days: number; p_terms_mode: string }
        Returns: string
      }
      get_invoices_for_reminders: {
        Args: { p_company_id: string }
        Returns: {
          aging_bucket: number
          balance_due: number
          client_email: string
          client_id: string
          client_name: string
          client_phone: string
          days_overdue: number
          due_date: string
          invoice_date: string
          invoice_id: string
          invoice_no: string
        }[]
      }
      get_mounter_workload: {
        Args: { p_company_id: string }
        Returns: {
          count: number
          mounter_id: string
        }[]
      }
      get_next_client_number: {
        Args: { p_company_id: string; p_state_code: string }
        Returns: number
      }
      get_next_code_number: {
        Args: {
          p_counter_key: string
          p_counter_type: string
          p_period: string
        }
        Returns: number
      }
      get_record_access_mode: {
        Args: { p_record_id: string; p_table_name: string }
        Returns: Json
      }
      get_role_permission: {
        Args: { p_company_id?: string; p_module: string; p_role: string }
        Returns: {
          can_approve: boolean
          can_assign: boolean
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_export: boolean
          can_upload_proof: boolean
          can_view: boolean
          can_view_sensitive: boolean
          scope_mode: string
        }[]
      }
      get_unused_asset_codes: {
        Args: never
        Returns: {
          created_at: string
          generated_code: string
        }[]
      }
      get_user_all_roles: {
        Args: { p_user_id: string }
        Returns: {
          company_id: string
          company_name: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_user_auth_data: { Args: { p_user_id: string }; Returns: Json }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          email: string
          id: string
          roles: Json
          username: string
        }[]
      }
      gst_state_code: { Args: { state_name: string }; Returns: string }
      has_company_role: {
        Args: { _required_roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_valid_finance_override: {
        Args: {
          p_action: string
          p_company_id: string
          p_record_id: string
          p_table: string
        }
        Returns: boolean
      }
      invoke_scheduled_email_dispatch: { Args: never; Returns: undefined }
      is_company_member: { Args: { _company_id: string }; Returns: boolean }
      is_field_operations_user: { Args: { _user_id: string }; Returns: boolean }
      is_fy_locked: {
        Args: { p_company_id: string; p_date: string }
        Returns: boolean
      }
      is_month_locked: {
        Args: { p_company_id: string; p_date: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      issue_credit_note: {
        Args: { p_company_id: string; p_credit_note_uuid: string }
        Returns: string
      }
      list_all_users: {
        Args: never
        Returns: {
          companies: Json
          created_at: string
          email: string
          id: string
          username: string
        }[]
      }
      list_campaigns_limited:
        | {
            Args: never
            Returns: {
              campaign_name: string
              client_id: string
              client_name: string
              created_at: string
              end_date: string
              id: string
              start_date: string
              status: string
              total_amount: number
            }[]
          }
        | {
            Args: { p_company_id?: string }
            Returns: {
              assigned_to: string
              campaign_name: string
              client_id: string
              client_name: string
              created_at: string
              end_date: string
              id: string
              is_deleted: boolean
              notes: string
              plan_id: string
              start_date: string
              status: string
              total_assets: number
            }[]
          }
      list_invoices_limited:
        | {
            Args: never
            Returns: {
              balance_due: number
              campaign_id: string
              client_id: string
              client_name: string
              due_date: string
              id: string
              invoice_date: string
              invoice_no: string
              status: string
              total_amount: number
            }[]
          }
        | {
            Args: { p_company_id?: string }
            Returns: {
              balance_due: number
              billing_month: string
              campaign_id: string
              client_id: string
              client_name: string
              created_at: string
              due_date: string
              id: string
              invoice_date: string
              invoice_no: string
              paid_amount: number
              status: string
              total_amount: number
            }[]
          }
      list_plans_limited:
        | {
            Args: never
            Returns: {
              client_id: string
              created_at: string
              end_date: string
              id: string
              plan_name: string
              start_date: string
              status: string
              total_amount: number
            }[]
          }
        | {
            Args: { p_company_id?: string }
            Returns: {
              client_id: string
              client_name: string
              created_at: string
              created_by: string
              end_date: string
              id: string
              notes: string
              plan_name: string
              start_date: string
              status: string
              total_locations: number
            }[]
          }
      lock_plan_for_conversion: { Args: { p_plan_id: string }; Returns: string }
      log_activity:
        | {
            Args: {
              p_action: string
              p_details?: Json
              p_resource_id?: string
              p_resource_name?: string
              p_resource_type: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action: string
              p_details?: Json
              p_resource_id?: string
              p_resource_name?: string
              p_resource_type: string
              p_user_id?: string
            }
            Returns: string
          }
      log_admin_operation: {
        Args: {
          p_action: string
          p_details?: Json
          p_ip_address?: string
          p_resource_id?: string
          p_resource_type: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_audit: {
        Args: {
          p_action: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: string
      }
      log_user_activity: {
        Args: {
          p_activity_description?: string
          p_activity_type: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: string
      }
      manually_unbook_asset: {
        Args: { p_asset_id: string; p_campaign_id: string }
        Returns: Json
      }
      match_campaign_token: { Args: { p_token: string }; Returns: string }
      normalize_role: { Args: { raw_role: string }; Returns: string }
      preview_next_invoice_number: {
        Args: { p_company_id: string; p_gst_rate?: number }
        Returns: string
      }
      process_plan_approval: {
        Args: {
          p_approval_id: string
          p_comments?: string
          p_status: Database["public"]["Enums"]["approval_status"]
        }
        Returns: Json
      }
      recalculate_invoice_due_date: {
        Args: { p_invoice_id: string }
        Returns: Json
      }
      remove_user_from_company: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: Json
      }
      resolve_asset_id: { Args: { p_identifier: string }; Returns: string }
      seed_demo_companies: { Args: never; Returns: Json }
      setup_platform_admin: {
        Args: { p_company_name?: string; p_user_email: string }
        Returns: Json
      }
      soft_delete_campaign: {
        Args: {
          p_campaign_id: string
          p_deleted_by: string
          p_deletion_reason: string
        }
        Returns: Json
      }
      test_company_rls_isolation: {
        Args: { test_company_id: string; test_user_id: string }
        Returns: Json
      }
      update_completed_campaigns: {
        Args: { p_today: string }
        Returns: undefined
      }
      update_invoice_payment_status: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      update_overdue_invoices: { Args: never; Returns: number }
      update_running_campaigns: {
        Args: { p_today: string }
        Returns: undefined
      }
      update_upcoming_campaigns: {
        Args: { p_today: string }
        Returns: undefined
      }
      upsert_data_quality_issue:
        | {
            Args: {
              p_company_id?: string
              p_context?: string
              p_detail?: string
              p_field_name: string
              p_issue_type: string
              p_now?: string
              p_raw_value?: string
              p_record_id: string
              p_table_name: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_company_id?: string
              p_context?: string
              p_detail?: string
              p_field_name: string
              p_issue_type: string
              p_now?: string
              p_raw_value?: string
              p_record_id: string
              p_severity?: string
              p_table_name: string
            }
            Returns: undefined
          }
      user_has_role: {
        Args: {
          p_required_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      user_in_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      validate_csrf_token: { Args: { p_token: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "sales"
        | "finance"
        | "operations"
        | "manager"
        | "installation"
        | "monitoring"
        | "monitor"
        | "operations_manager"
        | "mounting"
        | "viewer"
      approval_level: "L1" | "L2" | "L3"
      approval_status: "pending" | "approved" | "rejected"
      asset_installation_status:
        | "Pending"
        | "Assigned"
        | "Mounted"
        | "PhotoUploaded"
        | "Verified"
        | "In Progress"
        | "Installed"
        | "QA Pending"
        | "Completed"
        | "Failed"
      booking_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "completed"
      campaign_status:
        | "Planned"
        | "Assigned"
        | "InProgress"
        | "PhotoUploaded"
        | "Verified"
        | "Completed"
        | "Cancelled"
        | "Draft"
        | "Upcoming"
        | "Running"
        | "Archived"
      client_type:
        | "Agency"
        | "Direct"
        | "Government"
        | "Corporate"
        | "Other"
        | "Business"
        | "Individual"
      company_status: "pending" | "active" | "suspended" | "cancelled"
      company_type: "media_owner" | "agency" | "platform_admin"
      document_type:
        | "KYC"
        | "GST_Certificate"
        | "PAN_Card"
        | "Aadhar_Card"
        | "Company_Registration"
        | "Contract"
        | "Agreement"
        | "Invoice"
        | "Other"
      estimation_status: "Draft" | "Sent" | "Approved" | "Rejected"
      expense_allocation_type: "General" | "Campaign" | "Plan" | "Asset"
      expense_approval_status:
        | "Draft"
        | "Submitted"
        | "Approved"
        | "Rejected"
        | "Paid"
      expense_category:
        | "Printing"
        | "Mounting"
        | "Transport"
        | "Electricity"
        | "Other"
        | "Unmounting"
      gst_type: "None" | "IGST" | "CGST_SGST"
      invoice_status:
        | "Draft"
        | "Sent"
        | "Partial"
        | "Paid"
        | "Overdue"
        | "Cancelled"
      media_asset_status:
        | "Available"
        | "Booked"
        | "Blocked"
        | "Maintenance"
        | "Under Maintenance"
        | "Expired"
      media_category: "OOH" | "DOOH" | "Transit"
      ownership_type: "own" | "rented"
      payment_mode: "Cash" | "Bank Transfer" | "UPI" | "Cheque" | "Card"
      payment_status: "Pending" | "Paid"
      plan_status: "Draft" | "Sent" | "Approved" | "Rejected" | "Converted"
      plan_type: "Quotation" | "Proposal" | "Estimate"
      subscription_status: "active" | "expired" | "cancelled" | "trialing"
      subscription_tier: "free" | "starter" | "pro" | "enterprise"
      transaction_status: "pending" | "completed" | "failed" | "refunded"
      transaction_type:
        | "subscription"
        | "portal_fee"
        | "commission"
        | "refund"
        | "adjustment"
      watermark_position:
        | "bottom-right"
        | "bottom-left"
        | "top-right"
        | "top-left"
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
      app_role: [
        "admin",
        "user",
        "sales",
        "finance",
        "operations",
        "manager",
        "installation",
        "monitoring",
        "monitor",
        "operations_manager",
        "mounting",
        "viewer",
      ],
      approval_level: ["L1", "L2", "L3"],
      approval_status: ["pending", "approved", "rejected"],
      asset_installation_status: [
        "Pending",
        "Assigned",
        "Mounted",
        "PhotoUploaded",
        "Verified",
        "In Progress",
        "Installed",
        "QA Pending",
        "Completed",
        "Failed",
      ],
      booking_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "completed",
      ],
      campaign_status: [
        "Planned",
        "Assigned",
        "InProgress",
        "PhotoUploaded",
        "Verified",
        "Completed",
        "Cancelled",
        "Draft",
        "Upcoming",
        "Running",
        "Archived",
      ],
      client_type: [
        "Agency",
        "Direct",
        "Government",
        "Corporate",
        "Other",
        "Business",
        "Individual",
      ],
      company_status: ["pending", "active", "suspended", "cancelled"],
      company_type: ["media_owner", "agency", "platform_admin"],
      document_type: [
        "KYC",
        "GST_Certificate",
        "PAN_Card",
        "Aadhar_Card",
        "Company_Registration",
        "Contract",
        "Agreement",
        "Invoice",
        "Other",
      ],
      estimation_status: ["Draft", "Sent", "Approved", "Rejected"],
      expense_allocation_type: ["General", "Campaign", "Plan", "Asset"],
      expense_approval_status: [
        "Draft",
        "Submitted",
        "Approved",
        "Rejected",
        "Paid",
      ],
      expense_category: [
        "Printing",
        "Mounting",
        "Transport",
        "Electricity",
        "Other",
        "Unmounting",
      ],
      gst_type: ["None", "IGST", "CGST_SGST"],
      invoice_status: [
        "Draft",
        "Sent",
        "Partial",
        "Paid",
        "Overdue",
        "Cancelled",
      ],
      media_asset_status: [
        "Available",
        "Booked",
        "Blocked",
        "Maintenance",
        "Under Maintenance",
        "Expired",
      ],
      media_category: ["OOH", "DOOH", "Transit"],
      ownership_type: ["own", "rented"],
      payment_mode: ["Cash", "Bank Transfer", "UPI", "Cheque", "Card"],
      payment_status: ["Pending", "Paid"],
      plan_status: ["Draft", "Sent", "Approved", "Rejected", "Converted"],
      plan_type: ["Quotation", "Proposal", "Estimate"],
      subscription_status: ["active", "expired", "cancelled", "trialing"],
      subscription_tier: ["free", "starter", "pro", "enterprise"],
      transaction_status: ["pending", "completed", "failed", "refunded"],
      transaction_type: [
        "subscription",
        "portal_fee",
        "commission",
        "refund",
        "adjustment",
      ],
      watermark_position: [
        "bottom-right",
        "bottom-left",
        "top-right",
        "top-left",
      ],
    },
  },
} as const
