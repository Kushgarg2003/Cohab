import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { brokerInquiriesAPI } from '../api'

export default function BrokerChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('broker_token')
    if (!token) { navigate('/broker/login'); return }

    brokerInquiriesAPI.getMessages(id)
      .then(d => {
        setData(d)
        setMessages(d.messages || [])
      })
      .catch(() => navigate('/broker/inquiries'))
  }, [id, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    setError('')
    try {
      const msg = await brokerInquiriesAPI.sendMessage(id, input.trim())
      setMessages(prev => [...prev, msg])
      setInput('')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        background: '#1a1a1a', borderBottom: '1px solid #2a2a2a',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate('/broker/inquiries')}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20, padding: 0 }}
        >
          ←
        </button>
        <div>
          <p style={{ margin: 0, fontWeight: 600, color: '#fff', fontSize: 15 }}>
            {data?.listing_title || 'Inquiry'}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
            {data?.status === 'closed' ? 'Closed' : 'Active'}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <p style={{ color: '#666', textAlign: 'center', marginTop: 40 }}>No messages yet.</p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_role === 'broker'
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%',
                background: isMe ? 'linear-gradient(135deg,#6c47ff,#a855f7)' : '#1a1a1a',
                color: '#fff',
                borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '10px 14px',
                border: isMe ? 'none' : '1px solid #2a2a2a',
              }}>
                {!isMe && (
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#a855f7', fontWeight: 600 }}>User</p>
                )}
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{msg.content}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: isMe ? 'rgba(255,255,255,0.6)' : '#555', textAlign: 'right' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {data?.status !== 'closed' && (
        <div style={{
          background: '#1a1a1a', borderTop: '1px solid #2a2a2a',
          padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-end',
        }}>
          <div style={{ flex: 1 }}>
            {error && <p style={{ margin: '0 0 6px', color: '#f44', fontSize: 12 }}>{error}</p>}
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a reply… (Enter to send)"
              rows={1}
              style={{
                width: '100%', background: '#111', border: '1px solid #2a2a2a',
                borderRadius: 10, padding: '10px 14px', color: '#e5e5e5',
                fontSize: 14, resize: 'none', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            style={{
              background: 'linear-gradient(135deg,#6c47ff,#a855f7)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              opacity: sending || !input.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      )}
      {data?.status === 'closed' && (
        <div style={{ background: '#1a1a1a', borderTop: '1px solid #2a2a2a', padding: 14, textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#666', fontSize: 13 }}>This inquiry is closed.</p>
        </div>
      )}
    </div>
  )
}
