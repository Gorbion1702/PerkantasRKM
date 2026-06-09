'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const STAFF = [
  'Yemima', 'Riris', 'Diana', 'Metty', 'Bembem', 'Yolanda', 'Gnade', 'Eva', 'Hizkia', 'Jason'
]
const DAYS_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const DAYS_FULL = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const TIMES = [
  '06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30',
  '20:00','20:30','21:00','21:30','22:00','22:30','23:00'
]
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']

function getMonday(offset = 0) {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const m = new Date(d)
  m.setDate(diff + offset * 7)
  m.setHours(0, 0, 0, 0)
  return m
}
function fmtDate(d) { return d.toISOString().split('T')[0] }
function getWeekDates(offset) {
  const mon = getMonday(offset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d
  })
}
function initials(name) {
  const p = name.trim().split(' ')
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase()
}

export default function ScheduleApp() {
  const [currentUser, setCurrentUser] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [view, setView] = useState('personal') // 'personal' | 'all'
  const [tab, setTab] = useState('personal')   // 'personal' | 'shared'
  const [entries, setEntries] = useState([])   // all entries from DB for this week
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)     // null | { mode, di, ti, entry?, type? }
  const [saving, setSaving] = useState(false)

  const weekStart = fmtDate(getMonday(weekOffset))

  // Load user from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('perkantas_user')
    if (saved) setCurrentUser(saved)
  }, [])

  // Fetch entries for this week
  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('jadwal')
      .select('*')
      .eq('week_start', weekStart)
    if (!error && data) setEntries(data)
    setLoading(false)
  }, [weekStart])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('jadwal-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'jadwal',
        filter: `week_start=eq.${weekStart}`
      }, () => { fetchEntries() })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [weekStart, fetchEntries])

  function selectUser(name) {
    setCurrentUser(name)
    localStorage.setItem('perkantas_user', name)
    setModal(null)
  }

  const dates = getWeekDates(weekOffset)
  const today = fmtDate(new Date())
  const mon = dates[0], sun = dates[6]
  const weekLabel = `${mon.getDate()} ${MONTHS[mon.getMonth()]} – ${sun.getDate()} ${MONTHS[sun.getMonth()]} ${sun.getFullYear()}`

  // Helper: get entries for a cell
  function getCellEntries(di, ti, type) {
    return entries.filter(e =>
      e.day_index === di &&
      e.time_index === ti &&
      e.type === type &&
      (type === 'shared' || e.author === (type === 'personal' ? currentUser : e.author))
    )
  }

  async function saveEntry(formData) {
    setSaving(true)
    const { di, ti, entry, type: editType } = modal
    const isShared = formData.type === 'shared' || (modal.mode === 'edit' && editType === 'shared')
    const payload = {
      week_start: weekStart,
      day_index: di,
      time_index: ti,
      title: formData.title,
      duration: formData.dur,
      note: formData.note || '',
      author: currentUser,
      type: isShared ? 'shared' : 'personal',
    }
    if (modal.mode === 'edit' && entry?.id) {
      await supabase.from('jadwal').update(payload).eq('id', entry.id)
    } else {
      await supabase.from('jadwal').insert(payload)
    }
    setSaving(false)
    setModal(null)
    fetchEntries()
  }

  async function deleteEntry() {
    if (!modal?.entry?.id) return
    setSaving(true)
    await supabase.from('jadwal').delete().eq('id', modal.entry.id)
    setSaving(false)
    setModal(null)
    fetchEntries()
  }

  return (
    <>
      <style>{CSS}</style>

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <span className="logo">Perkantas <span className="logo-accent">Jabar</span></span>
          <span className="logo-sub">Jadwal Mingguan</span>
        </div>
        <button className="user-pill" onClick={() => setModal({ mode: 'user' })}>
          <div className="avatar">{currentUser ? initials(currentUser) : '?'}</div>
          <span className="user-name-label">{currentUser || 'Pilih nama'}</span>
          <span className="chevron">▾</span>
        </button>
      </div>

      <div className="main">
        {/* Notice */}
        {!currentUser && (
          <div className="notice">
            👋 Hai! Klik namamu di pojok kanan atas untuk mulai mengisi jadwal.
          </div>
        )}

        {/* Controls */}
        <div className="page-header">
          <div className="week-nav">
            <button className="nav-btn" onClick={() => setWeekOffset(w => w - 1)}>← Lalu</button>
            <span className="week-label">{weekLabel}</span>
            <button className="nav-btn" onClick={() => setWeekOffset(w => w + 1)}>Depan →</button>
          </div>
          <div className="view-toggle">
            <button className={`view-btn${view === 'personal' ? ' active' : ''}`} onClick={() => setView('personal')}>Jadwalku</button>
            <button className={`view-btn${view === 'all' ? ' active' : ''}`} onClick={() => setView('all')}>Semua Staf</button>
          </div>
        </div>

        {view === 'personal' && (
          <div className="tabs">
            <button className={`tab${tab === 'personal' ? ' active' : ''}`} onClick={() => setTab('personal')}>👤 Jadwal Pribadi</button>
            <button className={`tab${tab === 'shared' ? ' active-shared' : ''}`} onClick={() => setTab('shared')}>👥 Jadwal Bersama</button>
          </div>
        )}

        <div className="legend">
          <span className="legend-item"><span className="dot dot-personal" />Jadwal pribadiku</span>
          <span className="legend-item"><span className="dot dot-shared" />Jadwal bersama</span>
          {view === 'all' && <span className="legend-item"><span className="dot dot-other" />Jadwal staf lain</span>}
        </div>

        {loading ? (
          <div className="loading">Memuat jadwal...</div>
        ) : view === 'all' ? (
          <AllView entries={entries} dates={dates} today={today} currentUser={currentUser} />
        ) : (
          <PersonalView
            entries={entries}
            dates={dates}
            today={today}
            currentUser={currentUser}
            tab={tab}
            onCellClick={(di, ti) => {
              if (!currentUser) { setModal({ mode: 'user' }); return }
              setModal({ mode: 'add', di, ti })
            }}
            onEntryClick={(di, ti, entry, type) => {
              setModal({ mode: 'edit', di, ti, entry, type })
            }}
          />
        )}
      </div>

      {/* Modals */}
      {modal?.mode === 'user' && (
        <UserModal
          currentUser={currentUser}
          onSelect={selectUser}
          onClose={() => setModal(null)}
        />
      )}
      {(modal?.mode === 'add' || modal?.mode === 'edit') && (
        <EntryModal
          modal={modal}
          dates={dates}
          tab={tab}
          saving={saving}
          currentUser={currentUser}
          onSave={saveEntry}
          onDelete={deleteEntry}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}

// ---- PersonalView ----
function PersonalView({ entries, dates, today, currentUser, tab, onCellClick, onEntryClick }) {
  return (
    <div className="schedule-card">
      <div className="grid-header">
        <div className="gh-cell" style={{ fontSize: 11 }}>Waktu</div>
        {dates.map((d, i) => (
          <div key={i} className={`gh-cell${fmtDate(d) === today ? ' today' : ''}`}>
            <div>{DAYS_SHORT[i]}</div>
            <div className="day-num">{d.getDate()}</div>
          </div>
        ))}
      </div>
      {TIMES.map((t, ti) => (
        <div key={ti} className="grid-row">
          <div className="time-col">{t}</div>
          {Array.from({ length: 7 }, (_, di) => {
            const personal = tab === 'personal'
              ? entries.filter(e => e.day_index === di && e.time_index === ti && e.type === 'personal' && e.author === currentUser)
              : []
            const shared = entries.filter(e => e.day_index === di && e.time_index === ti && e.type === 'shared')
            return (
              <div key={di} className="grid-cell" onClick={() => onCellClick(di, ti)}>
                {personal.map(e => (
                  <span key={e.id} className="entry personal"
                    title={e.note || e.title}
                    onClick={ev => { ev.stopPropagation(); onEntryClick(di, ti, e, 'personal') }}>
                    {e.title}
                  </span>
                ))}
                {shared.map(e => (
                  <span key={e.id} className="entry shared"
                    title={e.note || e.title}
                    onClick={ev => { ev.stopPropagation(); onEntryClick(di, ti, e, 'shared') }}>
                    {e.title}
                  </span>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ---- AllView ----
function AllView({ entries, dates, today, currentUser }) {
  // Group entries by author+day+time for display
  return (
    <div className="staff-table-wrap">
      <table className="staff-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left', paddingLeft: 10, width: 110 }}>Staf</th>
            {dates.map((d, i) => (
              <th key={i} className={fmtDate(d) === today ? 'today' : ''}>
                {DAYS_SHORT[i]} {d.getDate()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STAFF.map(s => (
            <tr key={s}>
              <td className="staff-name-td">{s.split(' ')[0]}</td>
              {Array.from({ length: 7 }, (_, di) => {
                const dayEntries = entries.filter(e => e.day_index === di && (e.author === s || e.type === 'shared'))
                // deduplicate shared entries shown once per day col
                const personal = dayEntries.filter(e => e.type === 'personal' && e.author === s)
                const shared = di === 0
                  ? entries.filter(e => e.type === 'shared')
                  : [] // show shared only in first occurrence per day across rows – actually show per cell
                const sharedInDay = entries.filter(e => e.day_index === di && e.type === 'shared')
                const isMine = s === currentUser
                return (
                  // <td key={di}>
                  //   {personal.map(e => (
                  //     <span key={e.id} className="mini-entry"
                  //       style={{ background: isMine ? 'var(--green-light)' : 'var(--gray-light)', color: isMine ? 'var(--green-dark)' : 'var(--gray-dark)' }}
                  //       title={`${TIMES[e.time_index]} · ${e.title}`}>
                  //       {TIMES[e.time_index]} {e.title}
                  //     </span>
                  //   ))}
                  //   {s === STAFF[0] && sharedInDay.map(e => (
                  //     <span key={e.id} className="mini-entry"
                  //       style={{ background: 'var(--blue-light)', color: 'var(--blue-dark)' }}
                  //       title={`${TIMES[e.time_index]} · ${e.title} (bersama)`}>
                  //       👥 {e.title}
                  //     </span>
                  //   ))}
                  // </td>
                  <td key={di}>
                  {personal.map(e => (
                    <span key={e.id} className="mini-entry"
                      style={{ background: isMine ? 'var(--green-light)' : 'var(--gray-light)', color: isMine ? 'var(--green-dark)' : 'var(--gray-dark)' }}
                      title={`${TIMES[e.time_index]} · ${e.title}`}>
                      {TIMES[e.time_index]} {e.title}
                    </span>
                  ))}
                  {sharedInDay.map(e => (
                    <span key={e.id} className="mini-entry"
                      style={{ background: 'var(--blue-light)', color: 'var(--blue-dark)' }}
                      title={`${TIMES[e.time_index]} · ${e.title} (bersama)`}>
                      👥 {e.title}
                    </span>
                  ))}
                </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---- EntryModal ----
function EntryModal({ modal, dates, tab, saving, currentUser, onSave, onDelete, onClose }) {
  const { di, ti, entry, type: editType, mode } = modal
  const isOwner = mode === 'add' || editType === 'personal' || entry?.author === currentUser
  const d = dates[di]
  const dLabel = `${DAYS_FULL[di]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
  const title = `${mode === 'edit' ? (isOwner ? 'Edit' : 'Lihat') : 'Tambah'} kegiatan · ${dLabel} ${TIMES[ti]}`

  const [form, setForm] = useState({
    title: entry?.title || '',
    dur: entry?.duration || 1,
    note: entry?.note || '',
    type: tab === 'shared' ? 'shared' : 'personal',
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave(form)
  }

  return (
    <div className="backdrop" onClick={e => e.target.className === 'backdrop' && onClose()}>
      <div className="modal">
        <h3>{title}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nama kegiatan</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="mis. Pemuridan, Rapat tim, Doa pagi..."
              disabled={!isOwner}
              required
            />
          </div>
          <div className="form-group">
            <label>Durasi</label>
            <select value={form.dur} onChange={e => setForm(f => ({ ...f, dur: +e.target.value }))} disabled={!isOwner}>
              <option value={1}>1 jam</option>
              <option value={2}>2 jam</option>
              <option value={3}>3 jam</option>
              <option value={4}>4 jam</option>
              <option value={5}>5 jam</option>
              <option value={6}>6 jam</option>
              <option value={7}>7 jam</option>
              <option value={8}>8 jam</option>
              <option value={9}>9 jam</option>
              <option value={10}>10 jam</option>         
            </select>
          </div>
          {mode === 'add' && (
            <div className="form-group">
              <label>Jenis jadwal</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="personal">Pribadi (hanya saya yang lihat)</option>
                <option value="shared">Bersama (semua staf bisa lihat & edit)</option>
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Catatan (opsional)</label>
            <textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Detail, lokasi, dll..."
              disabled={!isOwner}
            />
          </div>
          {entry && <p className="entry-author">Oleh: {entry.author}</p>}
          <div className="btn-row">
            <button type="button" className="btn" onClick={onClose}>Batal</button>
            {mode === 'edit' && isOwner && (
              <button type="button" className="btn danger" onClick={onDelete} disabled={saving}>Hapus</button>
            )}
            {isOwner && (
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- UserModal ----
function UserModal({ currentUser, onSelect, onClose }) {
  return (
    <div className="backdrop" onClick={e => e.target.className === 'backdrop' && onClose()}>
      <div className="modal user-modal">
        <h3>Siapa kamu?</h3>
        <p className="user-modal-sub">Pilih namamu untuk mulai mengisi jadwal.</p>
        <div className="user-list">
          {STAFF.map(s => (
            <button key={s} className={`user-option${s === currentUser ? ' selected' : ''}`} onClick={() => onSelect(s)}>
              <div className="avatar">{initials(s)}</div>
              <span>{s}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---- CSS ----
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #ffffff; --bg2: #f5f5f3; --bg3: #eeede9;
    --text: #1a1a18; --text2: #6b6b67; --text3: #9e9e9a;
    --border: rgba(0,0,0,0.12); --border2: rgba(0,0,0,0.22);
    --green: #1D9E75; --green-l: #9FE1CB; --green-d: #085041; --green-bg: #E1F5EE;
    --blue-l: #B5D4F4; --blue-d: #0C447C; --blue-bg: #E6F1FB;
    --gray-l: #D3D1C7; --gray-d: #444441;
    --red-bg: #FCEBEB; --red: #A32D2D;
    --r: 8px; --rl: 12px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1e1e1c; --bg2: #2a2a28; --bg3: #333331;
      --text: #f0efe9; --text2: #a8a8a2; --text3: #6b6b67;
      --border: rgba(255,255,255,0.1); --border2: rgba(255,255,255,0.2);
      --green-l: #085041; --green-d: #9FE1CB; --green-bg: #043428;
      --blue-l: #0C447C; --blue-d: #B5D4F4; --blue-bg: #042C53;
      --gray-l: #444441; --gray-d: #D3D1C7;
      --red-bg: #3a1818; --red: #F09595;
    }
  }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg3); color: var(--text); min-height: 100vh; }
  .topbar { background: var(--bg); border-bottom: 0.5px solid var(--border); padding: 0 1.5rem; position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; height: 56px; gap: 12px; }
  .topbar-left { display: flex; align-items: center; gap: 10px; }
  .logo { font-size: 15px; font-weight: 600; color: var(--text); }
  .logo-accent { color: var(--green); }
  .logo-sub { font-size: 12px; color: var(--text3); }
  .user-pill { display: flex; align-items: center; gap: 8px; background: var(--bg2); border: 0.5px solid var(--border); border-radius: 999px; padding: 5px 12px 5px 8px; cursor: pointer; }
  .avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--green); color: var(--green-bg); font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .user-name-label { font-size: 13px; font-weight: 500; color: var(--text); }
  .chevron { font-size: 11px; color: var(--text3); }
  .main { max-width: 1100px; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
  .notice { background: var(--blue-bg); color: var(--blue-d); border-radius: var(--r); padding: 10px 14px; font-size: 13px; margin-bottom: 1rem; border: 0.5px solid var(--blue-l); }
  .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 10px; }
  .week-nav { display: flex; align-items: center; gap: 8px; }
  .nav-btn { background: var(--bg); border: 0.5px solid var(--border2); border-radius: var(--r); padding: 6px 12px; cursor: pointer; color: var(--text2); font-size: 13px; }
  .nav-btn:hover { background: var(--bg2); }
  .week-label { font-size: 14px; font-weight: 500; color: var(--text); min-width: 200px; text-align: center; }
  .view-toggle { display: flex; background: var(--bg2); border: 0.5px solid var(--border); border-radius: var(--r); overflow: hidden; }
  .view-btn { padding: 6px 14px; font-size: 13px; cursor: pointer; border: none; background: transparent; color: var(--text2); font-family: inherit; }
  .view-btn:hover { background: var(--bg3); }
  .view-btn.active { background: var(--green); color: var(--green-bg); font-weight: 500; }
  .tabs { display: flex; gap: 6px; margin-bottom: 1rem; }
  .tab { padding: 7px 16px; border-radius: var(--r); border: 0.5px solid var(--border2); font-size: 13px; cursor: pointer; background: var(--bg); color: var(--text2); font-family: inherit; }
  .tab:hover { background: var(--bg2); }
  .tab.active { background: var(--green); color: var(--green-bg); border-color: var(--green); font-weight: 500; }
  .tab.active-shared { background: #185FA5; color: var(--blue-bg); border-color: #185FA5; font-weight: 500; }
  .legend { display: flex; gap: 14px; margin-bottom: 12px; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text2); }
  .dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
  .dot-personal { background: var(--green-l); }
  .dot-shared { background: var(--blue-l); }
  .dot-other { background: var(--gray-l); }
  .schedule-card { background: var(--bg); border: 0.5px solid var(--border); border-radius: var(--rl); overflow: hidden; }
  .grid-header { display: grid; grid-template-columns: 72px repeat(7, 1fr); background: var(--bg2); border-bottom: 0.5px solid var(--border); }
  .gh-cell { padding: 8px 4px; font-size: 12px; font-weight: 500; color: var(--text2); text-align: center; border-right: 0.5px solid var(--border); }
  .gh-cell:last-child { border-right: none; }
  .gh-cell.today { color: var(--green); }
  .day-num { font-size: 15px; font-weight: 600; margin-top: 2px; color: var(--text); }
  .gh-cell.today .day-num { color: var(--green); }
  .grid-row { display: grid; grid-template-columns: 72px repeat(7, 1fr); border-top: 0.5px solid var(--border); }
  .time-col { font-size: 11px; color: var(--text3); text-align: right; padding: 0 8px; line-height: 44px; border-right: 0.5px solid var(--border); white-space: nowrap; }
  .grid-cell { min-height: 44px; border-right: 0.5px solid var(--border); padding: 2px; cursor: pointer; transition: background 0.1s; }
  .grid-cell:last-child { border-right: none; }
  .grid-cell:hover { background: var(--bg2); }
  .entry { border-radius: 4px; padding: 3px 6px; font-size: 11px; font-weight: 500; line-height: 1.4; margin: 1px; cursor: pointer; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .entry.personal { background: var(--green-l); color: var(--green-d); }
  .entry.shared { background: var(--blue-l); color: var(--blue-d); }
  .staff-table-wrap { background: var(--bg); border: 0.5px solid var(--border); border-radius: var(--rl); overflow-x: auto; }
  .staff-table { width: 100%; border-collapse: collapse; min-width: 700px; table-layout: fixed; }
  .staff-table th { padding: 8px 6px; font-size: 12px; font-weight: 500; color: var(--text2); background: var(--bg2); border-bottom: 0.5px solid var(--border); border-right: 0.5px solid var(--border); text-align: center; }
  .staff-table th:last-child { border-right: none; }
  .staff-table th.today { color: var(--green); }
  .staff-table td { padding: 4px; border-bottom: 0.5px solid var(--border); border-right: 0.5px solid var(--border); vertical-align: top; }
  .staff-table td:last-child { border-right: none; }
  .staff-table tr:last-child td { border-bottom: none; }
  .staff-name-td { font-size: 12px; font-weight: 500; color: var(--text); background: var(--bg2); padding: 6px 8px !important; white-space: nowrap; }
  .mini-entry { border-radius: 3px; padding: 2px 5px; font-size: 10px; font-weight: 500; margin: 1px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
  .loading { text-align: center; padding: 3rem; color: var(--text2); font-size: 13px; }
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal { background: var(--bg); border-radius: var(--rl); border: 0.5px solid var(--border2); padding: 1.5rem; width: 100%; max-width: 380px; box-shadow: 0 8px 32px rgba(0,0,0,0.18); }
  .modal h3 { font-size: 16px; font-weight: 600; margin-bottom: 1rem; color: var(--text); }
  .form-group { margin-bottom: 12px; }
  .form-group label { display: block; font-size: 12px; color: var(--text2); margin-bottom: 4px; font-weight: 500; }
  .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 10px; border: 0.5px solid var(--border2); border-radius: var(--r); font-size: 14px; background: var(--bg); color: var(--text); font-family: inherit; outline: none; transition: border-color 0.15s; }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--green); }
  .form-group textarea { resize: vertical; min-height: 64px; }
  .form-group input:disabled, .form-group select:disabled, .form-group textarea:disabled { opacity: 0.6; cursor: not-allowed; }
  .entry-author { font-size: 12px; color: var(--text3); margin-bottom: 4px; }
  .btn-row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 1rem; }
  .btn { padding: 8px 18px; border-radius: var(--r); font-size: 13px; font-weight: 500; cursor: pointer; border: 0.5px solid var(--border2); background: var(--bg); color: var(--text); font-family: inherit; }
  .btn:hover { background: var(--bg2); }
  .btn.primary { background: var(--green); color: var(--green-bg); border-color: var(--green); }
  .btn.primary:hover { opacity: 0.88; }
  .btn.danger { background: var(--red-bg); color: var(--red); border-color: var(--red); }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .user-modal { max-width: 340px; }
  .user-modal-sub { font-size: 13px; color: var(--text2); margin-bottom: 12px; }
  .user-list { display: flex; flex-direction: column; gap: 6px; max-height: 60vh; overflow-y: auto; }
  .user-option { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--r); border: 0.5px solid var(--border); cursor: pointer; background: var(--bg); text-align: left; width: 100%; font-family: inherit; font-size: 14px; font-weight: 500; color: var(--text); transition: background 0.1s; }
  .user-option:hover { background: var(--bg2); border-color: var(--green); }
  .user-option.selected { border-color: var(--green); background: var(--green-bg); }
  @media (max-width: 600px) {
    .topbar { padding: 0 1rem; }
    .week-label { min-width: 140px; font-size: 13px; }
    .main { padding: 1rem 0.5rem 3rem; }
    .time-col { font-size: 10px; padding: 0 4px; }
    .gh-cell { font-size: 10px; padding: 6px 2px; }
  }
`
