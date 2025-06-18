import { Badge } from './badge'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'


interface Notification {
  id: number
  type: 'participation' | 'chat'
  related_meetup_id: number | string
  meetup_title: string
  participants?: string[]
  sender?: string
  message_preview?: string
  message?: string
  created_at: string
  is_read: boolean
}

type Props = {
  userId: string
  token: string
  notifications: any[]
  onUnreadCountChange?: (count: number) => void
  onClose?: () => void
  onOpenChat?: (meetupId: number) => void
  fetchNotifications?: () => void
  fetchNotificationUnreadCount?: () => void
  setUnreadCount?: (count: number) => void
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const NotificationList: React.FC<Props> = ({ notifications, token, onClose, onOpenChat, fetchNotifications, fetchNotificationUnreadCount}) => {
  // 通知クリック時
  const handleNotificationClick = async (notification: Notification) => {
    // 参加通知の場合は既読APIを呼ぶ
    if (notification.type === 'participation') {

      await fetch(`${API_URL}/api/notifications/${notification.id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (fetchNotifications) {
        await fetchNotifications()
      }
      if (fetchNotificationUnreadCount) {
      await fetchNotificationUnreadCount()
      }
      onClose?.()
    } else if (notification.type === 'chat') {
      onClose?.()
      setTimeout(() => {
        onOpenChat?.(Number(notification.related_meetup_id))
      }, 100) 
    }
  }

  if (notifications.length === 0) {
    return <div className="text-center text-gray-500 py-8">新しい通知はありません</div>
  }

  const hasUnread = notifications.some(n => !n.is_read)

  return (
    <div className="relative">
      {hasUnread && (
        <div
          className="absolute top-0 left-0 w-full h-2 bg-red-500 animate-pulse rounded-t"
          style={{ zIndex: 10 }}
        />
      )}
      <div className="space-y-2 max-h-96 overflow-y-auto border-t pt-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-3 rounded cursor-pointer border ${n.is_read ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}
            onClick={async () => await handleNotificationClick(n)}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">
                {n.type === 'participation' ? '参加通知' : '新着チャット'}
              </span>
              {!n.is_read && <Badge variant="destructive" className="ml-2">未読</Badge>}
            </div>
            <div className="mt-1 text-sm">
              <span className="font-medium">{n.meetup_title}</span>
              {n.message && (
                <div className="text-gray-700">{n.message}</div>
              )}  
              {n.type === 'participation' && n.participants && (
                <span> に {n.participants.join(', ')} さんが参加しました</span>
              )}
              {n.type === 'chat' && (
                <>
                  <div className="text-xs text-gray-600 mt-1">
                    <span className="font-bold">{n.sender}</span> {n.message_preview}
                  </div>
                </>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {format(parseISO(n.created_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NotificationList