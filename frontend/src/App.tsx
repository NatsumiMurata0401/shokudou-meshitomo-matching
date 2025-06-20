import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import RecruitmentList from "./components/ui/RecruitmentList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Plus, MessageCircle, Send } from 'lucide-react'
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
    capacity?: number
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
  const [allMeetups, setAllMeetups] = useState<Meetup[]>([])
  const [highlightedMeetupId, setHighlightedMeetupId] = useState<number | null>(null)

  const recruitments = meetups.map((meetup: Meetup) => {
    const isCreator = user?.name === meetup.creator;
    const isJoined = userParticipations.includes(meetup.id) || isCreator;
    const isHighlighted = highlightedMeetupId === meetup.id;
    const rawUnreadCount = unreadCounts[meetup.id];

    
    let displayDatetime = "未定";
    if (meetup.datetime !== null && 
      meetup.datetime !== undefined && 
      meetup.datetime !== "" && 
      String(meetup.datetime).trim() !== "") {
    displayDatetime = meetup.datetime;
  }

    let displayLocation = "未定";
    if (meetup.structured_data.location !== null && 
      meetup.structured_data.location !== undefined && 
      meetup.structured_data.location !== "" && 
      String(meetup.structured_data.location).trim() !== "") {
    displayLocation = meetup.structured_data.location;
  }
  // デバッグ用ログ
  console.log(`Meetup ${meetup.id} processing:`, {
    original_datetime: meetup.datetime,
    original_location: meetup.structured_data?.location,
    final_datetime: displayDatetime,
    final_location: displayLocation
  });
  
    return {
      id: meetup.id,
      ownerName: meetup.creator,
      title: meetup.title,
      datetime: displayDatetime,
      location: displayLocation,
      joined: isJoined,
      participants: meetupParticipants[meetup.id] || [],
      currentUserName: user?.name,
      unreadCount: rawUnreadCount > 0 ? rawUnreadCount : undefined,
      isHighlighted: isHighlighted,
      onJoin: (id: number) => handleJoinMeetup(id),
      onChat: (id: number) => {
        const meetup = meetups.find(m => m.id === id);
        if (meetup) {
          openChatDialog(meetup);
        }
      },
      onCardClick: (id: number) => {
        // カードクリック時の処理（参加済みの場合のみチャットを開く）
        const clickedMeetup = meetups.find(m => m.id === id);
        const isParticipantOrOwner = userParticipations.includes(id) || user?.name === clickedMeetup?.creator;
        
        if (clickedMeetup && isParticipantOrOwner) {
          openChatDialog(clickedMeetup);
        }
      },
      onDelete: (id: number) => handleDeleteMeetup(id)
    };
  });

  const scrollToMeetupCard = (meetupId: number) => {
    // ハイライト表示
    setHighlightedMeetupId(meetupId)
    
    // スクロール
    setTimeout(() => {
      const element = document.getElementById(`meetup-card-${meetupId}`)
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
      }
    }, 100)
    
    // 3秒後にハイライトを解除
    setTimeout(() => {
      setHighlightedMeetupId(null)
    }, 3000)
  }

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
    const fetchAll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/meetups`)
        const data = await res.json()
        setAllMeetups(data)
      } catch (e) {
        console.error('Failed to fetch all meetups:', e)
      }
    }
    fetchAll()
  }, [])

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
      console.error('Failed to fetch notification unread count:', error)
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
        if (count > 0) {
          acc[meetupId] = count
        }
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

  // ログインしていない場合のUI
  if (!isLoggedIn) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: '#F0FFF0' }}
      >
        <Card 
          className="w-full max-w-md shadow-lg"
          style={{
            backgroundColor: '#F8FFF8',
            border: '1px solid #D9F5E6'
          }}
        >
          <CardHeader>
            <CardTitle 
              className="text-2xl font-bold text-center"
              style={{ color: '#2E8B57' }}
            >
              🍽️ メシ友マッチング
            </CardTitle>
            <CardDescription className="text-center">
              ログインして美味しいご飯を一緒に食べる仲間を見つけよう！
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
                    <label className="block text-sm font-medium mb-1" style={{ color: '#2E8B57' }}>
                      ユーザー名
                    </label>
                    <Input
                      type="text"
                      placeholder="ユーザー名を入力"
                      value={loginForm.name}
                      onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })}
                      required
                      style={{
                        borderColor: '#D9F5E6',
                        backgroundColor: '#FDFDFD'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#2E8B57' }}>
                      パスワード
                    </label>
                    <Input
                      type="password"
                      placeholder="パスワードを入力"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      style={{
                        borderColor: '#D9F5E6',
                        backgroundColor: '#FDFDFD'
                      }}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full font-bold rounded-full"
                    style={{
                      backgroundColor: '#66BB6A',
                      color: 'white'
                    }}
                  >
                    ログイン
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#2E8B57' }}>
                      ユーザー名
                    </label>
                    <Input
                      type="text"
                      placeholder="ユーザー名を入力"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      required
                      style={{
                        borderColor: '#D9F5E6',
                        backgroundColor: '#FDFDFD'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#2E8B57' }}>
                      パスワード
                    </label>
                    <Input
                      type="password"
                      placeholder="パスワードを入力"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                      style={{
                        borderColor: '#D9F5E6',
                        backgroundColor: '#FDFDFD'
                      }}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full font-bold rounded-full"
                    style={{
                      backgroundColor: '#66BB6A',
                      color: 'white'
                    }}
                  >
                    新規登録
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0FFF0' }}>
      <header 
        className="shadow-sm border-b"
        style={{ backgroundColor: '#F8FFF8', borderColor: '#D9F5E6' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 
              className="text-xl font-bold"
              style={{ color: '#2E8B57' }}
            >
              🍽️ メシ友マッチング
            </h1>
            <div className="flex items-center space-x-4">
              <Dialog 
                open={showNotificationDialog} 
                onOpenChange={(open) => {
                  setShowNotificationDialog(open)
                  if (!open) {
                    fetchNotifications()
                    fetchNotificationUnreadCount()
                  }
                }}>
                <DialogTrigger asChild>
                  <button
                    className={`relative p-2 rounded-full transition-colors ${
                      notificationUnreadCount > 0 
                        ? 'text-pink-500 animate-pulse' 
                        : 'text-gray-600 hover:text-green-500'
                    }`}
                    style={{ 
                      backgroundColor: notificationUnreadCount > 0 ? '#FFE5E5' : 'transparent'
                    }}
                  >
                    <MessageCircle className="w-6 h-6" />
                    {notificationUnreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                        style={{ backgroundColor: '#FF6B9D' }}
                      >
                        {notificationUnreadCount}
                      </Badge>
                    )}
                  </button>
                </DialogTrigger>
                <DialogContent 
                  className="sm:max-w-md"
                  style={{
                    backgroundColor: '#F8FFF8',
                    border: '1px solid #D9F5E6'
                  }}
                >
                  <DialogHeader>
                    <DialogTitle style={{ color: '#2E8B57' }}>通知</DialogTitle>
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
              <span 
                className="text-sm font-medium"
                style={{ color: '#2E8B57' }}
              >
                こんにちは、{user?.name}さん
              </span>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                style={{
                  borderColor: '#66BB6A',
                  color: '#66BB6A',
                  backgroundColor: 'transparent'
                }}
                className="hover:bg-green-50"
              >
                ログアウト
              </Button>
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
                  <Button 
                    className="w-full font-bold rounded-full shadow-md"
                    size="lg"
                    style={{
                      backgroundColor: '#66BB6A',
                      color: 'white'
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    募集を作成
                  </Button>
                </DialogTrigger>
                <DialogContent 
                  className="sm:max-w-md"
                  style={{
                    backgroundColor: '#F8FFF8',
                    border: '1px solid #D9F5E6'
                  }}
                >
                  <DialogHeader>
                    <DialogTitle style={{ color: '#2E8B57' }}>新しい募集を作成</DialogTitle>
                    <DialogDescription>
                      食べたいものや希望を自由に入力してください
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateMeetup} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#2E8B57' }}>
                        食べたいもの
                      </label>
                      <Input
                        placeholder="例：焼肉、ラーメン、イタリアン"
                        value={newMeetupFoodItem}
                        onChange={(e) => setNewMeetupFoodItem(e.target.value)}
                        required
                        style={{
                          borderColor: '#D9F5E6',
                          backgroundColor: '#FDFDFD'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#2E8B57' }}>
                        予算
                      </label>
                      <select 
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        style={{
                          borderColor: '#D9F5E6',
                          backgroundColor: '#FDFDFD'
                        }}
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
                      <label className="block text-sm font-medium mb-1" style={{ color: '#2E8B57' }}>
                        場所
                      </label>
                      <Input
                        placeholder="例：渋谷、新宿、オフィス周辺"
                        value={newMeetupLocation}
                        onChange={(e) => setNewMeetupLocation(e.target.value)}
                        style={{
                          borderColor: '#D9F5E6',
                          backgroundColor: '#FDFDFD'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#2E8B57' }}>
                        希望日時
                      </label>
                      <Input
                        type="datetime-local"
                        value={newMeetupDateTime}
                        onChange={(e) => setNewMeetupDateTime(e.target.value)}
                        style={{
                          borderColor: '#D9F5E6',
                          backgroundColor: '#FDFDFD'
                        }}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full font-bold rounded-full"
                      style={{
                        backgroundColor: '#66BB6A',
                        color: 'white'
                      }}
                    >
                      募集を作成
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Card 
                style={{
                  backgroundColor: '#F8FFF8',
                  border: '1px solid #D9F5E6'
                }}
                className="shadow-md"
              >
                <CardHeader>
                  <CardTitle 
                    className="text-lg font-bold"
                    style={{ color: '#2E8B57' }}
                  >
                    検索・フィルター
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: '#66BB6A' }} />
                    <Input
                      placeholder="キーワードで検索"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      style={{
                        borderColor: '#D9F5E6',
                        backgroundColor: '#FDFDFD'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#2E8B57' }}>
                      日付フィルター
                    </label>
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      style={{
                        borderColor: '#D9F5E6',
                        backgroundColor: '#FDFDFD'
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card 
                style={{
                  backgroundColor: '#F8FFF8',
                  border: '1px solid #D9F5E6'
                }}
                className="shadow-md"
              >
                <CardHeader>
                  <CardTitle 
                    className="text-lg font-bold"
                    style={{ color: '#2E8B57' }}
                  >
                    参加している募集
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userParticipations.length === 0 ? (
                    <div className="text-gray-500 text-sm text-center py-4">
                      まだ参加済みの募集はありません
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {allMeetups
                        .filter((meetup) => userParticipations.includes(meetup.id))
                        .map((meetup) => (
                          <li 
                            key={meetup.id} 
                            className="border-b pb-2 rounded-lg p-2 cursor-pointer hover:bg-green-50 transition-colors duration-200"
                            style={{ 
                              backgroundColor: '#FDFDFD',
                              borderColor: '#E6F7ED'
                            }}
                            onClick={() => scrollToMeetupCard(meetup.id)}
                            title="クリックして募集カードに移動"
                          >
                            <span 
                              className="font-medium text-sm"
                              style={{ color: '#2E8B57' }}
                            >
                              {meetup.title}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="lg:w-3/4">
            <div className="space-y-6">
              {recruitments.length === 0 ? (
                <Card 
                  style={{
                    backgroundColor: '#F8FFF8',
                    border: '1px solid #D9F5E6'
                  }}
                  className="shadow-md"
                >
                  <CardContent className="text-center py-12">
                    <p className="text-gray-500">まだ募集がありません</p>
                  </CardContent>
                </Card>
              ) : (
                <RecruitmentList recruitments={recruitments} />
              )}
            </div>
          </div>
        </div>
      </main>

      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent 
          className="sm:max-w-md"
          style={{
            backgroundColor: '#F8FFF8',
            border: '1px solid #D9F5E6'
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: '#2E8B57' }}>{selectedMeetup?.title}</DialogTitle>
            <DialogDescription>
              参加者: {participants.join(', ')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea 
              className="h-64 w-full border rounded p-4"
              style={{
                borderColor: '#D9F5E6',
                backgroundColor: '#FDFDFD'
              }}
            >
              <div className="space-y-2">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <div className="flex justify-between items-start">
                      <span 
                        className="font-medium"
                        style={{ color: '#66BB6A' }}
                      >
                        {msg.user}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(parseISO(msg.timestamp), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
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
                style={{
                  borderColor: '#D9F5E6',
                  backgroundColor: '#FDFDFD'
                }}
              />
              <Button 
                type="submit" 
                size="sm"
                className="rounded-full"
                style={{
                  backgroundColor: '#66BB6A',
                  color: 'white'
                }}
              >
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