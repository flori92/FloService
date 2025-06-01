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
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          client_id: string
          service_id: string
          start_time: string
          end_time: string
          status: string
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          service_id: string
          start_time: string
          end_time: string
          status?: string
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          service_id?: string
          start_time?: string
          end_time?: string
          status?: string
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            referencedRelation: "services"
            referencedColumns: ["id"]
          }
        ]
      }
      conversations: {
        Row: {
          id: string
          client_id: string
          provider_id: string
          created_at: string | null
          updated_at: string | null
          last_message: string | null
        }
        Insert: {
          id?: string
          client_id: string
          provider_id: string
          created_at?: string | null
          updated_at?: string | null
          last_message?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          provider_id?: string
          created_at?: string | null
          updated_at?: string | null
          last_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_provider_id_fkey"
            columns: ["provider_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      invoices: {
        Row: {
          id: string
          booking_id: string | null
          client_id: string
          provider_id: string
          amount: number
          status: string
          payment_id: string | null
          pdf_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          booking_id?: string | null
          client_id: string
          provider_id: string
          amount: number
          status?: string
          payment_id?: string | null
          pdf_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          booking_id?: string | null
          client_id?: string
          provider_id?: string
          amount?: number
          status?: string
          payment_id?: string | null
          pdf_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_provider_id_fkey"
            columns: ["provider_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      message_attachments: {
        Row: {
          id: string
          message_id: string
          file_path: string
          file_name: string
          file_type: string | null
          file_size: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          message_id: string
          file_path: string
          file_name: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string
          file_path?: string
          file_name?: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "messages"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          recipient_id: string
          content: string
          read: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          recipient_id: string
          content: string
          read?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          recipient_id?: string
          content?: string
          read?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          email: string | null
          phone: string | null
          is_provider: boolean | null
          is_admin: boolean | null
          created_at: string | null
          updated_at: string | null
          last_seen: string | null
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          email?: string | null
          phone?: string | null
          is_provider?: boolean | null
          is_admin?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          last_seen?: string | null
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          email?: string | null
          phone?: string | null
          is_provider?: boolean | null
          is_admin?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          last_seen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      provider_profiles: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          title: string | null
          description: string | null
          hourly_rate: number | null
          years_experience: number | null
          is_available: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          title?: string | null
          description?: string | null
          hourly_rate?: number | null
          years_experience?: number | null
          is_available?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          title?: string | null
          description?: string | null
          hourly_rate?: number | null
          years_experience?: number | null
          is_available?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      services: {
        Row: {
          id: string
          provider_id: string
          title: string
          description: string | null
          price: number
          duration: number | null
          category_id: string | null
          image_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          provider_id: string
          title: string
          description?: string | null
          price: number
          duration?: number | null
          category_id?: string | null
          image_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          provider_id?: string
          title?: string
          description?: string | null
          price?: number
          duration?: number | null
          category_id?: string | null
          image_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      translations: {
        Row: {
          id: string
          language: string
          key: string
          value: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          language: string
          key: string
          value: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          language?: string
          key?: string
          value?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_invoice_permissions: {
        Args: {
          invoice_id: string
        }
        Returns: boolean
      }
      check_provider_availability: {
        Args: {
          provider_id: string
          start_time: string
          end_time: string
        }
        Returns: boolean
      }
      get_translations: {
        Args: {
          p_language?: string
        }
        Returns: Json
      }
      is_admin: {
        Args: {
          user_id?: string
        }
        Returns: boolean
      }
      is_provider: {
        Args: {
          user_id?: string
        }
        Returns: boolean
      }
      log_audit_action: {
        Args: {
          action: string
          table_name: string
          record_id: string
          old_data?: Json
          new_data?: Json
        }
        Returns: undefined
      }
      safe_search: {
        Args: {
          search_term: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
