import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // يحفظ الجلسة في localStorage الخاص بالمتصفح/الجهاز، فمتفضلش
    // تسجل دخول كل مرة تفتح فيها التطبيق
    persistSession: true,
    // يجدد رمز الدخول تلقائيًا في الخلفية قبل ما ينتهي، من غير ما
    // يطلب من المستخدم يدخل تاني
    autoRefreshToken: true,
    // يكمل الجلسة تلقائيًا لو المستخدم رجع من رابط تأكيد بريد إلكتروني
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
})
