export type Database = {
  public: {
    Tables: {
      voucher_types: {
        Row: {
          id: string
          name: string
          description: string
          value: number
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          value: number
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          value?: number
          image_url?: string | null
          created_at?: string
        }
      }
      vouchers: {
        Row: {
          id: string
          code: string
          voucher_type_id: string
          user_id: string | null
          validated_by: string | null
          status: "active" | "used"
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          voucher_type_id: string
          user_id?: string | null
          validated_by?: string | null
          status?: "active" | "used"
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          voucher_type_id?: string
          user_id?: string | null
          validated_by?: string | null
          status?: "active" | "used"
          used_at?: string | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          login_id: string
          name: string
          email: string
          password_hash: string
          role: "cliente" | "validador"
          created_at: string
        }
        Insert: {
          id?: string
          login_id: string
          name: string
          email: string
          password_hash: string
          role: "cliente" | "validador"
          created_at?: string
        }
        Update: {
          id?: string
          login_id?: string
          name?: string
          email?: string
          password_hash?: string
          role?: "cliente" | "validador"
          created_at?: string
        }
      }
    }
  }
}

export type VoucherType = Database["public"]["Tables"]["voucher_types"]["Row"]
export type Voucher = Database["public"]["Tables"]["vouchers"]["Row"]
export type User = Database["public"]["Tables"]["users"]["Row"]
export type VoucherWithType = Voucher & { voucher_types: VoucherType }
