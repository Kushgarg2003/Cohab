import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { chatAPI, groupsAPI } from '../api'

const AVATAR_COLORS = ['#E8481C', '#7C3AED', '#0D9488', '#D97706', '#2563EB', '#DC2626', '#059669']
const avatarColor = (id) => AVATAR_COLORS[(id?.charCodeAt(0) || 0) % AVATAR_COLORS.length]

function Avatar({ userId, name, size = 32 }) {
  const initials = name
    ? name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (userId ? userId.slice(0, 2).toUpperCase() : '??')
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: avatarColor(userId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 800, color: 'white', flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function formatTime(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const userId = localStorage.getItem('userId')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const pollingRef = useRef(null)

  const fetchMessages = useCallback(async (silent = false) => {
    try {
      const data = await chatAPI.getMessages(groupId, userId)
      setMessages(prev => {
        // Only update if messages changed
        if (JSON.stringify(prev.map(m => m.id)) === JSON.stringify(data.messages.map(m => m.id))) return prev
        return data.messages
      })
      if (!silent) setLoading(false)
    } catch (e) {
      if (!silent) setError(e.message)
      if (!silent) setLoading(false)
    }
  }, [groupId, userId])

  useEffect(() => {
    if (!userId) { navigate('/'); return }

    // Load group name
    groupsAPI.getGroup(groupId).then(g => setGroupName(g.name || 'Group Chat')).catch(() => {})

    fetchMessages()

    // Poll every 3 seconds
    pollingRef.current = setInterval(() => fetchMessages(true), 3000)
    return () => clearInterval(pollingRef.current)
  }, [groupId, userId, fetchMessages, navigate])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      const msg = await chatAPI.sendMessage(groupId, userId, text)
      setMessages(prev => [...prev, msg])
    } catch (e) {
      setInput(text) // restore on error
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) return (
    <div style={S.centered}>
      <div style={S.spinner} />
    </div>
  )

  if (error) return (
    <div style={S.centered}>
      <p style={{ color: '#ef4444' }}>{error}</p>
      <button onClick={() => navigate(-1)} style={S.btnOutline}>Go back</button>
    </div>
  )

  // Group messages by sender for visual grouping
  const grouped = messages.map((msg, i) => ({
    ...msg,
    isMe: msg.sender_id === userId,
    showAvatar: i === 0 || messages[i - 1].sender_id !== msg.sender_id,
    showName: i === 0 || messages[i - 1].sender_id !== msg.sender_id
  }))

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => navigate(`/group/${groupId}`)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280', padding: 4 }}>←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{groupName}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>Group chat</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {grouped.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <p>No messages yet. Say hello!</p>
          </div>
        )}

        {grouped.map((msg, i) => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: msg.isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginTop: msg.showAvatar && i > 0 ? 12 : 2 }}>
            {/* Avatar */}
            {!msg.isMe && (
              <div style={{ width: 32, flexShrink: 0 }}>
                {msg.showAvatar && <Avatar userId={msg.sender_id} name={msg.sender_name} size={32} />}
              </div>
            )}

            <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: msg.isMe ? 'flex-end' : 'flex-start' }}>
              {msg.showName && !msg.isMe && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 3, marginLeft: 2 }}>{msg.sender_name}</span>
              )}
              <div style={{
                background: msg.isMe ? '#111827' : 'white',
                color: msg.isMe ? 'white' : '#111827',
                padding: '10px 14px',
                borderRadius: msg.isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontSize: 14,
                lineHeight: 1.5,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                border: msg.isMe ? 'none' : '1px solid #e5e7eb',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
              <span style={{ fontSize: 10, color: '#d1d5db', marginTop: 3, marginLeft: 2, marginRight: 2 }}>
                {formatTime(msg.created_at)}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: 'white', borderTop: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          style={{
            flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '10px 14px',
            fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none',
            maxHeight: 120, lineHeight: 1.5, background: '#f9fafb', color: '#111827'
          }}
          onInput={e => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: input.trim() ? '#111827' : '#e5e7eb',
            color: input.trim() ? 'white' : '#9ca3af',
            fontSize: 18, cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s'
          }}
        >↑</button>
      </div>
    </div>
  )
}

const S = {
  centered: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 },
  spinner: { width: 32, height: 32, border: '3px solid #e5e7eb', borderTop: '3px solid #E8481C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  btnOutline: { background: 'transparent', color: '#374151', border: '1.5px solid #e5e7eb', padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}
