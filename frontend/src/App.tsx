import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Plus, MessageCircle, Calendar, MapPin, DollarSign, Users, Trash2, Send } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import './App.css'
import NotificationList from '@/components/ui/NotificationList'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface User {
  name: string
  token: string
}

interface Meetup {
  id: number
  title: string
  content: string
  structured_data: {
    food_genre?: string
    specific_menu?: string
    location?: string
    budget?: string
    other_requirements: string[]
  }
  hashtags: string[]
  creator: string
  created_at: string
  datetime?: string
}

interface ChatMessage {
  id: number
  user: string
  message: string
  timestamp: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loginForm, setLoginForm] = useState({ name: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', password: '' })
  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [newMeetupContent, setNewMeetupContent] = useState('')
  const [newMeetupDateTime, setNewMeetupDateTime] = useState('')
  const [newMeetupFoodItem, setNewMeetupFoodItem] = useState('')
  const [newMeetupBudget, setNewMeetupBudget] = useState('')
  const [newMeetupLocation, setNewMeetupLocation] = useState('')
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [participants, setParticipants] = useState<string[]>([])
  const [userParticipations, setUserParticipations] = useState<number[]>([])
  const [unreadCounts, setUnreadCounts] = useState<{[key: number]: number}>({})
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showChatDialog, setShowChatDialog] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [meetupParticipants, setMeetupParticipants] = useState<{ [meetupId: number]: string[] }>({})

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setIsLoggedIn(true)
      fetchMeetups()
      fetchNotificationUnreadCount()
    }
  }, [])

  const fetchMeetups = async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (dateFilter) params.append('date_filter', dateFilter)
      
      const response = await fetch(`${API_URL}/api/meetups?${params}`)
      const data = await response.json()
      setMeetups(data)
    } catch (error) {
      console.error('Failed to fetch meetups:', error)
    }
  }
  
  const fetchNotifications = async () => {
    if (!user) return
    try {
      const res = await fetch(`${API_URL}/api/users/${user.name}/notifications`, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        // 必要に応じてsetNotifications(data)などで状態管理
        // 例: setNotifications(data)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }
  useEffect(() => {
    if (isLoggedIn) {
      fetchMeetups()
      fetchUserParticipations()
    }
  }, [searchQuery, dateFilter, isLoggedIn])

  useEffect(() => {
    if (isLoggedIn && meetups.length > 0) {
      fetchUnreadCounts()
    }
  }, [meetups, isLoggedIn])

  useEffect(() => {
    if (user) {
      fetchNotifications()
      fetchNotificationUnreadCount()
    }
  }, [user])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      
      if (response.ok) {
        const data = await response.json()
        const userData = { name: loginForm.name, token: data.token }
        setUser(userData)
        setIsLoggedIn(true)
        fetchNotifications()
        localStorage.setItem('user', JSON.stringify(userData))
        setLoginForm({ name: '', password: '' })
        fetchMeetups()
      } else {
        alert('ログインに失敗しました')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('ログインエラーが発生しました')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      })
      
      if (response.ok) {
        const data = await response.json()
        const userData = { name: registerForm.name, token: data.token }
        setUser(userData)
        setIsLoggedIn(true)
        localStorage.setItem('user', JSON.stringify(userData))
        setRegisterForm({ name: '', password: '' })
        fetchMeetups()
      } else {
        alert('登録に失敗しました')
      }
    } catch (error) {
      console.error('Register error:', error)
      alert('登録エラーが発生しました')
    }
  }

  const handleCreateMeetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const response = await fetch(`${API_URL}/api/meetups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          content: newMeetupContent || `${newMeetupFoodItem} ${newMeetupBudget} ${newMeetupLocation}`,
          datetime: newMeetupDateTime || undefined,
          food_item: newMeetupFoodItem,
          budget: newMeetupBudget,
          location: newMeetupLocation,
          structured_datetime: newMeetupDateTime
        })
      })
      
      if (response.ok) {
        setNewMeetupContent('')
        setNewMeetupDateTime('')
        setNewMeetupFoodItem('')
        setNewMeetupBudget('')
        setNewMeetupLocation('')
        setShowCreateDialog(false)
        fetchMeetups()
      } else {
        alert('募集の作成に失敗しました')
      }
    } catch (error) {
      console.error('Create meetup error:', error)
      alert('募集作成エラーが発生しました')
    }
  }

  const handleJoinMeetup = async (meetupId: number) => {
    if (!user) return

    try {
      const response = await fetch(`${API_URL}/api/meetups/${meetupId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      
      if (response.ok) {
        alert('参加表明しました！')
        fetchParticipants(meetupId)
        fetchUserParticipations()
      } else {
        alert('参加表明に失敗しました')
      }
    } catch (error) {
      console.error('Join meetup error:', error)
    }
  }

  const fetchParticipants = async (meetupId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/meetups/${meetupId}/participants`)
      const data = await response.json()
      setParticipants(data.participants)
    } catch (error) {
      console.error('Failed to fetch participants:', error)
    }
  }

  const fetchUserParticipations = async () => {
    if (!user) return
    
    try {
      const response = await fetch(`${API_URL}/api/user/participations`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUserParticipations(data.map((meetup: Meetup) => meetup.id))
      }
    } catch (error) {
      console.error('Failed to fetch user participations:', error)
    }
  }
  const fetchAllMeetupParticipants = async () => {
    if (!user) return
    const participantsMap: { [meetupId: number]: string[] } = {}
    for (const meetup of meetups) {
      try {
        const response = await fetch(`${API_URL}/api/meetups/${meetup.id}/participants`)
        if (response.ok) {
          const data = await response.json()
          participantsMap[meetup.id] = data.participants
        }
      } catch (error) {
        console.error('Failed to fetch participants for meetup', meetup.id)
      }
    }
    setMeetupParticipants(participantsMap)
  }
  useEffect(() => {
    if (meetups.length > 0) {
      fetchAllMeetupParticipants()
    }
  }, [meetups])
  const fetchNotificationUnreadCount = async () => {
  if (!user) return
  try {
    const res = await fetch(`${API_URL}/api/users/${user.name}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      
      setNotificationUnreadCount(data.unread_count)
      
    }
  } catch (error) {
  }
  }

  const fetchUnreadCounts = async () => {
    if (!user) return
    
    try {
      const promises = meetups.map(async (meetup) => {
        const response = await fetch(`${API_URL}/api/meetups/${meetup.id}/unread-count`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        })
        if (response.ok) {
          const data = await response.json()
          return { meetupId: meetup.id, count: data.unread_count }
        }
        return { meetupId: meetup.id, count: 0 }
      })
      
      const results = await Promise.all(promises)
      const counts = results.reduce((acc, { meetupId, count }) => {
        acc[meetupId] = count
        return acc
      }, {} as {[key: number]: number})
      
      setUnreadCounts(counts)
    } catch (error) {
      console.error('Failed to fetch unread counts:', error)
    }
  }

  const fetchChatMessages = async (meetupId: number) => {
    if (!user) return

    try {
      const response = await fetch(`${API_URL}/api/meetups/${meetupId}/chat`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setChatMessages(data)
      }
    } catch (error) {
      console.error('Failed to fetch chat messages:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedMeetup || !newMessage.trim()) return

    try {
      const response = await fetch(`${API_URL}/api/meetups/${selectedMeetup.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ message: newMessage })
      })
      
      if (response.ok) {
        setNewMessage('')
        fetchChatMessages(selectedMeetup.id)
      }
    } catch (error) {
      console.error('Send message error:', error)
    }
  }

  const handleDeleteMeetup = async (meetupId: number) => {
    if (!user) return
    
    if (!confirm('この募集を削除しますか？')) return

    try {
      const response = await fetch(`${API_URL}/api/meetups/${meetupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      
      if (response.ok) {
        fetchMeetups()
        alert('募集を削除しました')
      } else {
        alert('削除に失敗しました')
      }
    } catch (error) {
      console.error('Delete meetup error:', error)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setIsLoggedIn(false)
    localStorage.removeItem('user')
    setMeetups([])
  }

  const openChatDialog = async (meetup: Meetup) => {
    setSelectedMeetup(meetup)
    setShowChatDialog(true)
    fetchParticipants(meetup.id)
    fetchChatMessages(meetup.id)
    
    try {
      await fetch(`${API_URL}/api/meetups/${meetup.id}/mark-read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      })
      fetchUnreadCounts()
      fetchNotificationUnreadCount()
      fetchNotifications()
    } catch (error) {
      console.error('Failed to mark messages as read:', error)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">衝動メシ友マッチング</CardTitle>
            <CardDescription className="text-center">
              ログインまたは新規登録してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">ログイン</TabsTrigger>
                <TabsTrigger value="register">新規登録</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="名前"
                      value={loginForm.name}
                      onChange={(e) => setLoginForm({...loginForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="パスワード"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">ログイン</Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="名前"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="パスワード"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">新規登録</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">衝動メシ友マッチング</h1>
            <div className="flex items-center space-x-4">
              <Dialog 
                open={showNotificationDialog} 
                onOpenChange={(open) => {
                  setShowNotificationDialog(open)
                  if (!open) {
                    // ダイアログが閉じられた時に未読・既読情報を再取得
                    fetchNotifications()
                    fetchNotificationUnreadCount()
                  }
                }}>
                <DialogTrigger asChild>
                  <button
                    className={`relative focus:outline-none ${
                      notificationUnreadCount > 0 ? 'animate-pulse text-blue-500' : 'text-gray-600'
                    }`}
                  >
                    <MessageCircle className="w-6 h-6" />
                    {notificationUnreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {notificationUnreadCount}
                      </Badge>
                    )}
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>通知</DialogTitle>
                    <DialogDescription>
                      新着通知の一覧です。
                    </DialogDescription>
                  </DialogHeader>
                  {user && (
                    <NotificationList
                      userId={user.name}
                      token={user.token}
                      notifications={notifications}
                      onUnreadCountChange={setNotificationUnreadCount}
                      onClose={() => setShowNotificationDialog(false)}
                      onOpenChat={async (meetupId) => {   
                        const meetup = meetups.find(m => m.id === meetupId)
                        // チャットモーダルを開く
                        if (meetup) {
                          setSelectedMeetup(meetup)
                          setShowChatDialog(true)
                          fetchParticipants(meetup.id)
                          fetchChatMessages(meetup.id)

                        try {
                          await fetch(`${API_URL}/api/meetups/${meetup.id}/mark-read`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${user?.token}` }
                          })
                          fetchUnreadCounts()
                          fetchNotificationUnreadCount()
                          fetchNotifications()
                        } catch (error) {
                          console.error('Failed to mark messages as read:', error)
                        }
                        } 
                      }}
                      fetchNotifications={fetchNotifications}
                      fetchNotificationUnreadCount={fetchNotificationUnreadCount}
                    />
                  )}
                </DialogContent>
              </Dialog>
              <span className="text-sm text-gray-600">こんにちは、{user?.name}さん</span>
              <Button variant="outline" onClick={handleLogout}>ログアウト</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/4">
            <div className="space-y-4">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <Plus className="w-4 h-4 mr-2" />
                    募集を作成
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>新しい募集を作成</DialogTitle>
                    <DialogDescription>
                      食べたいものや希望を自由に入力してください
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateMeetup} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        食べたいもの！
                      </label>
                      <Input
                        placeholder="例：焼肉、ラーメン、イタリアン"
                        value={newMeetupFoodItem}
                        onChange={(e) => setNewMeetupFoodItem(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        予算
                      </label>
                      <select 
                        className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm"
                        value={newMeetupBudget}
                        onChange={(e) => setNewMeetupBudget(e.target.value)}
                      >
                        <option value="">選択してください</option>
                        <option value="〜1,000円">〜1,000円</option>
                        <option value="〜3,000円">〜3,000円</option>
                        <option value="〜5,000円">〜5,000円</option>
                        <option value="5,000円〜">5,000円〜</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        場所
                      </label>
                      <Input
                        placeholder="例：渋谷、新宿、オフィス周辺"
                        value={newMeetupLocation}
                        onChange={(e) => setNewMeetupLocation(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        希望日時
                      </label>
                      <Input
                        type="datetime-local"
                        value={newMeetupDateTime}
                        onChange={(e) => setNewMeetupDateTime(e.target.value)}
                      />
                    </div>
                    
                    <Button type="submit" className="w-full">募集を作成</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">検索・フィルター</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="キーワードで検索"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      日付フィルター
                    </label>
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="lg:w-3/4">
            <div className="space-y-6">
              {meetups.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">まだ募集がありません</p>
                  </CardContent>
                </Card>
              ) : (
                meetups.map((meetup) => (
                  <Card key={meetup.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{meetup.title}</CardTitle>
                          <CardDescription className="text-base text-gray-700 mb-3">
                            {meetup.content}
                          </CardDescription>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {meetup.hashtags.map((tag, index) => (
                              <Badge key={index} variant="secondary">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                        {meetup.creator === user?.name && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMeetup(meetup.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {meetup.structured_data.food_genre && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium">ジャンル:</span>
                            <span className="ml-1">{meetup.structured_data.food_genre}</span>
                          </div>
                        )}
                        {meetup.structured_data.location && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{meetup.structured_data.location}</span>
                          </div>
                        )}
                        {meetup.structured_data.budget && (
                          <div className="flex items-center text-sm text-gray-600">
                            <DollarSign className="w-4 h-4 mr-1" />
                            <span>{meetup.structured_data.budget}</span>
                          </div>
                        )}
                        {meetup.datetime && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{format(parseISO(meetup.datetime), 'yyyy年MM月dd日 HH:mm', { locale: ja })} (JST)</span>
                          </div>
                        )}
                      </div>
                      
                      {meetup.structured_data.other_requirements.length > 0 && (
                        <div className="mb-4">
                          <span className="text-sm font-medium text-gray-700">その他の要望:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {meetup.structured_data.other_requirements.map((req, index) => (
                              <Badge key={index} variant="outline" className="text-xs">{req}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          <span>投稿者: {meetup.creator}</span>
                          {meetupParticipants[meetup.id] && meetupParticipants[meetup.id].length > 0 && (
                            <span className="ml-4 text-blue-600">
                              参加者: {meetupParticipants[meetup.id].join(', ')}
                            </span>
                          )}
                          <span className="ml-4">
                            {format(parseISO(meetup.created_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })} (JST)
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant={
                              userParticipations.includes(meetup.id) || meetup.creator === user?.name
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => handleJoinMeetup(meetup.id)}
                            disabled={userParticipations.includes(meetup.id) || meetup.creator === user?.name}
                          >
                            <Users className="w-4 h-4 mr-1" />
                            {userParticipations.includes(meetup.id) || meetup.creator === user?.name
                              ? "参加済み"
                              : "参加する"}
                          </Button>
                          {(userParticipations.includes(meetup.id) || meetup.creator === user?.name) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openChatDialog(meetup)}
                            className="relative"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            チャット
                            {unreadCounts[meetup.id] > 0 && (
                              <Badge 
                                variant="destructive" 
                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                              >
                                {unreadCounts[meetup.id]}
                              </Badge>
                            )}
                          </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedMeetup?.title}</DialogTitle>
            <DialogDescription>
              参加者: {participants.join(', ')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea className="h-64 w-full border rounded p-4">
              <div className="space-y-2">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-blue-600">{msg.user}</span>
                      <span className="text-xs text-gray-500">
                        {format(parseISO(msg.timestamp), 'yyyy年MM月dd日 HH:mm', { locale: ja })} (JST)
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1">{msg.message}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <Input
                placeholder="メッセージを入力..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
