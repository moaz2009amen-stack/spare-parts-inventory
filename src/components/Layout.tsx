import { NavLink, Outlet } from 'react-router-dom'
import {
  Package, Users, Truck, ShoppingCart,
  ShoppingBag, Warehouse, LogOut, Wrench,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const links = [
  { to: '/products', label: 'الأصناف', icon: Package },
  { to: '/customers', label: 'العملاء', icon: Users },
  { to: '/suppliers', label: 'الموردين', icon: Truck },
  { to: '/sales', label: 'المبيعات', icon: ShoppingCart },
  { to: '/purchases', label: 'المشتريات', icon: ShoppingBag },
  { to: '/inventory', label: 'المخزون', icon: Warehouse },
]

export default function Layout() {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="w-64 flex flex-col bg-gradient-to-b from-navy-900 to-navy-950 text-white">
        <div className="flex items-center gap-2 p-5 border-b border-white/10">
          <Wrench className="text-accent" size={22} />
          <span className="font-display font-extrabold text-lg">نظام المخزن</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border-r-2 ${
                  isActive
                    ? 'bg-white/10 border-accent text-white'
                    : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="m-3 flex items-center justify-center gap-2 rounded-lg border border-white/15 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
