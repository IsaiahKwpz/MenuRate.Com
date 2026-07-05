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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      brands: {
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
      edit_logs: {
        Row: {
          created_at: string
          field: string
          id: string
          menu_item_id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          field: string
          id?: string
          menu_item_id: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          field?: string
          id?: string
          menu_item_id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edit_logs_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_tags: {
        Row: {
          menu_item_id: string
          tag_id: string
        }
        Insert: {
          menu_item_id: string
          tag_id: string
        }
        Update: {
          menu_item_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_tags_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number | null
          restaurant_id: string
          status: Database["public"]["Enums"]["menu_item_status"]
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["menu_item_status"]
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["menu_item_status"]
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_edits: {
        Row: {
          created_at: string
          field: string
          id: string
          menu_item_id: string
          new_value: string
          old_value: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["edit_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          field: string
          id?: string
          menu_item_id: string
          new_value: string
          old_value?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["edit_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          field?: string
          id?: string
          menu_item_id?: string
          new_value?: string
          old_value?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["edit_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_edits_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_edits_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_edits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          proposed_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["edit_status"]
          type: Database["public"]["Enums"]["tag_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          proposed_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["edit_status"]
          type: Database["public"]["Enums"]["tag_type"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          proposed_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["edit_status"]
          type?: Database["public"]["Enums"]["tag_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pending_tags_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_tags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["edit_status"]
          storage_path: string
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["edit_status"]
          storage_path: string
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["edit_status"]
          storage_path?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_admin: boolean
          trust_score: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          is_admin?: boolean
          trust_score?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          trust_score?: number
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          menu_item_id: string
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          menu_item_id: string
          score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          menu_item_id?: string
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_claims: {
        Row: {
          created_at: string
          id: string
          message: string | null
          restaurant_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["edit_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          restaurant_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["edit_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          restaurant_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["edit_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_claims_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tags: {
        Row: {
          restaurant_id: string
          tag_id: string
        }
        Insert: {
          restaurant_id: string
          tag_id: string
        }
        Update: {
          restaurant_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tags_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string
          brand_id: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          owner_user_id: string | null
          require_owner_approval: boolean
          source: Database["public"]["Enums"]["restaurant_source"]
          status: Database["public"]["Enums"]["restaurant_status"]
          type: Database["public"]["Enums"]["restaurant_type"]
        }
        Insert: {
          address: string
          brand_id?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          owner_user_id?: string | null
          require_owner_approval?: boolean
          source?: Database["public"]["Enums"]["restaurant_source"]
          status?: Database["public"]["Enums"]["restaurant_status"]
          type: Database["public"]["Enums"]["restaurant_type"]
        }
        Update: {
          address?: string
          brand_id?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          owner_user_id?: string | null
          require_owner_approval?: boolean
          source?: Database["public"]["Enums"]["restaurant_source"]
          status?: Database["public"]["Enums"]["restaurant_status"]
          type?: Database["public"]["Enums"]["restaurant_type"]
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["tag_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["tag_type"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["tag_type"]
        }
        Relationships: []
      }
    }
    Views: {
      brand_item_ratings: {
        Row: {
          avg_score: number | null
          brand_id: string | null
          item_name: string | null
          rating_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_ratings: {
        Row: {
          avg_score: number | null
          menu_item_id: string | null
          rating_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      browse_menu_items: {
        Args: { result_limit?: number }
        Returns: {
          avg_score: number
          brand_id: string
          brand_name: string
          category: string
          currency: string
          id: string
          name: string
          price: number
          rating_count: number
          restaurant_id: string
          restaurant_name: string
        }[]
      }
      count_rated_restaurants: { Args: never; Returns: number }
      decrement_trust_score: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      find_matching_restaurant: {
        Args: { candidate_address: string; candidate_name: string }
        Returns: string
      }
      is_low_trust: { Args: { target_user_id: string }; Returns: boolean }
      is_restaurant_owner: {
        Args: { target_restaurant_id: string; target_user_id: string }
        Returns: boolean
      }
      merge_restaurants: {
        Args: { duplicate_id: string; primary_id: string }
        Returns: undefined
      }
      search_menu_items: {
        Args: { search_query: string }
        Returns: {
          avg_score: number
          brand_id: string
          brand_name: string
          category: string
          currency: string
          id: string
          name: string
          price: number
          rating_count: number
          restaurant_id: string
          restaurant_name: string
        }[]
      }
      search_menu_items_by_tag: {
        Args: { target_tag_id: string }
        Returns: {
          avg_score: number
          category: string
          currency: string
          id: string
          name: string
          price: number
          rating_count: number
          restaurant_id: string
          restaurant_name: string
        }[]
      }
      search_menu_items_by_tags: {
        Args: { target_tag_ids: string[] }
        Returns: {
          avg_score: number
          brand_id: string
          brand_name: string
          category: string
          currency: string
          id: string
          name: string
          price: number
          rating_count: number
          restaurant_id: string
          restaurant_name: string
        }[]
      }
      search_restaurants: {
        Args: { search_query: string }
        Returns: {
          address: string
          id: string
          name: string
          status: string
          type: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      top_rated_dishes: {
        Args: { min_ratings?: number; result_limit?: number }
        Returns: {
          avg_score: number
          currency: string
          id: string
          name: string
          price: number
          rating_count: number
          restaurant_id: string
          restaurant_name: string
        }[]
      }
      top_rated_restaurants: {
        Args: { min_ratings?: number; result_limit?: number }
        Returns: {
          address: string
          avg_score: number
          id: string
          name: string
          rating_count: number
        }[]
      }
    }
    Enums: {
      edit_status: "pending" | "approved" | "rejected"
      menu_item_status: "unverified" | "confirmed"
      report_status: "open" | "dismissed" | "removed"
      report_target_type: "menu_item" | "restaurant" | "rating" | "photo"
      restaurant_source: "scraped" | "claimed"
      restaurant_status: "active" | "closed" | "temporarily_closed"
      restaurant_type: "independent" | "chain"
      tag_type: "dish_type" | "cuisine" | "attribute"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      edit_status: ["pending", "approved", "rejected"],
      menu_item_status: ["unverified", "confirmed"],
      report_status: ["open", "dismissed", "removed"],
      report_target_type: ["menu_item", "restaurant", "rating", "photo"],
      restaurant_source: ["scraped", "claimed"],
      restaurant_status: ["active", "closed", "temporarily_closed"],
      restaurant_type: ["independent", "chain"],
      tag_type: ["dish_type", "cuisine", "attribute"],
    },
  },
} as const
