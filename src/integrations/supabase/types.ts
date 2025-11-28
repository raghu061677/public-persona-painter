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
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_expenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
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
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
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
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_power_bills_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
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
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
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
      campaign_assets: {
        Row: {
          area: string
          asset_id: string
          assigned_at: string | null
          campaign_id: string
          card_rate: number
          city: string
          completed_at: string | null
          created_at: string | null
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          media_type: string
          mounter_name: string | null
          mounting_charges: number | null
          photos: Json | null
          printing_charges: number | null
          status: Database["public"]["Enums"]["asset_installation_status"]
        }
        Insert: {
          area: string
          asset_id: string
          assigned_at?: string | null
          campaign_id: string
          card_rate: number
          city: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          media_type: string
          mounter_name?: string | null
          mounting_charges?: number | null
          photos?: Json | null
          printing_charges?: number | null
          status?: Database["public"]["Enums"]["asset_installation_status"]
        }
        Update: {
          area?: string
          asset_id?: string
          assigned_at?: string | null
          campaign_id?: string
          card_rate?: number
          city?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          media_type?: string
          mounter_name?: string | null
          mounting_charges?: number | null
          photos?: Json | null
          printing_charges?: number | null
          status?: Database["public"]["Enums"]["asset_installation_status"]
        }
        Relationships: [
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
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
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
      campaigns: {
        Row: {
          assigned_to: string | null
          campaign_name: string
          client_id: string
          client_name: string
          company_id: string | null
          created_at: string | null
          created_by: string
          end_date: string
          grand_total: number
          gst_amount: number
          gst_percent: number
          id: string
          notes: string | null
          notification_settings: Json | null
          plan_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["campaign_status"]
          total_amount: number
          total_assets: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          campaign_name: string
          client_id: string
          client_name: string
          company_id?: string | null
          created_at?: string | null
          created_by: string
          end_date: string
          grand_total: number
          gst_amount: number
          gst_percent: number
          id: string
          notes?: string | null
          notification_settings?: Json | null
          plan_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["campaign_status"]
          total_amount: number
          total_assets?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          campaign_name?: string
          client_id?: string
          client_name?: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string
          end_date?: string
          grand_total?: number
          gst_amount?: number
          gst_percent?: number
          id?: string
          notes?: string | null
          notification_settings?: Json | null
          plan_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["campaign_status"]
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
            foreignKeyName: "campaigns_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_basic"
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
          company: string | null
          company_id: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          gst_number: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_pincode: string | null
          shipping_same_as_billing: boolean | null
          shipping_state: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_pincode?: string | null
          billing_state?: string | null
          city?: string | null
          company?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id: string
          name: string
          notes?: string | null
          phone?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_pincode?: string | null
          shipping_same_as_billing?: boolean | null
          shipping_state?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_pincode?: string | null
          billing_state?: string | null
          city?: string | null
          company?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_pincode?: string | null
          shipping_same_as_billing?: boolean | null
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
          status: Database["public"]["Enums"]["company_status"]
          theme_color: string | null
          type: Database["public"]["Enums"]["company_type"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
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
          status?: Database["public"]["Enums"]["company_status"]
          theme_color?: string | null
          type: Database["public"]["Enums"]["company_type"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
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
          status?: Database["public"]["Enums"]["company_status"]
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
          updated_at: string | null
        }
        Insert: {
          company_id: string
          counter_type: string
          created_at?: string | null
          current_value?: number
          id?: string
          period: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          counter_type?: string
          created_at?: string | null
          current_value?: number
          id?: string
          period?: string
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
        ]
      }
      expenses: {
        Row: {
          amount: number
          bill_id: string | null
          bill_month: string | null
          campaign_id: string | null
          category: Database["public"]["Enums"]["expense_category"]
          company_id: string | null
          created_at: string | null
          gst_amount: number
          gst_percent: number
          id: string
          invoice_url: string | null
          notes: string | null
          paid_date: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          updated_at: string | null
          vendor_name: string
        }
        Insert: {
          amount: number
          bill_id?: string | null
          bill_month?: string | null
          campaign_id?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          company_id?: string | null
          created_at?: string | null
          gst_amount: number
          gst_percent?: number
          id: string
          invoice_url?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          total_amount: number
          updated_at?: string | null
          vendor_name: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          bill_month?: string | null
          campaign_id?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          company_id?: string | null
          created_at?: string | null
          gst_amount?: number
          gst_percent?: number
          id?: string
          invoice_url?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          total_amount?: number
          updated_at?: string | null
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
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
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
      invoices: {
        Row: {
          balance_due: number
          client_id: string
          client_name: string
          company_id: string | null
          created_at: string | null
          created_by: string
          due_date: string
          estimation_id: string | null
          gst_amount: number
          gst_percent: number
          id: string
          invoice_date: string
          items: Json | null
          notes: string | null
          payments: Json | null
          status: Database["public"]["Enums"]["invoice_status"]
          sub_total: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          balance_due: number
          client_id: string
          client_name: string
          company_id?: string | null
          created_at?: string | null
          created_by: string
          due_date: string
          estimation_id?: string | null
          gst_amount: number
          gst_percent?: number
          id: string
          invoice_date: string
          items?: Json | null
          notes?: string | null
          payments?: Json | null
          status?: Database["public"]["Enums"]["invoice_status"]
          sub_total: number
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          balance_due?: number
          client_id?: string
          client_name?: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string
          due_date?: string
          estimation_id?: string | null
          gst_amount?: number
          gst_percent?: number
          id?: string
          invoice_date?: string
          items?: Json | null
          notes?: string | null
          payments?: Json | null
          status?: Database["public"]["Enums"]["invoice_status"]
          sub_total?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
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
      leads: {
        Row: {
          company: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          id: string
          location: string | null
          metadata: Json | null
          name: string
          phone: string | null
          raw_message: string | null
          requirement: string | null
          source: string
          status: string
          synced_to_zoho: boolean | null
          updated_at: string | null
          zoho_lead_id: string | null
        }
        Insert: {
          company?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          name: string
          phone?: string | null
          raw_message?: string | null
          requirement?: string | null
          source: string
          status?: string
          synced_to_zoho?: boolean | null
          updated_at?: string | null
          zoho_lead_id?: string | null
        }
        Update: {
          company?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          raw_message?: string | null
          requirement?: string | null
          source?: string
          status?: string
          synced_to_zoho?: boolean | null
          updated_at?: string | null
          zoho_lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
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
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_inquiry_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
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
      media_assets: {
        Row: {
          ad_tax: number | null
          area: string
          base_margin: number | null
          base_rent: number | null
          card_rate: number
          category: Database["public"]["Enums"]["media_category"]
          city: string
          company_id: string
          concession_fee: number | null
          consumer_name: string | null
          created_at: string | null
          created_by: string | null
          dimensions: string
          direction: string | null
          district: string | null
          electricity: number | null
          ero: string | null
          faces: Json | null
          google_street_view_url: string | null
          gst_percent: number | null
          id: string
          illumination: string | null
          image_urls: string[] | null
          images: Json | null
          is_multi_face: boolean | null
          is_public: boolean | null
          latitude: number | null
          location: string
          location_url: string | null
          longitude: number | null
          maintenance: number | null
          media_id: string | null
          media_type: string
          mounting_charges: number | null
          municipal_authority: string | null
          ownership: Database["public"]["Enums"]["ownership_type"] | null
          printing_charges: number | null
          qr_code_url: string | null
          search_tokens: string[] | null
          section_name: string | null
          service_number: string | null
          state: string | null
          status: Database["public"]["Enums"]["media_asset_status"]
          total_sqft: number | null
          unique_service_number: string | null
          updated_at: string | null
          vendor_details: Json | null
        }
        Insert: {
          ad_tax?: number | null
          area: string
          base_margin?: number | null
          base_rent?: number | null
          card_rate: number
          category?: Database["public"]["Enums"]["media_category"]
          city: string
          company_id: string
          concession_fee?: number | null
          consumer_name?: string | null
          created_at?: string | null
          created_by?: string | null
          dimensions: string
          direction?: string | null
          district?: string | null
          electricity?: number | null
          ero?: string | null
          faces?: Json | null
          google_street_view_url?: string | null
          gst_percent?: number | null
          id: string
          illumination?: string | null
          image_urls?: string[] | null
          images?: Json | null
          is_multi_face?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location: string
          location_url?: string | null
          longitude?: number | null
          maintenance?: number | null
          media_id?: string | null
          media_type: string
          mounting_charges?: number | null
          municipal_authority?: string | null
          ownership?: Database["public"]["Enums"]["ownership_type"] | null
          printing_charges?: number | null
          qr_code_url?: string | null
          search_tokens?: string[] | null
          section_name?: string | null
          service_number?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["media_asset_status"]
          total_sqft?: number | null
          unique_service_number?: string | null
          updated_at?: string | null
          vendor_details?: Json | null
        }
        Update: {
          ad_tax?: number | null
          area?: string
          base_margin?: number | null
          base_rent?: number | null
          card_rate?: number
          category?: Database["public"]["Enums"]["media_category"]
          city?: string
          company_id?: string
          concession_fee?: number | null
          consumer_name?: string | null
          created_at?: string | null
          created_by?: string | null
          dimensions?: string
          direction?: string | null
          district?: string | null
          electricity?: number | null
          ero?: string | null
          faces?: Json | null
          google_street_view_url?: string | null
          gst_percent?: number | null
          id?: string
          illumination?: string | null
          image_urls?: string[] | null
          images?: Json | null
          is_multi_face?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location?: string
          location_url?: string | null
          longitude?: number | null
          maintenance?: number | null
          media_id?: string | null
          media_type?: string
          mounting_charges?: number | null
          municipal_authority?: string | null
          ownership?: Database["public"]["Enums"]["ownership_type"] | null
          printing_charges?: number | null
          qr_code_url?: string | null
          search_tokens?: string[] | null
          section_name?: string | null
          service_number?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["media_asset_status"]
          total_sqft?: number | null
          unique_service_number?: string | null
          updated_at?: string | null
          vendor_details?: Json | null
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
      notification_settings: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          reminders: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          reminders?: Json | null
          updated_at?: string | null
        }
        Update: {
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
          asset_id: string
          assigned_to: string | null
          campaign_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          scheduled_date: string | null
          status: string
          task_type: string
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          assigned_to?: string | null
          campaign_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          status?: string
          task_type?: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          assigned_to?: string | null
          campaign_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          status?: string
          task_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operations_tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
        ]
      }
      plan_items: {
        Row: {
          area: string
          asset_id: string
          base_rent: number | null
          card_rate: number
          city: string
          created_at: string | null
          dimensions: string
          discount_amount: number | null
          discount_type: string | null
          discount_value: number | null
          gst_amount: number
          id: string
          location: string
          media_type: string
          mounting_charges: number | null
          plan_id: string
          printing_charges: number | null
          sales_price: number
          subtotal: number
          total_with_gst: number
        }
        Insert: {
          area: string
          asset_id: string
          base_rent?: number | null
          card_rate: number
          city: string
          created_at?: string | null
          dimensions: string
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          gst_amount: number
          id?: string
          location: string
          media_type: string
          mounting_charges?: number | null
          plan_id: string
          printing_charges?: number | null
          sales_price: number
          subtotal: number
          total_with_gst: number
        }
        Update: {
          area?: string
          asset_id?: string
          base_rent?: number | null
          card_rate?: number
          city?: string
          created_at?: string | null
          dimensions?: string
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          gst_amount?: number
          id?: string
          location?: string
          media_type?: string
          mounting_charges?: number | null
          plan_id?: string
          printing_charges?: number | null
          sales_price?: number
          subtotal?: number
          total_with_gst?: number
        }
        Relationships: [
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
            referencedRelation: "public_media_assets_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_templates: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          duration_days: number | null
          gst_percent: number
          id: string
          is_active: boolean | null
          notes: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          template_items: Json
          template_name: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_days?: number | null
          gst_percent?: number
          id?: string
          is_active?: boolean | null
          notes?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          template_items?: Json
          template_name: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_days?: number | null
          gst_percent?: number
          id?: string
          is_active?: boolean | null
          notes?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          template_items?: Json
          template_name?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
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
          client_id: string
          client_name: string
          company_id: string
          converted_at: string | null
          converted_to_campaign_id: string | null
          created_at: string | null
          created_by: string
          duration_days: number
          end_date: string
          export_links: Json | null
          grand_total: number
          gst_amount: number
          gst_percent: number
          id: string
          notes: string | null
          owner_company_id: string | null
          plan_name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          share_link_active: boolean | null
          share_token: string | null
          start_date: string
          status: Database["public"]["Enums"]["plan_status"]
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          client_name: string
          company_id: string
          converted_at?: string | null
          converted_to_campaign_id?: string | null
          created_at?: string | null
          created_by: string
          duration_days: number
          end_date: string
          export_links?: Json | null
          grand_total?: number
          gst_amount?: number
          gst_percent?: number
          id: string
          notes?: string | null
          owner_company_id?: string | null
          plan_name: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          share_link_active?: boolean | null
          share_token?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["plan_status"]
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          client_name?: string
          company_id?: string
          converted_at?: string | null
          converted_to_campaign_id?: string | null
          created_at?: string | null
          created_by?: string
          duration_days?: number
          end_date?: string
          export_links?: Json | null
          grand_total?: number
          gst_amount?: number
          gst_percent?: number
          id?: string
          notes?: string | null
          owner_company_id?: string | null
          plan_name?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          share_link_active?: boolean | null
          share_token?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["plan_status"]
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_converted_campaign"
            columns: ["converted_to_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
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
          can_create: boolean | null
          can_delete: boolean | null
          can_update: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module: string
          role: string
          updated_at: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_update?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module: string
          role: string
          updated_at?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_update?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
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
      clients_basic: {
        Row: {
          city: string | null
          company: string | null
          created_at: string | null
          id: string | null
          name: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          company?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          company?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          state?: string | null
        }
        Relationships: []
      }
      public_media_assets_safe: {
        Row: {
          area: string | null
          category: Database["public"]["Enums"]["media_category"] | null
          city: string | null
          company_city: string | null
          company_email: string | null
          company_id: string | null
          company_name: string | null
          company_phone: string | null
          dimensions: string | null
          direction: string | null
          faces: Json | null
          google_street_view_url: string | null
          id: string | null
          illumination: string | null
          image_urls: string[] | null
          images: Json | null
          is_multi_face: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          media_type: string | null
          status: Database["public"]["Enums"]["media_asset_status"] | null
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
      user_roles_compat: {
        Row: {
          created_at: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_user_to_company: {
        Args: {
          p_company_id: string
          p_is_primary?: boolean
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: Json
      }
      calculate_subscription_usage: {
        Args: { p_company_id: string }
        Returns: Json
      }
      check_subscription_user_limit: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      cleanup_security_tables: { Args: never; Returns: undefined }
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
      delete_user_account: { Args: never; Returns: undefined }
      generate_campaign_id: { Args: never; Returns: string }
      generate_company_slug: { Args: { company_name: string }; Returns: string }
      generate_csrf_token: { Args: never; Returns: string }
      generate_estimation_id: { Args: never; Returns: string }
      generate_expense_id: { Args: never; Returns: string }
      generate_invoice_id: { Args: never; Returns: string }
      generate_plan_id: { Args: never; Returns: string }
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
      get_company_active_modules: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_company_counter: {
        Args: { p_company_id: string; p_counter_type: string; p_period: string }
        Returns: number
      }
      get_current_user_company_id: { Args: never; Returns: string }
      get_financial_year: { Args: never; Returns: string }
      get_next_code_number: {
        Args: {
          p_counter_key: string
          p_counter_type: string
          p_period: string
        }
        Returns: number
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_field_operations_user: { Args: { _user_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
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
      process_plan_approval: {
        Args: {
          p_approval_id: string
          p_comments?: string
          p_status: Database["public"]["Enums"]["approval_status"]
        }
        Returns: Json
      }
      remove_user_from_company: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: Json
      }
      seed_demo_companies: { Args: never; Returns: Json }
      setup_platform_admin: {
        Args: { p_company_name?: string; p_user_email: string }
        Returns: Json
      }
      test_company_rls_isolation: {
        Args: { test_company_id: string; test_user_id: string }
        Returns: Json
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
      approval_level: "L1" | "L2" | "L3"
      approval_status: "pending" | "approved" | "rejected"
      asset_installation_status:
        | "Pending"
        | "Assigned"
        | "Mounted"
        | "PhotoUploaded"
        | "Verified"
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
      expense_category:
        | "Printing"
        | "Mounting"
        | "Transport"
        | "Electricity"
        | "Other"
      invoice_status: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled"
      media_asset_status: "Available" | "Booked" | "Blocked" | "Maintenance"
      media_category: "OOH" | "DOOH" | "Transit"
      ownership_type: "own" | "rented"
      payment_status: "Pending" | "Paid"
      plan_status:
        | "Draft"
        | "Sent"
        | "Approved"
        | "Rejected"
        | "Converted"
        | "pending"
        | "approved"
        | "converted"
        | "rejected"
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
      ],
      approval_level: ["L1", "L2", "L3"],
      approval_status: ["pending", "approved", "rejected"],
      asset_installation_status: [
        "Pending",
        "Assigned",
        "Mounted",
        "PhotoUploaded",
        "Verified",
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
      expense_category: [
        "Printing",
        "Mounting",
        "Transport",
        "Electricity",
        "Other",
      ],
      invoice_status: ["Draft", "Sent", "Paid", "Overdue", "Cancelled"],
      media_asset_status: ["Available", "Booked", "Blocked", "Maintenance"],
      media_category: ["OOH", "DOOH", "Transit"],
      ownership_type: ["own", "rented"],
      payment_status: ["Pending", "Paid"],
      plan_status: [
        "Draft",
        "Sent",
        "Approved",
        "Rejected",
        "Converted",
        "pending",
        "approved",
        "converted",
        "rejected",
      ],
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
