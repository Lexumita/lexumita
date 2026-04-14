// src/pages/avvocato/Calendario.jsx

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Video, Phone, Calendar, ChevronLeft, ChevronRight, X, Check, Plus, Clock, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

const TIPO_ICON = { presenza: MapPin, videocall: Video, telefonico: Phone, udienza: Calendar }
const TIPO_LABEL = { presenza: 'In presenza', videocall: 'Videocall', telefonico: 'Telefonico', udienza: 'Udienza' }

const STATO_CONFIG = {
  programmato: { label: 'Programmato', bg: 'bg-oro/10', text: 'text-oro', border: 'border-oro/30' },
  concluso: { label: 'Concluso', bg: 'bg-salvia/10', text: 'text-salvia', border: 'border-salvia/30' },
  annullato: { label: 'Annullato', bg: 'bg-red-900/20', text: 'text-red-400', border: 'border-red-500/30' },
}

const AVATAR_COLORS = [
  'bg-oro/80 text-petrolio', 'bg-salvia/80 text-petrolio',
  'bg-blue-400/80 text-petrolio', 'bg-purple-400/80 text-petrolio',
]

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function oraDa(iso) { if (!iso) return ''; return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }
function dataDa(iso) { if (!iso) return ''; return new Date(iso).toISOString().slice(0, 10) }

function StatBox({ label, value, colorClass = 'text-oro' }) {
  return (
    <div className="bg-slate border border-white/5 px-5 py-4">
      <p className={`font-display text-3xl font-semibold ${colorClass}`}>{value}</p>
      <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mt-1">{label}</p>
    </div>
  )
}

function BadgeStato({ stato }) {
  const cfg = STATO_CONFIG[stato] ?? STATO_CONFIG.programmato
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-body font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  )
}

export default function AvvocatoCalendar() {
  const today = new Date()

  const [meId, setMeId] = useState(null)
  const [isStudio, setIsStudio] = useState(false)
  const [membri, setMembri] = useState([])
  const [ids, setIds] = useState([])

  const [appuntamenti, setAppuntamenti] = useState([])
  const [clienti, setClienti] = useState([])
  const [loadingApp, setLoadingApp] = useState(true)

  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [expandedEvent, setExpandedEvent] = useState(null)
  const [filtroAvv, setFiltroAvv] = useState('')

  const [tabellaSearch, setTabellaSearch] = useState('')
  const [tabellaFrom, setTabellaFrom] = useState('')
  const [tabellaTo, setTabellaTo] = useState('')
  const [tabellaStato, setTabellaStato] = useState('')
  const [tabellaSort, setTabellaSort] = useState('asc')

  const formVuoto = { titolo: '', cliente_id: '', tipo: 'presenza', data: '', ora_inizio: '09:00', ora_fine: '10:00', note_cliente: '', note_interne: '', link_videocall: '', avvocato_id: '' }
  const [form, setForm] = useState(formVuoto)
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setMeId(user.id)
      setForm(f => ({ ...f, avvocato_id: user.id }))

      const { data: profilo } = await supabase
        .from('profiles').select('posti_acquistati').eq('id', user.id).single()

      const haStudio = (profilo?.posti_acquistati ?? 1) > 1
      setIsStudio(haStudio)

      let allIds = [user.id]
      let memoriStudio = []

      if (haStudio) {
        const { data: collabs } = await supabase
          .from('profiles').select('id, nome, cognome').eq('titolare_id', user.id)
        memoriStudio = (collabs ?? []).map((c, i) => ({
          id: c.id, nome: c.nome, cognome: c.cognome,
          color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        }))
        setMembri(memoriStudio)
        allIds = [user.id, ...memoriStudio.map(m => m.id)]
      }

      setIds(allIds)

      const { data: cl } = await supabase
        .from('profiles').select('id, nome, cognome')
        .eq('role', 'cliente').in('avvocato_id', allIds).order('cognome')
      setClienti(cl ?? [])
    }
    init()
  }, [])

  const caricaAppuntamenti = useCallback(async () => {
    if (!meId || ids.length === 0) return
    setLoadingApp(true)
    const { data } = await supabase
      .from('appuntamenti')
      .select('id, titolo, tipo, stato, data_ora_inizio, data_ora_fine, note_cliente, note_interne, link_videocall, avvocato_id, cliente:cliente_id(id, nome, cognome), avvocato:avvocato_id(id, nome, cognome)')
      .in('avvocato_id', ids)
      .order('data_ora_inizio')
    setAppuntamenti(data ?? [])
    setLoadingApp(false)
  }, [meId, ids])

  useEffect(() => { caricaAppuntamenti() }, [caricaAppuntamenti])

  const anno = currentDate.getFullYear()
  const mese = currentDate.getMonth()
  const primo = new Date(anno, mese, 1)
  const ultimo = new Date(anno, mese + 1, 0)
  const offset = (primo.getDay() + 6) % 7
  const giorni = []
  for (let i = offset - 1; i >= 0; i--)        giorni.push({ date: new Date(anno, mese, -i), cur: false })
  for (let i = 1; i <= ultimo.getDate(); i++)   giorni.push({ date: new Date(anno, mese, i), cur: true })
  for (let i = 1; i <= 42 - giorni.length; i++) giorni.push({ date: new Date(anno, mese + 1, i), cur: false })

  const appFiltrate = appuntamenti.filter(a => !filtroAvv || a.avvocato_id === filtroAvv)
  const perGiorno = {}
  appFiltrate.forEach(a => {
    const k = dataDa(a.data_ora_inizio)
    if (!perGiorno[k]) perGiorno[k] = []
    perGiorno[k].push(a)
  })

  const eventiGiorno = selectedDay ? (perGiorno[dateKey(selectedDay)] ?? []) : []
  const isToday = d => dateKey(d) === dateKey(today)
  const isSelected = d => selectedDay && dateKey(d) === dateKey(selectedDay)

  const todayStr = dateKey(today)
  const programmati = appuntamenti.filter(a => a.stato === 'programmato').length
  const oggiCount = appuntamenti.filter(a => dataDa(a.data_ora_inizio) === todayStr).length
  const udienze = appuntamenti.filter(a => a.tipo === 'udienza' && a.stato === 'programmato').length
  const conclusi = appuntamenti.filter(a => a.stato === 'concluso').length

  async function handleSalva() {
    setErrore('')
    if (!form.titolo.trim()) return setErrore('Il titolo è obbligatorio')
    if (!form.data) return setErrore('La data è obbligatoria')
    setSalvando(true)
    try {
      const { error } = await supabase.from('appuntamenti').insert({
        titolo: form.titolo.trim(), tipo: form.tipo,
        data_ora_inizio: `${form.data}T${form.ora_inizio}:00`,
        data_ora_fine: `${form.data}T${form.ora_fine}:00`,
        note_cliente: form.note_cliente.trim() || null,
        note_interne: form.note_interne.trim() || null,
        link_videocall: form.link_videocall.trim() || null,
        stato: 'programmato',
        avvocato_id: form.avvocato_id || meId,
        cliente_id: form.cliente_id || null,
      })
      if (error) throw new Error(error.message)
      setForm(formVuoto); setShowNew(false)
      await caricaAppuntamenti()
    } catch (err) { setErrore(err.message) }
    finally { setSalvando(false) }
  }

  async function cambiaStato(id, nuovoStato) {
    await supabase.from('appuntamenti').update({ stato: nuovoStato }).eq('id', id)
    await caricaAppuntamenti()
  }

  const righe = appuntamenti
    .filter(a => {
      const ds = dataDa(a.data_ora_inizio)
      if (tabellaStato && a.stato !== tabellaStato) return false
      if (tabellaFrom && ds < tabellaFrom) return false
      if (tabellaTo && ds > tabellaTo) return false
      if (tabellaSearch) {
        const q = tabellaSearch.toLowerCase()
        const cl = `${a.cliente?.nome ?? ''} ${a.cliente?.cognome ?? ''}`
        if (!`${a.titolo} ${cl}`.toLowerCase().includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      const da = a.data_ora_inizio ?? '', db = b.data_ora_inizio ?? ''
      return tabellaSort === 'asc' ? da.localeCompare(db) : db.localeCompare(da)
    })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="section-label mb-2">Agenda</p>
          <h1 className="font-display text-4xl font-light text-nebbia">Calendario <span className="text-oro-static italic">appuntamenti</span></h1>
        </div>
        {isStudio && membri.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-body text-xs text-nebbia/30">Visualizza:</span>
            <button onClick={() => setFiltroAvv('')}
              className={`font-body text-xs px-3 py-1.5 border transition-colors ${!filtroAvv ? 'bg-oro/15 border-oro/40 text-oro' : 'border-white/10 text-nebbia/40 hover:border-white/20'}`}>
              Tutti
            </button>
            {membri.map(m => (
              <button key={m.id} onClick={() => setFiltroAvv(filtroAvv === m.id ? '' : m.id)}
                className={`flex items-center gap-2 font-body text-xs px-3 py-1.5 border transition-colors ${filtroAvv === m.id ? 'bg-oro/15 border-oro/40 text-oro' : 'border-white/10 text-nebbia/40 hover:border-white/20'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${m.color}`}>{m.nome[0]}</span>
                {m.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox label="Programmati" value={loadingApp ? '—' : programmati} colorClass="text-oro" />
        <StatBox label="Oggi" value={loadingApp ? '—' : oggiCount} colorClass="text-salvia" />
        <StatBox label="Udienze future" value={loadingApp ? '—' : udienze} colorClass="text-red-400" />
        <StatBox label="Conclusi" value={loadingApp ? '—' : conclusi} colorClass="text-nebbia/50" />
      </div>

      <div className="flex gap-5 items-start">
        {/* GRIGLIA MESE */}
        <div className="flex-1 bg-slate border border-white/5 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl font-semibold text-nebbia">{MESI[mese]} <span className="text-nebbia/40 font-light">{anno}</span></h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 text-nebbia/50 hover:text-oro transition-colors"><ChevronLeft size={18} /></button>
              <button onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))} className="btn-secondary text-xs px-3 py-1.5">Oggi</button>
              <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 text-nebbia/50 hover:text-oro transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {GIORNI.map(g => <div key={g} className="text-center font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase py-2">{g}</div>)}
          </div>

          <div className="grid grid-cols-7 border border-white/8 overflow-hidden">
            {giorni.map(({ date, cur }, i) => {
              const k = dateKey(date)
              const eventi = perGiorno[k] ?? []
              const nUd = eventi.filter(e => e.tipo === 'udienza' && e.stato !== 'annullato').length
              const nApp = eventi.filter(e => e.tipo !== 'udienza' && e.stato !== 'annullato').length
              const avvIds = [...new Set(eventi.map(e => e.avvocato_id))]
              return (
                <button key={i}
                  onClick={() => { setSelectedDay(date); setShowNew(false); setExpandedEvent(null) }}
                  className={`min-h-[72px] p-2 text-left flex flex-col transition-colors border-r border-b border-white/5 ${!cur ? 'opacity-20' : ''} ${isSelected(date) ? 'bg-oro/10 ring-inset ring-1 ring-oro/50' : 'bg-petrolio hover:bg-slate/60'}`}>
                  <span className={`font-body text-sm w-7 h-7 flex items-center justify-center mb-1 ${isToday(date) ? 'bg-oro text-petrolio font-semibold' : isSelected(date) ? 'text-oro font-medium' : 'text-nebbia/60'}`}>
                    {date.getDate()}
                  </span>
                  <div className="flex flex-wrap gap-0.5 mt-auto">
                    {nUd > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-red-900/30 text-red-400 border border-red-500/40 font-body">⚖ {nUd}</span>}
                    {nApp > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-oro/15 text-oro border border-oro/30 font-body">{nApp} app.</span>}
                    {isStudio && !filtroAvv && avvIds.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {avvIds.slice(0, 3).map((id, idx) => {
                          const m = membri.find(x => x.id === id); if (!m) return null
                          return <span key={idx} className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${m.color}`}>{m.nome[0]}</span>
                        })}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-5 mt-4 pt-3 border-t border-white/5 flex-wrap">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-oro/15 border border-oro/30 inline-block" /><span className="font-body text-xs text-nebbia/40">Appuntamento</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-900/30 border border-red-500/40 inline-block" /><span className="font-body text-xs text-nebbia/40">Udienza</span></div>
            {isStudio && membri.map(m => (
              <div key={m.id} className="flex items-center gap-1.5">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${m.color}`}>{m.nome[0]}</span>
                <span className="font-body text-xs text-nebbia/40">{m.nome}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PANNELLO GIORNO */}
        {selectedDay && (
          <div className="w-96 shrink-0 bg-slate border border-white/5 flex flex-col" style={{ maxHeight: 680 }}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <p className="font-body text-xs text-nebbia/30 tracking-widest uppercase">{GIORNI[(selectedDay.getDay() + 6) % 7]}</p>
                <h3 className="font-display text-2xl font-semibold text-nebbia mt-0.5">{selectedDay.getDate()} {MESI[selectedDay.getMonth()]}</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right"><p className="font-body text-[10px] text-nebbia/30">App.</p><p className="font-display text-lg font-semibold text-oro">{eventiGiorno.filter(e => e.tipo !== 'udienza').length}</p></div>
                <div className="text-right"><p className="font-body text-[10px] text-nebbia/30">Ud.</p><p className="font-display text-lg font-semibold text-red-400">{eventiGiorno.filter(e => e.tipo === 'udienza').length}</p></div>
                <button onClick={() => { setSelectedDay(null); setShowNew(false) }} className="text-nebbia/30 hover:text-nebbia ml-2"><X size={16} /></button>
              </div>
            </div>

            <div className="p-4 border-b border-white/5">
              <button onClick={() => { setShowNew(v => !v); setExpandedEvent(null); setForm({ ...formVuoto, data: dateKey(selectedDay), avvocato_id: meId ?? '' }) }}
                className="btn-primary text-xs w-full justify-center py-2.5">
                <Plus size={13} /> Nuovo appuntamento
              </button>
            </div>

            {showNew && (
              <div className="p-4 border-b border-white/5 space-y-3 bg-petrolio/40">
                <input value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} placeholder="Titolo appuntamento *"
                  className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />

                <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
                  className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50">
                  <option value="">Cliente (opzionale)</option>
                  {clienti.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
                </select>

                <div className="grid grid-cols-4 gap-1">
                  {Object.entries(TIPO_LABEL).map(([t, l]) => {
                    const Icon = TIPO_ICON[t]; const isUd = t === 'udienza'
                    return (
                      <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tipo: t }))}
                        className={`flex items-center justify-center gap-1 py-2 text-xs font-body border transition-all ${form.tipo === t
                          ? isUd ? 'bg-red-500/70 text-white border-red-500' : 'bg-oro text-petrolio border-oro'
                          : isUd ? 'text-red-400/60 border-red-500/25' : 'text-nebbia/50 border-white/10 hover:border-oro/30'}`}>
                        <Icon size={10} /> {l.split(' ')[0]}
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-body text-xs text-nebbia/40 block mb-1">Inizio</label>
                    <input type="time" value={form.ora_inizio} onChange={e => setForm(f => ({ ...f, ora_inizio: e.target.value }))}
                      className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50" />
                  </div>
                  <div>
                    <label className="font-body text-xs text-nebbia/40 block mb-1">Fine</label>
                    <input type="time" value={form.ora_fine} onChange={e => setForm(f => ({ ...f, ora_fine: e.target.value }))}
                      className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50" />
                  </div>
                </div>

                {isStudio && membri.length > 0 && (
                  <select value={form.avvocato_id} onChange={e => setForm(f => ({ ...f, avvocato_id: e.target.value }))}
                    className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50">
                    <option value={meId}>Tu</option>
                    {membri.map(m => <option key={m.id} value={m.id}>{m.nome} {m.cognome}</option>)}
                  </select>
                )}

                {form.tipo === 'udienza' && (
                  <input value={form.note_interne} onChange={e => setForm(f => ({ ...f, note_interne: e.target.value }))} placeholder="Tribunale / Aula"
                    className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/20" />
                )}
                {form.tipo === 'videocall' && (
                  <input value={form.link_videocall} onChange={e => setForm(f => ({ ...f, link_videocall: e.target.value }))} placeholder="Link videocall"
                    className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/20" />
                )}

                <textarea rows={2} value={form.note_cliente} onChange={e => setForm(f => ({ ...f, note_cliente: e.target.value }))} placeholder="Note per il cliente (opzionale)"
                  className="w-full bg-slate border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/20" />

                {errore && <p className="font-body text-xs text-red-400">{errore}</p>}

                <div className="flex gap-2">
                  <button onClick={() => { setShowNew(false); setErrore('') }} className="btn-secondary text-xs flex-1 py-2">Annulla</button>
                  <button onClick={handleSalva} disabled={salvando} className="btn-primary text-xs flex-1 py-2 justify-center disabled:opacity-40">
                    {salvando ? <span className="animate-spin w-3 h-3 border border-petrolio border-t-transparent rounded-full" /> : 'Salva'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {eventiGiorno.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar size={28} className="text-nebbia/15 mb-3" />
                  <p className="font-body text-sm text-nebbia/30">Nessun appuntamento</p>
                </div>
              ) : [...eventiGiorno].sort((a, b) => (a.data_ora_inizio ?? '').localeCompare(b.data_ora_inizio ?? '')).map(e => {
                const isExp = expandedEvent === e.id
                const isUd = e.tipo === 'udienza'
                const Icon = TIPO_ICON[e.tipo] ?? MapPin
                const membre = membri.find(m => m.id === e.avvocato_id)
                return (
                  <div key={e.id}
                    className={`border p-3 cursor-pointer transition-colors ${isUd ? 'border-red-500/30 bg-red-900/10' : 'border-white/8 bg-petrolio/40 hover:bg-petrolio/60'}`}
                    onClick={() => setExpandedEvent(isExp ? null : e.id)}>
                    <div className="flex items-start gap-2">
                      <Icon size={13} className={`${isUd ? 'text-red-400' : 'text-oro/60'} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-nebbia truncate">{e.titolo}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="font-body text-xs text-nebbia/40">{oraDa(e.data_ora_inizio)}{e.data_ora_fine ? ` – ${oraDa(e.data_ora_fine)}` : ''}</span>
                          {e.cliente && <span className="font-body text-xs text-nebbia/40">· {e.cliente.nome} {e.cliente.cognome}</span>}
                          {isStudio && membre && <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${membre.color}`}>{membre.nome[0]}</span>}
                        </div>
                      </div>
                      <BadgeStato stato={e.stato} />
                    </div>
                    {isExp && (
                      <div className="mt-3 space-y-2 border-t border-white/5 pt-3" onClick={ev => ev.stopPropagation()}>
                        {e.note_interne && <div className="bg-oro/5 border border-oro/15 p-2"><p className="font-body text-[10px] text-oro uppercase tracking-widest mb-1">Note interne</p><p className="font-body text-xs text-nebbia/60">{e.note_interne}</p></div>}
                        {e.note_cliente && <div className="bg-salvia/5 border border-salvia/15 p-2"><p className="font-body text-[10px] text-salvia uppercase tracking-widest mb-1">Note cliente</p><p className="font-body text-xs text-nebbia/60">{e.note_cliente}</p></div>}
                        {e.link_videocall && <a href={e.link_videocall} target="_blank" rel="noreferrer" className="font-body text-xs text-oro hover:underline block truncate">{e.link_videocall}</a>}
                        {e.stato === 'programmato' && (
                          <div className="flex gap-2">
                            <button onClick={() => cambiaStato(e.id, 'concluso')} className="flex-1 font-body text-xs py-1.5 border border-salvia/30 text-salvia hover:bg-salvia/10 transition-colors flex items-center justify-center gap-1">
                              <Check size={11} /> Concluso
                            </button>
                            <button onClick={() => cambiaStato(e.id, 'annullato')} className="font-body text-xs py-1.5 px-3 border border-red-500/30 text-red-400 hover:bg-red-900/10 transition-colors">Annulla</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* TABELLA RIEPILOGO */}
      <div className="bg-slate border border-white/5">
        <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-nebbia">Riepilogo agenda</h2>
            <p className="font-body text-xs text-nebbia/40 mt-0.5">Tutti gli appuntamenti</p>
          </div>
          <div className="sm:ml-auto flex flex-wrap gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nebbia/30" />
              <input placeholder="Cerca..." value={tabellaSearch} onChange={e => setTabellaSearch(e.target.value)}
                className="bg-petrolio border border-white/10 text-nebbia font-body text-xs pl-8 pr-3 py-2 outline-none focus:border-oro/50 w-40 placeholder:text-nebbia/25" />
            </div>
            <input type="date" value={tabellaFrom} onChange={e => setTabellaFrom(e.target.value)} className="bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50" />
            <input type="date" value={tabellaTo} onChange={e => setTabellaTo(e.target.value)} className="bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50" />
            <select value={tabellaStato} onChange={e => setTabellaStato(e.target.value)} className="bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50">
              <option value="">Tutti gli stati</option>
              <option value="programmato">Programmato</option>
              <option value="concluso">Concluso</option>
              <option value="annullato">Annullato</option>
            </select>
            <button onClick={() => setTabellaSort(s => s === 'asc' ? 'desc' : 'asc')} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1">
              <Clock size={12} /> {tabellaSort === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loadingApp ? (
            <div className="flex items-center justify-center py-16"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
          ) : righe.length === 0 ? (
            <p className="text-center py-12 font-body text-sm text-nebbia/30">Nessun appuntamento trovato</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Tipo', 'Titolo', 'Cliente', ...(isStudio ? ['Avvocato'] : []), 'Data & Ora', 'Stato'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {righe.map(r => {
                  const Icon = TIPO_ICON[r.tipo] ?? MapPin
                  const membre = membri.find(m => m.id === r.avvocato_id)
                  const isUd = r.tipo === 'udienza'
                  const dataOra = r.data_ora_inizio ? `${new Date(r.data_ora_inizio).toLocaleDateString('it-IT')} ${oraDa(r.data_ora_inizio)}` : '—'
                  return (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`font-body text-[10px] px-2 py-0.5 border tracking-widest uppercase flex items-center gap-1 w-fit ${isUd ? 'border-red-500/30 text-red-400' : 'border-oro/30 text-oro'}`}>
                          <Icon size={10} /> {TIPO_LABEL[r.tipo]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-body text-sm font-medium text-nebbia">{r.titolo}</td>
                      <td className="px-4 py-3 font-body text-sm text-nebbia/60">{r.cliente ? `${r.cliente.nome} ${r.cliente.cognome}` : '—'}</td>
                      {isStudio && (
                        <td className="px-4 py-3">
                          {membre && (
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${membre.color}`}>{membre.nome[0]}</span>
                              <span className="font-body text-xs text-nebbia/60">{membre.nome}</span>
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 font-body text-xs text-nebbia/60 whitespace-nowrap">{dataOra}</td>
                      <td className="px-4 py-3"><BadgeStato stato={r.stato} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}