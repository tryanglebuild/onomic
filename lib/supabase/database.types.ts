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
          created_at: string
        }
        Insert: {
          id: string
          role?: 'user' | 'admin' | 'support'
          full_name?: string | null
          birth_date?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
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
    }
    Enums: {
      workspace_type: 'personal' | 'family'
      workspace_role: 'owner' | 'member'
      invite_status: 'pending' | 'accepted' | 'expired'
      app_role: 'user' | 'admin' | 'support'
    }
  }
}
