import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oejsgukcmgkmrxttfocg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lanNndWtjbWdrbXJ4dHRmb2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyOTgwNDMsImV4cCI6MjA2Nzg3NDA0M30.tPtSZgoB1zqNThKl470j-Q1hR0X4FS7R3Ywtb4_oixE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
