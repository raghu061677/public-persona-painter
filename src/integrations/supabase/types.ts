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
        ]
      }
      asset_power_bills: {
        Row: {
          asset_id: string
          bill_amount: number
          bill_month: string
          bill_url: string | null
          consumer_name: string | null
          created_at: string | null
          created_by: string | null
          ero: string | null
          id: string
          notes: string | null
          paid_amount: number | null
          payment_date: string | null
          payment_status: string | null
          section_name: string | null
          service_number: string | null
          unique_service_number: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          bill_amount?: number
          bill_month: string
          bill_url?: string | null
          consumer_name?: string | null
          created_at?: string | null
          created_by?: string | null
          ero?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          section_name?: string | null
          service_number?: string | null
          unique_service_number?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          bill_amount?: number
          bill_month?: string
          bill_url?: string | null
          consumer_name?: string | null
          created_at?: string | null
          created_by?: string | null
          ero?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          section_name?: string | null
          service_number?: string | null
          unique_service_number?: string | null
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
            foreignKeyName: "campaign_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          assigned_to: string | null
          campaign_name: string
          client_id: string
          client_name: string
          created_at: string | null
          created_by: string
          end_date: string
          grand_total: number
          gst_amount: number
          gst_percent: number
          id: string
          notes: string | null
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
          created_at?: string | null
          created_by: string
          end_date: string
          grand_total: number
          gst_amount: number
          gst_percent: number
          id: string
          notes?: string | null
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
          created_at?: string | null
          created_by?: string
          end_date?: string
          grand_total?: number
          gst_amount?: number
          gst_percent?: number
          id?: string
          notes?: string | null
          plan_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          total_amount?: number
          total_assets?: number | null
          updated_at?: string | null
        }
        Relationships: [
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
      clients: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          gst_number: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          campaign_id: string | null
          category: Database["public"]["Enums"]["expense_category"]
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
          campaign_id?: string | null
          category: Database["public"]["Enums"]["expense_category"]
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
          campaign_id?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
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
            foreignKeyName: "expenses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance_due: number
          client_id: string
          client_name: string
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
        Relationships: []
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
          longitude: number | null
          maintenance: number | null
          media_id: string | null
          media_type: string
          mounting_charges: number | null
          municipal_authority: string | null
          ownership: Database["public"]["Enums"]["ownership_type"] | null
          printing_charges: number | null
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
          longitude?: number | null
          maintenance?: number | null
          media_id?: string | null
          media_type: string
          mounting_charges?: number | null
          municipal_authority?: string | null
          ownership?: Database["public"]["Enums"]["ownership_type"] | null
          printing_charges?: number | null
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
          longitude?: number | null
          maintenance?: number | null
          media_id?: string | null
          media_type?: string
          mounting_charges?: number | null
          municipal_authority?: string | null
          ownership?: Database["public"]["Enums"]["ownership_type"] | null
          printing_charges?: number | null
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
        Relationships: []
      }
      organization_settings: {
        Row: {
          created_at: string | null
          hero_image_url: string | null
          id: string
          logo_url: string | null
          organization_name: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          hero_image_url?: string | null
          id?: string
          logo_url?: string | null
          organization_name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          hero_image_url?: string | null
          id?: string
          logo_url?: string | null
          organization_name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
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
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          client_id: string
          client_name: string
          created_at: string | null
          created_by: string
          duration_days: number
          end_date: string
          grand_total: number
          gst_amount: number
          gst_percent: number
          id: string
          notes: string | null
          plan_name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          share_token: string | null
          start_date: string
          status: Database["public"]["Enums"]["plan_status"]
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          client_name: string
          created_at?: string | null
          created_by: string
          duration_days: number
          end_date: string
          grand_total?: number
          gst_amount?: number
          gst_percent?: number
          id: string
          notes?: string | null
          plan_name: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          share_token?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["plan_status"]
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          client_name?: string
          created_at?: string | null
          created_by?: string
          duration_days?: number
          end_date?: string
          grand_total?: number
          gst_amount?: number
          gst_percent?: number
          id?: string
          notes?: string | null
          plan_name?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          share_token?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["plan_status"]
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
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
    }
    Functions: {
      generate_campaign_id: { Args: never; Returns: string }
      generate_estimation_id: { Args: never; Returns: string }
      generate_expense_id: { Args: never; Returns: string }
      generate_invoice_id: { Args: never; Returns: string }
      generate_plan_id: { Args: never; Returns: string }
      generate_share_token: { Args: never; Returns: string }
      get_financial_year: { Args: never; Returns: string }
      get_next_code_number: {
        Args: {
          p_counter_key: string
          p_counter_type: string
          p_period: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "sales" | "finance" | "operations"
      asset_installation_status:
        | "Pending"
        | "Assigned"
        | "Mounted"
        | "PhotoUploaded"
        | "Verified"
      campaign_status:
        | "Planned"
        | "Assigned"
        | "InProgress"
        | "PhotoUploaded"
        | "Verified"
        | "Completed"
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
      plan_status: "Draft" | "Sent" | "Approved" | "Rejected" | "Converted"
      plan_type: "Quotation" | "Proposal" | "Estimate"
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
      app_role: ["admin", "user", "sales", "finance", "operations"],
      asset_installation_status: [
        "Pending",
        "Assigned",
        "Mounted",
        "PhotoUploaded",
        "Verified",
      ],
      campaign_status: [
        "Planned",
        "Assigned",
        "InProgress",
        "PhotoUploaded",
        "Verified",
        "Completed",
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
      plan_status: ["Draft", "Sent", "Approved", "Rejected", "Converted"],
      plan_type: ["Quotation", "Proposal", "Estimate"],
    },
  },
} as const
