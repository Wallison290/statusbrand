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
          role: string
          linked_client_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          agency_name?: string | null
          role?: string
          linked_client_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          agency_name?: string | null
          role?: string
          linked_client_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
          logo_url: string | null
          status: string
          responsible_user_id: string | null
          entry_date: string
          valor_mensal: number | null
          dia_vencimento: number | null
          financial_status: string | null
          last_payment_date: string | null
          manual_status_override: boolean | null
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
          logo_url?: string | null
          status?: string
          responsible_user_id?: string | null
          entry_date?: string
          valor_mensal?: number | null
          dia_vencimento?: number | null
          financial_status?: string | null
          last_payment_date?: string | null
          manual_status_override?: boolean | null
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
          logo_url?: string | null
          status?: string
          responsible_user_id?: string | null
          entry_date?: string
          valor_mensal?: number | null
          dia_vencimento?: number | null
          financial_status?: string | null
          last_payment_date?: string | null
          manual_status_override?: boolean | null
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          approval_status: string | null
          client_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          asset_id: string | null
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
          approval_status?: string | null
          client_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          asset_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          content_type?: string
          scheduled_date?: string
          status?: string
          notes?: string | null
          approval_status?: string | null
          client_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          asset_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      planner_attachments: {
        Row: {
          id: string
          planner_id: string
          user_id: string
          file_name: string
          file_type: string
          file_url: string
          file_size: number | null
          created_at: string
        }
        Insert: {
          id?: string
          planner_id: string
          user_id: string
          file_name: string
          file_type: string
          file_url: string
          file_size?: number | null
          created_at?: string
        }
        Update: {
          file_name?: string
          file_type?: string
          file_url?: string
          file_size?: number | null
        }
        Relationships: []
      }
      planner_links: {
        Row: {
          id: string
          planner_id: string
          user_id: string
          url: string
          label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          planner_id: string
          user_id: string
          url: string
          label?: string | null
          created_at?: string
        }
        Update: {
          url?: string
          label?: string | null
        }
        Relationships: []
      }
      planner_comments: {
        Row: {
          id: string
          planner_id: string
          user_id: string
          role: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          planner_id: string
          user_id: string
          role: string
          message: string
          created_at?: string
        }
        Update: {
          role?: string
          message?: string
        }
        Relationships: []
      }
      client_briefing: {
        Row: {
          id: string
          client_id: string
          data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          title: string
          description: string | null
          due_date: string | null
          due_time: string | null
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
          due_time?: string | null
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
          due_time?: string | null
          priority?: string
          status?: string
          assignee?: string | null
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      content_assets: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          category: string | null
          title: string
          caption: string | null
          content_type: string
          media_url: string | null
          link_url: string | null
          observations: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          category?: string | null
          title: string
          caption?: string | null
          content_type: string
          media_url?: string | null
          link_url?: string | null
          observations?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          category?: string | null
          title?: string
          caption?: string | null
          content_type?: string
          media_url?: string | null
          link_url?: string | null
          observations?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_briefings: {
        Row: {
          id: string
          client_id: string
          data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      client_materials: {
        Row: {
          id: string
          user_id: string
          client_id: string
          title: string
          description: string | null
          type: string
          file_url: string | null
          link_url: string | null
          file_size: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          title: string
          description?: string | null
          type: string
          file_url?: string | null
          link_url?: string | null
          file_size?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          type?: string
          file_url?: string | null
          link_url?: string | null
          file_size?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      client_support_contacts: {
        Row: {
          id: string
          user_id: string
          client_id: string
          name: string
          role: string | null
          contact_type: string
          contact_value: string
          direct_link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          name: string
          role?: string | null
          contact_type: string
          contact_value: string
          direct_link?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          role?: string | null
          contact_type?: string
          contact_value?: string
          direct_link?: string | null
        }
        Relationships: []
      }
      client_checklist: {
        Row: {
          id: string
          client_id: string
          title: string
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          completed?: boolean
          created_at?: string
        }
        Update: {
          title?: string
          completed?: boolean
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          id: string
          client_id: string
          user_id: string
          name: string
          file_url: string
          file_type: string
          file_size: number | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          user_id: string
          name: string
          file_url: string
          file_type: string
          file_size?: number | null
          created_at?: string
        }
        Update: {
          name?: string
          file_url?: string
          file_type?: string
          file_size?: number | null
        }
        Relationships: []
      }
      client_reports: {
        Row: {
          id: string
          client_id: string
          user_id: string
          month: number
          year: number
          followers_start: number | null
          followers_end: number | null
          reach: number | null
          engagement: number | null
          impressions: number | null
          posts_published: number | null
          paid_investment: number | null
          paid_leads: number | null
          paid_cpl: number | null
          paid_conversions: number | null
          paid_roas: number | null
          analysis_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          user_id: string
          month: number
          year: number
          followers_start?: number | null
          followers_end?: number | null
          reach?: number | null
          engagement?: number | null
          impressions?: number | null
          posts_published?: number | null
          paid_investment?: number | null
          paid_leads?: number | null
          paid_cpl?: number | null
          paid_conversions?: number | null
          paid_roas?: number | null
          analysis_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          month?: number
          year?: number
          followers_start?: number | null
          followers_end?: number | null
          reach?: number | null
          engagement?: number | null
          impressions?: number | null
          posts_published?: number | null
          paid_investment?: number | null
          paid_leads?: number | null
          paid_cpl?: number | null
          paid_conversions?: number | null
          paid_roas?: number | null
          analysis_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_attachments: {
        Row: {
          id: string
          report_id: string
          user_id: string
          type: string
          title: string
          description: string | null
          file_url: string | null
          link_url: string | null
          file_size: number | null
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          user_id: string
          type: string
          title: string
          description?: string | null
          file_url?: string | null
          link_url?: string | null
          file_size?: number | null
          created_at?: string
        }
        Update: {
          type?: string
          title?: string
          description?: string | null
          file_url?: string | null
          link_url?: string | null
          file_size?: number | null
        }
        Relationships: []
      }
      client_payments: {
        Row: {
          id: string
          client_id: string
          user_id: string
          reference_month: string
          amount: number
          status: string
          payment_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          user_id: string
          reference_month: string
          amount: number
          status?: string
          payment_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          reference_month?: string
          amount?: number
          status?: string
          payment_date?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feeds: {
        Row: {
          id: string
          user_id: string
          client_id: string
          name: string
          posts: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          name: string
          posts?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          posts?: Json
          updated_at?: string
        }
        Relationships: []
      }
      feed_meta: {
        Row: {
          user_id: string
          client_id: string
          bio: string
          link: string
          updated_at: string
        }
        Insert: {
          user_id: string
          client_id: string
          bio?: string
          link?: string
          updated_at?: string
        }
        Update: {
          bio?: string
          link?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
