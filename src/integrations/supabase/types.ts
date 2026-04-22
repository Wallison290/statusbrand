export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          agency_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          agency_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          agency_name?: string | null
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          user_id: string
          company_name: string
          responsible_name: string
          niche: string
          instagram: string | null
          whatsapp: string | null
          email: string | null
          website: string | null
          main_objective: string | null
          target_audience: string | null
          tone_of_voice: string | null
          communication_style: string | null
          differentials: string | null
          services_offered: string | null
          forbidden_words: string | null
          observations: string | null
          status: string
          entry_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          responsible_name: string
          niche: string
          instagram?: string | null
          whatsapp?: string | null
          email?: string | null
          website?: string | null
          main_objective?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          communication_style?: string | null
          differentials?: string | null
          services_offered?: string | null
          forbidden_words?: string | null
          observations?: string | null
          status?: string
          entry_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          responsible_name?: string
          niche?: string
          instagram?: string | null
          whatsapp?: string | null
          email?: string | null
          website?: string | null
          main_objective?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          communication_style?: string | null
          differentials?: string | null
          services_offered?: string | null
          forbidden_words?: string | null
          observations?: string | null
          status?: string
          entry_date?: string
          updated_at?: string
        }
      }
      brand_dna: {
        Row: {
          id: string
          client_id: string
          how_brand_speaks: string | null
          how_brand_not_speaks: string | null
          positioning: string | null
          ideal_language: string | null
          mental_triggers: string | null
          communication_style: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          how_brand_speaks?: string | null
          how_brand_not_speaks?: string | null
          positioning?: string | null
          ideal_language?: string | null
          mental_triggers?: string | null
          communication_style?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          how_brand_speaks?: string | null
          how_brand_not_speaks?: string | null
          positioning?: string | null
          ideal_language?: string | null
          mental_triggers?: string | null
          communication_style?: string | null
          updated_at?: string
        }
      }
      contents: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          term: string
          objective: string
          content_type: string
          tone_of_voice: string
          caption_size: string
          include_emojis: boolean
          include_hashtags: boolean
          additional_notes: string | null
          title: string | null
          subtitle: string | null
          caption: string | null
          cta: string | null
          hashtags: string | null
          keywords: string | null
          visual_suggestion: string | null
          carousel_ideas: string | null
          video_script: string | null
          status: string
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          term: string
          objective: string
          content_type: string
          tone_of_voice: string
          caption_size: string
          include_emojis?: boolean
          include_hashtags?: boolean
          additional_notes?: string | null
          title?: string | null
          subtitle?: string | null
          caption?: string | null
          cta?: string | null
          hashtags?: string | null
          keywords?: string | null
          visual_suggestion?: string | null
          carousel_ideas?: string | null
          video_script?: string | null
          status?: string
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string | null
          subtitle?: string | null
          caption?: string | null
          cta?: string | null
          hashtags?: string | null
          keywords?: string | null
          visual_suggestion?: string | null
          carousel_ideas?: string | null
          video_script?: string | null
          status?: string
          version?: number
          updated_at?: string
        }
      }
      planner: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          content_id: string | null
          title: string
          content_type: string
          scheduled_date: string
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          content_id?: string | null
          title: string
          content_type: string
          scheduled_date: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          content_type?: string
          scheduled_date?: string
          status?: string
          notes?: string | null
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          title: string
          description: string | null
          due_date: string | null
          priority: string
          status: string
          assignee: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          title: string
          description?: string | null
          due_date?: string | null
          priority?: string
          status?: string
          assignee?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          due_date?: string | null
          priority?: string
          status?: string
          assignee?: string | null
          updated_at?: string
        }
      }
      library: {
        Row: {
          id: string
          user_id: string
          category: string
          title: string
          content: string
          niche: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          title: string
          content: string
          niche?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          category?: string
          title?: string
          content?: string
          niche?: string | null
          tags?: string[] | null
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
