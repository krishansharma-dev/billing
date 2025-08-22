export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          quantity: number
          price: number
          min_stock: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category: string
          quantity?: number
          price: number
          min_stock?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          quantity?: number
          price?: number
          min_stock?: number
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          user_id: string
          customer_id: string | null
          customer_name: string
          sale_date: string
          subtotal: number
          tax: number
          total: number
          payment_type: 'cash' | 'credit'
          status: 'paid' | 'pending'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id?: string | null
          customer_name: string
          sale_date?: string
          subtotal?: number
          tax?: number
          total?: number
          payment_type?: 'cash' | 'credit'
          status?: 'paid' | 'pending'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string | null
          customer_name?: string
          sale_date?: string
          subtotal?: number
          tax?: number
          total?: number
          payment_type?: 'cash' | 'credit'
          status?: 'paid' | 'pending'
          created_at?: string
          updated_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string | null
          product_name: string
          quantity: number
          price: number
          total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          price: number
          total: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          price?: number
          total?: number
          created_at?: string
          updated_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          vendor_id: string | null
          vendor_name: string
          purchase_date: string
          subtotal: number
          tax: number
          total: number
          status: 'paid' | 'pending'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          vendor_id?: string | null
          vendor_name: string
          purchase_date?: string
          subtotal?: number
          tax?: number
          total?: number
          status?: 'paid' | 'pending'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          vendor_id?: string | null
          vendor_name?: string
          purchase_date?: string
          subtotal?: number
          tax?: number
          total?: number
          status?: 'paid' | 'pending'
          created_at?: string
          updated_at?: string
        }
      }
      purchase_items: {
        Row: {
          id: string
          purchase_id: string
          product_id: string | null
          product_name: string
          quantity: number
          price: number
          total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          purchase_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          price: number
          total: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          purchase_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          price?: number
          total?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      update_updated_at_column: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
    Enums: {}
  }
}