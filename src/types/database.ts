export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      likes: {
        Row: {
          created_at: string;
          plan_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          plan_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          plan_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'likes_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plan_summaries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'likes_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      list_spots: {
        Row: {
          added_at: string;
          list_id: string;
          spot_id: number;
        };
        ComputedFields: never;
        Insert: {
          added_at?: string;
          list_id: string;
          spot_id: number;
        };
        Update: {
          added_at?: string;
          list_id?: string;
          spot_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'list_spots_list_id_fkey';
            columns: ['list_id'];
            isOneToOne: false;
            referencedRelation: 'lists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'list_spots_spot_id_fkey';
            columns: ['spot_id'];
            isOneToOne: false;
            referencedRelation: 'spot_summaries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'list_spots_spot_id_fkey';
            columns: ['spot_id'];
            isOneToOne: false;
            referencedRelation: 'spots';
            referencedColumns: ['id'];
          },
        ];
      };
      lists: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lists_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_blocks: {
        Row: {
          block_type: string;
          body: string | null;
          id: string;
          image_path: string | null;
          plan_id: string;
          position: number;
          spot_id: number | null;
          transport_mode: string | null;
        };
        ComputedFields: never;
        Insert: {
          block_type: string;
          body?: string | null;
          id?: string;
          image_path?: string | null;
          plan_id: string;
          position: number;
          spot_id?: number | null;
          transport_mode?: string | null;
        };
        Update: {
          block_type?: string;
          body?: string | null;
          id?: string;
          image_path?: string | null;
          plan_id?: string;
          position?: number;
          spot_id?: number | null;
          transport_mode?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_blocks_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plan_summaries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_blocks_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_blocks_spot_id_fkey';
            columns: ['spot_id'];
            isOneToOne: false;
            referencedRelation: 'spots';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_tags: {
        Row: {
          plan_id: string;
          tag_id: number;
        };
        ComputedFields: never;
        Insert: {
          plan_id: string;
          tag_id: number;
        };
        Update: {
          plan_id?: string;
          tag_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_tags_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plan_summaries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_tags_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          created_at: string;
          id: string;
          published_at: string | null;
          share_token: string | null;
          source_plan_id: string | null;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          published_at?: string | null;
          share_token?: string | null;
          source_plan_id?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          published_at?: string | null;
          share_token?: string | null;
          source_plan_id?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plans_source_plan_id_fkey';
            columns: ['source_plan_id'];
            isOneToOne: false;
            referencedRelation: 'plan_summaries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plans_source_plan_id_fkey';
            columns: ['source_plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      spots: {
        Row: {
          address: string | null;
          area: string | null;
          cover_image_path: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          google_place_id: string | null;
          id: number;
          is_active: boolean;
          is_demo: boolean;
          lat: number;
          lng: number;
          name: string;
          osm_ref: string | null;
          place_kind: string | null;
          sort_order: number;
          source: string;
          spot_type: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          area?: string | null;
          cover_image_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          google_place_id?: string | null;
          id: number;
          is_active?: boolean;
          is_demo?: boolean;
          lat: number;
          lng: number;
          name: string;
          osm_ref?: string | null;
          place_kind?: string | null;
          sort_order?: number;
          source?: string;
          spot_type: string;
        };
        Update: {
          address?: string | null;
          area?: string | null;
          cover_image_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          google_place_id?: string | null;
          id?: number;
          is_active?: boolean;
          is_demo?: boolean;
          lat?: number;
          lng?: number;
          name?: string;
          osm_ref?: string | null;
          place_kind?: string | null;
          sort_order?: number;
          source?: string;
          spot_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'spots_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      tags: {
        Row: {
          id: number;
          name: string;
          slug: string;
          sort_order: number;
          tag_group: string;
        };
        ComputedFields: never;
        Insert: {
          id: number;
          name: string;
          slug: string;
          sort_order?: number;
          tag_group: string;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          sort_order?: number;
          tag_group?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      plan_summaries: {
        Row: {
          author_name: string | null;
          cover_image_path: string | null;
          created_at: string | null;
          has_minor_spot: boolean | null;
          id: string | null;
          like_count: number | null;
          published_at: string | null;
          source_plan_id: string | null;
          spot_count: number | null;
          spot_names: string[] | null;
          status: string | null;
          tag_ids: number[] | null;
          title: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: 'plans_source_plan_id_fkey';
            columns: ['source_plan_id'];
            isOneToOne: false;
            referencedRelation: 'plan_summaries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plans_source_plan_id_fkey';
            columns: ['source_plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      spot_summaries: {
        Row: {
          active_campaign_id: string | null;
          address: string | null;
          area: string | null;
          description: string | null;
          google_place_id: string | null;
          id: number | null;
          is_active: boolean | null;
          is_demo: boolean | null;
          lat: number | null;
          latest_image_path: string | null;
          lng: number | null;
          name: string | null;
          on_map: boolean | null;
          place_kind: string | null;
          post_count: number | null;
          sort_order: number | null;
          source: string | null;
          spot_type: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      distance_m: {
        Args: { p_lat1: number; p_lat2: number; p_lng1: number; p_lng2: number };
        Returns: number;
      };
      get_shared_plan: { Args: { p_token: string }; Returns: Json };
      register_spot: {
        Args: { p_candidate: Json };
        Returns: { reused: boolean; spot_id: number }[];
      };
      save_plan: { Args: { p_plan: Json }; Returns: string };
      save_spot_post: {
        Args: { p_post: Json };
        Returns: { post_id: string; reward_id: string }[];
      };
      search_plans: {
        Args: { p_page?: number; p_page_size?: number; p_tag_ids?: number[] };
        Returns: {
          author_name: string;
          cover_image_path: string;
          created_at: string;
          has_minor_spot: boolean;
          id: string;
          like_count: number;
          match_count: number;
          published_at: string;
          source_plan_id: string;
          spot_count: number;
          spot_names: string[];
          status: string;
          tag_ids: number[];
          title: string;
          total_count: number;
          updated_at: string;
          user_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
