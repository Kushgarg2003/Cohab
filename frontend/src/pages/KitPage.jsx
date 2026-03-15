import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { kitAPI } from '../api'

const STATUS_META = {
  to_buy:   { label: 'To Buy',   color: 'var(--amber)',  bg: 'var(--amber-light)' },
  ordered:  { label: 'Ordered',  color: '#6366f1',       bg: 'rgba(99,102,241,0.12)' },
  delivered:{ label: 'Delivered',color: 'var(--green)',  bg: 'var(--green-light)' },
}

const SPLIT_META = {
  shared:     { label: 'Shared 50/50', icon: '🤝' },
  individual: { label: 'Individual',   icon: '👤' },
}

function fmt(n) {
  if (!n) return null
  return `₹${Number(n).toLocaleString('en-IN')}`
}

function ItemCard({ item, userId, members, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(item.purchase_price || '')
  const st = STATUS_META[item.status]
  const split = SPLIT_META[item.split_type]
  const myDebt = item.pending_debts?.find(d => d.debtor_id === userId)
  const iOwe = myDebt ? myDebt.amount : null

  const nextStatus = { to_buy: 'ordered', ordered: 'delivered', delivered: 'delivered' }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{item.item_name}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>{split.icon} {split.label}</span>
            {item.category && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.category}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {item.purchase_price
            ? <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{fmt(item.purchase_price)}</div>
            : item.estimated_cost
            ? <div style={{ fontSize: 13, color: 'var(--text-3)' }}>~{fmt(item.estimated_cost)}</div>
            : null}
          {item.assigned_name && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Owner: {item.assigned_name}</div>}
        </div>
      </div>

      {/* Debt badge */}
      {iOwe && (
        <div style={{ background: 'var(--red-light)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>
          You owe {fmt(iOwe)} to {item.creator_name || 'your roommate'}
        </div>
      )}

      {/* Price input */}
      {editing && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="Actual price paid (₹)"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={() => { onUpdate(item.id, { purchase_price: parseFloat(price) }); setEditing(false) }}
            style={B.btnSmall}>Save</button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {item.status !== 'delivered' && (
          <button onClick={() => onUpdate(item.id, { status: nextStatus[item.status] })} style={B.btnAction}>
            {item.status === 'to_buy' ? '📦 Mark Ordered' : '✅ Mark Delivered'}
          </button>
        )}
        <button onClick={() => setEditing(e => !e)} style={B.btnAction}>💰 Set price</button>
        <button onClick={() => onDelete(item.id)} style={{ ...B.btnAction, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}>Remove</button>
      </div>
    </div>
  )
}

function AddItemModal({ members, userId, onAdd, onClose, bundles }) {
  const [tab, setTab] = useState('custom') // 'custom' | 'bundle'
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [cost, setCost] = useState('')
  const [splitType, setSplitType] = useState('shared')
  const [assignedTo, setAssignedTo] = useState('')

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd({
      item_name: name.trim(),
      category: category || null,
      estimated_cost: cost ? parseFloat(cost) : null,
      split_type: splitType,
      assigned_to: splitType === 'individual' && assignedTo ? assignedTo : null,
    })
    onClose()
  }

  const handleBundleItem = (item) => {
    onAdd({ ...item, split_type: 'shared', assigned_to: null })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, padding: '0 0 0 0' }}>
      <div style={{ background: 'var(--surface)', borderRadius: '24px 24px 0 0', padding: '28px 20px 40px', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', border: '1px solid var(--border-2)', animation: 'slideUp 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Add to The Kit</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['custom', 'bundle'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1px solid var(--border-2)', background: tab === t ? 'var(--primary)' : 'var(--surface-2)', color: tab === t ? 'white' : 'var(--text-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {t === 'custom' ? '✏️ Custom item' : '📦 From bundles'}
            </button>
          ))}
        </div>

        {tab === 'custom' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Item name*" style={B.input} />
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (e.g. Kitchen)" style={B.input} />
            <input value={cost} onChange={e => setCost(e.target.value)} type="number" placeholder="Estimated cost (₹)" style={B.input} />

            <div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 8 }}>OWNERSHIP MODEL</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {['shared', 'individual'].map(s => (
                  <button key={s} onClick={() => setSplitType(s)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${splitType === s ? 'var(--primary)' : 'var(--border-2)'}`, background: splitType === s ? 'var(--primary-light)' : 'var(--surface-2)', color: splitType === s ? 'var(--primary)' : 'var(--text-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    {s === 'shared' ? '🤝 Shared 50/50' : '👤 Individual'}
                  </button>
                ))}
              </div>
            </div>

            {splitType === 'individual' && members.length > 0 && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 8 }}>WHO OWNS IT?</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {members.map(m => (
                    <button key={m.user_id} onClick={() => setAssignedTo(m.user_id)}
                      style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${assignedTo === m.user_id ? 'var(--primary)' : 'var(--border-2)'}`, background: assignedTo === m.user_id ? 'var(--primary-light)' : 'var(--surface-2)', color: assignedTo === m.user_id ? 'var(--primary)' : 'var(--text-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      {m.user_id === userId ? 'Me' : (m.name || 'Roommate')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleAdd} disabled={!name.trim()}
              style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '13px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: name.trim() ? 1 : 0.5, marginTop: 4 }}>
              Add to Kit
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bundles.map(bundle => (
              <div key={bundle.bundle}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>{bundle.emoji} {bundle.bundle}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {bundle.items.map(item => (
                    <div key={item.item_name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.item_name}</span>
                        {item.estimated_cost && <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 8 }}>~{fmt(item.estimated_cost)}</span>}
                      </div>
                      <button onClick={() => { handleBundleItem(item); }}
                        style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid rgba(232,72,28,0.2)', padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function KitPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const userId = localStorage.getItem('userId')
  const [items, setItems] = useState([])
  const [debts, setDebts] = useState([])
  const [members, setMembers] = useState([])
  const [bundles, setBundles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [stats, setStats] = useState({})
  const [activeTab, setActiveTab] = useState('items') // 'items' | 'debts'

  useEffect(() => {
    if (!userId) { navigate('/'); return }
    Promise.all([
      kitAPI.getKit(groupId, userId),
      kitAPI.getDebts(groupId, userId),
      kitAPI.getBundles(),
    ]).then(([kit, debtData, bundleData]) => {
      setItems(kit.items || [])
      setStats({ total_estimated: kit.total_estimated, shared_cost: kit.shared_cost })
      setDebts(debtData.debts || [])
      setBundles(bundleData.bundles || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [groupId, userId])

  const handleAdd = async (item) => {
    const result = await kitAPI.addItem(groupId, userId, item)
    setItems(prev => [...prev, result])
    const debtData = await kitAPI.getDebts(groupId, userId)
    setDebts(debtData.debts || [])
  }

  const handleUpdate = async (itemId, updates) => {
    const result = await kitAPI.updateItem(groupId, itemId, userId, updates)
    setItems(prev => prev.map(i => i.id === itemId ? result : i))
    const debtData = await kitAPI.getDebts(groupId, userId)
    setDebts(debtData.debts || [])
  }

  const handleDelete = async (itemId) => {
    await kitAPI.deleteItem(groupId, itemId, userId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  const handleSettle = async (debtId) => {
    await kitAPI.settleDebt(groupId, debtId, userId)
    setDebts(prev => prev.filter(d => d.debt_id !== debtId))
  }

  const myDebts = debts.filter(d => d.debtor_id === userId)
  const theyOwe = debts.filter(d => d.creditor_id === userId)

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {showAdd && <AddItemModal members={members} userId={userId} onAdd={handleAdd} onClose={() => setShowAdd(false)} bundles={bundles} />}

      {/* Header */}
      <div style={{ background: 'rgba(12,12,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(`/group/${groupId}`)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', color: 'var(--text-2)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>🧰 The Kit</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Shared items & ownership ledger</div>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        {/* Stats */}
        {items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              ['Items', items.length],
              ['Est. Total', fmt(stats.total_estimated) || '—'],
              ['Shared Cost', fmt(stats.shared_cost) || '—'],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[['items', `Items (${items.length})`], ['debts', `Debts (${debts.length})`]].map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border-2)', background: activeTab === t ? 'var(--primary)' : 'var(--surface-2)', color: activeTab === t ? 'white' : 'var(--text-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'items' ? (
          items.length === 0 ? (
            <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 48, textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🧰</div>
              <h3 style={{ fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>The Kit is empty</h3>
              <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 20 }}>Add items you'll need for your new place, or pick from our essential bundles.</p>
              <button onClick={() => setShowAdd(true)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                + Add from bundles
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {Object.entries(grouped).map(([category, catItems]) => (
                <div key={category}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>{category}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {catItems.map(item => (
                      <ItemCard key={item.id} item={item} userId={userId} members={members} onUpdate={handleUpdate} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {debts.length === 0 ? (
              <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 36, textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <p style={{ fontWeight: 700, color: 'var(--text)' }}>All settled up!</p>
                <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>No pending debts.</p>
              </div>
            ) : (
              <>
                {myDebts.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>You Owe</p>
                    {myDebts.map(d => (
                      <div key={d.debt_id} style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{d.item_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>to {d.creditor_name}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--red)' }}>{fmt(d.amount)}</span>
                          <button onClick={() => handleSettle(d.debt_id)} style={{ background: 'var(--green-light)', color: 'var(--green)', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Settle</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {theyOwe.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>They Owe You</p>
                    {theyOwe.map(d => (
                      <div key={d.debt_id} style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{d.item_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{d.debtor_name} owes you</div>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)' }}>{fmt(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const B = {
  input: { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border-2)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  btnAction: { background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border-2)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnSmall: { background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
}
