// Hand-authored placeholder for Supabase generated types.
// TODO: replace with the real output of `supabase gen types typescript --local`
// once migrations are approved and applied for real.
export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          type: 'personal' | 'family'
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          type: 'personal' | 'family'
          name: string
          created_by: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['workspaces']['Insert']>
        Relationships: []
      }
      workspace_members: {
        Row: {
          workspace_id: string
          user_id: string
          role: 'owner' | 'member'
          joined_at: string
        }
        Insert: {
          workspace_id: string
          user_id: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
        Update: Partial<Database['public']['Tables']['workspace_members']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_invites: {
        Row: {
          id: string
          workspace_id: string
          invited_email: string
          token: string
          status: 'pending' | 'accepted' | 'expired'
          created_by: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          invited_email: string
          token: string
          status?: 'pending' | 'accepted' | 'expired'
          created_by: string
          created_at?: string
          expires_at: string
        }
        Update: Partial<Database['public']['Tables']['workspace_invites']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'workspace_invites_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          role: 'user' | 'admin' | 'support'
          full_name: string | null
          birth_date: string | null
          handle: string | null
          avatar_path: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: 'user' | 'admin' | 'support'
          full_name?: string | null
          birth_date?: string | null
          handle: string
          avatar_path?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      onboarding_profiles: {
        Row: {
          id: string
          primary_goals: ('budgeting' | 'saving' | 'investing' | 'family')[]
          risk_profile: 'conservative' | 'moderate' | 'aggressive' | null
          investment_target_amount: number | null
          investment_target_frequency: 'monthly' | 'quarterly' | null
          asset_preferences: ('crypto' | 'stocks' | 'etfs' | 'undecided')[]
          current_step: number
          completed_at: string | null
          skipped_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          primary_goals?: ('budgeting' | 'saving' | 'investing' | 'family')[]
          risk_profile?: 'conservative' | 'moderate' | 'aggressive' | null
          investment_target_amount?: number | null
          investment_target_frequency?: 'monthly' | 'quarterly' | null
          asset_preferences?: ('crypto' | 'stocks' | 'etfs' | 'undecided')[]
          current_step?: number
          completed_at?: string | null
          skipped_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['onboarding_profiles']['Insert']>
        Relationships: []
      }
      reserved_handles: {
        Row: { handle: string }
        Insert: { handle: string }
        Update: Partial<Database['public']['Tables']['reserved_handles']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_family_workspace: {
        Args: { p_name: string }
        Returns: string
      }
      accept_workspace_invite: {
        Args: { p_invite_id: string }
        Returns: undefined
      }
      get_invite_preview: {
        Args: { p_invite_id: string }
        Returns: {
          workspace_name: string
          invited_email: string
          status: 'pending' | 'accepted' | 'expired'
          expires_at: string
        }[]
      }
      get_workspace_members_with_email: {
        Args: { p_workspace_id: string }
        Returns: {
          user_id: string
          role: 'owner' | 'member'
          joined_at: string
          email: string
        }[]
      }
      is_handle_available: {
        Args: { p_handle: string }
        Returns: boolean
      }
      suggest_handle: {
        Args: { p_full_name: string }
        Returns: string
      }
    }
    Enums: {
      workspace_type: 'personal' | 'family'
      workspace_role: 'owner' | 'member'
      invite_status: 'pending' | 'accepted' | 'expired'
      app_role: 'user' | 'admin' | 'support'
    }
  }
}
