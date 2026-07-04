import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const email = `${username}@warehouse.local`
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) setError('اسم المستخدم أو كلمة المرور غير صحيحة')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-lg shadow-md w-80 border-t-4 border-accent"
      >
        <h1 className="font-display text-xl font-bold mb-6 text-navy-900 text-center">
          تسجيل الدخول
        </h1>
        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
        <input
          type="text"
          placeholder="اسم المستخدم"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-border-soft rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border-soft rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-white rounded py-2 font-medium hover:bg-accent-dark transition-colors"
        >
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  )
}
