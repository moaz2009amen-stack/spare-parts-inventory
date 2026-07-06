import { useEffect, useState, useRef } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import type { Database } from '../lib/database.types'

type Notification = Database['public']['Tables']['notifications']['Row']

const LAST_SEEN_KEY = 'notifications_last_seen'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (cancelled) return
        if (data) {
          setNotifications(data)
          updateUnread(data)
        }
      })

    const channel = supabase
      .channel('notifications-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => {
            const updated = [payload.new as Notification, ...prev].slice(0, 30)
            updateUnread(updated)
            return updated
          })
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateUnread = (list: Notification[]) => {
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY)
    const lastSeenDate = lastSeen ? new Date(lastSeen) : new Date(0)
    setUnreadCount(list.filter((n) => new Date(n.created_at) > lastSeenDate).length)
  }

  const handleOpen = () => {
    setOpen((prev) => !prev)
    if (!open) {
      localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString())
      setUnreadCount(0)
    }
  }

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-surface transition-colors text-navy-900"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -left-1 bg-accent text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="pop-enter absolute left-0 mt-2 w-80 max-w-[85vw] bg-white rounded-xl shadow-lg border border-border-soft overflow-hidden z-50 text-slate-800">
          <div className="p-3 border-b border-border-soft font-display font-bold text-navy-900">
            الإشعارات
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-500">لا توجد إشعارات بعد</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-3 border-b border-border-soft last:border-b-0 hover:bg-surface transition-colors">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.created_at).toLocaleString('ar-EG')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
