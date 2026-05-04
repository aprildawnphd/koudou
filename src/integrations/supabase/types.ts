// Hand-written DB types matching supabase/migrations/20260504_initial_schema.sql.
// When the schema changes, regenerate via:
//   pnpm dlx supabase gen types typescript --project-id zofozmbovnqavpcyfvyp > src/integrations/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type RowOf<T> = T

type Tier = 'dream' | 'strong' | 'interested'
type JobStatus =
  | 'saved'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn'
  | 'closed'
type Priority = 'low' | 'medium' | 'high'
type Warmth = 'champion' | 'warm' | 'cold'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: RowOf<{
          id: string
          name: string | null
          target_roles: string[]
          primary_resume_id: string | null
          created_at: string
          updated_at: string
        }>
        Insert: {
          id: string
          name?: string | null
          target_roles?: string[]
          primary_resume_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      target_companies: {
        Row: RowOf<{
          id: string
          user_id: string
          name: string
          tier: Tier
          notes: string | null
          website: string | null
          created_at: string
          updated_at: string
        }>
        Insert: {
          id?: string
          user_id: string
          name: string
          tier?: Tier
          notes?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['target_companies']['Insert']
        >
        Relationships: []
      }
      jobs: {
        Row: RowOf<{
          id: string
          user_id: string
          target_company_id: string | null
          company: string
          role: string
          status: JobStatus
          sub_status: string | null
          priority: Priority
          match_score: number | null
          due_date: string | null
          applied_date: string | null
          warm: boolean
          posted_url: string | null
          salary_band: string | null
          description: string | null
          notes: string | null
          location: string | null
          created_at: string
          updated_at: string
        }>
        Insert: {
          id?: string
          user_id: string
          target_company_id?: string | null
          company: string
          role: string
          status?: JobStatus
          sub_status?: string | null
          priority?: Priority
          match_score?: number | null
          due_date?: string | null
          applied_date?: string | null
          warm?: boolean
          posted_url?: string | null
          salary_band?: string | null
          description?: string | null
          notes?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'jobs_target_company_id_fkey'
            columns: ['target_company_id']
            referencedRelation: 'target_companies'
            referencedColumns: ['id']
            isOneToOne: false
          },
        ]
      }
      contacts: {
        Row: RowOf<{
          id: string
          user_id: string
          target_company_id: string | null
          name: string
          role: string | null
          warmth: Warmth
          network_role: string | null
          email: string | null
          linkedin_url: string | null
          last_touch: string | null
          follow_up: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }>
        Insert: {
          id?: string
          user_id: string
          target_company_id?: string | null
          name: string
          role?: string | null
          warmth?: Warmth
          network_role?: string | null
          email?: string | null
          linkedin_url?: string | null
          last_touch?: string | null
          follow_up?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>
        Relationships: []
      }
      activities: {
        Row: RowOf<{
          id: string
          user_id: string
          job_id: string | null
          contact_id: string | null
          type: string
          occurred_at: string
          text: string | null
          created_at: string
        }>
        Insert: {
          id?: string
          user_id: string
          job_id?: string | null
          contact_id?: string | null
          type: string
          occurred_at?: string
          text?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
        Relationships: []
      }
      resumes: {
        Row: RowOf<{
          id: string
          user_id: string
          name: string
          content: string | null
          is_primary: boolean
          created_at: string
          updated_at: string
        }>
        Insert: {
          id?: string
          user_id: string
          name: string
          content?: string | null
          is_primary?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['resumes']['Insert']>
        Relationships: []
      }
      cover_letters: {
        Row: RowOf<{
          id: string
          user_id: string
          job_id: string | null
          resume_id: string | null
          content: string | null
          generated_at: string
        }>
        Insert: {
          id?: string
          user_id: string
          job_id?: string | null
          resume_id?: string | null
          content?: string | null
          generated_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['cover_letters']['Insert']
        >
        Relationships: []
      }
      interviews: {
        Row: RowOf<{
          id: string
          user_id: string
          job_id: string
          scheduled_at: string
          type: string | null
          panelists: string[]
          prep_notes: string | null
          created_at: string
        }>
        Insert: {
          id?: string
          user_id: string
          job_id: string
          scheduled_at: string
          type?: string | null
          panelists?: string[]
          prep_notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['interviews']['Insert']>
        Relationships: []
      }
      job_boards: {
        Row: RowOf<{
          id: string
          user_id: string
          name: string
          tag: string | null
          gated: boolean
          active: boolean
          source_url: string | null
          created_at: string
        }>
        Insert: {
          id?: string
          user_id: string
          name: string
          tag?: string | null
          gated?: boolean
          active?: boolean
          source_url?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['job_boards']['Insert']>
        Relationships: []
      }
      milestones: {
        Row: RowOf<{
          id: string
          user_id: string
          kind: string
          fired_at: string
          dismissed_at: string | null
        }>
        Insert: {
          id?: string
          user_id: string
          kind: string
          fired_at?: string
          dismissed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['milestones']['Insert']>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
