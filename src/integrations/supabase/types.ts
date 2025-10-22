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
          created_at: string | null
          created_by: string | null
          dimensions: string
          direction: string | null
          district: string | null
          electricity: number | null
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
          state: string | null
          status: Database["public"]["Enums"]["media_asset_status"]
          total_sqft: number | null
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
          created_at?: string | null
          created_by?: string | null
          dimensions: string
          direction?: string | null
          district?: string | null
          electricity?: number | null
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
          state?: string | null
          status?: Database["public"]["Enums"]["media_asset_status"]
          total_sqft?: number | null
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
          created_at?: string | null
          created_by?: string | null
          dimensions?: string
          direction?: string | null
          district?: string | null
          electricity?: number | null
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
          state?: string | null
          status?: Database["public"]["Enums"]["media_asset_status"]
          total_sqft?: number | null
          updated_at?: string | null
          vendor_details?: Json | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_campaign_id: { Args: never; Returns: string }
      generate_plan_id: { Args: never; Returns: string }
      generate_share_token: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      media_asset_status: "Available" | "Booked" | "Blocked" | "Maintenance"
      media_category: "OOH" | "DOOH" | "Transit"
      ownership_type: "own" | "rented"
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
      app_role: ["admin", "user"],
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
      media_asset_status: ["Available", "Booked", "Blocked", "Maintenance"],
      media_category: ["OOH", "DOOH", "Transit"],
      ownership_type: ["own", "rented"],
      plan_status: ["Draft", "Sent", "Approved", "Rejected", "Converted"],
      plan_type: ["Quotation", "Proposal", "Estimate"],
    },
  },
} as const
