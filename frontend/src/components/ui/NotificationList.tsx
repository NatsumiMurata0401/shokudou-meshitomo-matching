import React from 'react'
type Props = {
  userId: string
  token: string
  onUnreadCountChange?: (count: number) => void
}
const NotificationList: React.FC<Props> = ({ userId, onUnreadCountChange }) => {
  // ...実装...
  return (
    <div>
    通知リスト<br />
      ログイン中: {userId}<br />
      メッセージ: {onUnreadCountChange ? 'Provided' : 'Not Provided'}<br />
    </div>
  )
}
export default NotificationList