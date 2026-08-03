// src/pages/commerciale/Calendario.jsx
// Agenda personale del commerciale: vista mensile + dettaglio del giorno,
// con creazione/modifica/eliminazione degli appuntamenti.
// Tabella dedicata `appuntamenti_commerciale` (RLS: solo i propri).

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  PageHeader, EmptyState, LoadingSpinner, Badge,
  InputField, TextareaField, SelectField,
} from '@/components/shared'
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, MapPin, Video,
  CalendarDays, AlertCircle, Clock,
} from 'lucide-react'

const TIPI = [
  { key: 'chiamata', label: 'Chiamata' },
  { key: 'demo', label: 'Demo' },
  { key: 'incontro', label: 'Incontro' },
  { key: 'follow_up', label: 'Follow-up' },
  { key: 'altro', label: 'Altro' },
]
const TIPO_LABEL = Object.fromEntries(TIPI.map(t => [t.key, t.label]))

const ESITI = [
  { key: 'da_fare', label: 'Da fare', variant: 'oro' },
  { key: 'fatto', label: 'Fatto', variant: 'salvia' },
  { key: 'annullato', label: 'Annullato', variant: 'gray' },
]
const ESITO_MAP = Object.fromEntries(ESITI.map(e => [e.key, e]))

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

const chiaveGiorno = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/* input datetime-local <-> ISO */
const toLocalInput = (iso) => {
  const d = iso ? new Date(iso) : new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

const FORM_VUOTO = {
  titolo: '', descrizione: '', tipo: 'chiamata', esito: 'da_fare',
  inizio: '', fine: '', tutto_il_giorno: false,
  partecipante_nome: '', partecipante_email: '', luogo: '', link_call: '',
}

export default function CommercialeCalendario() {
  const { profile } = useAuth()
  const oggi = new Date()

  const [mese, setMese] = useState(new Date(oggi.getFullYear(), oggi.getMonth(), 1))
  const [selezionato, setSelezionato] = useState(chiaveGiorno(oggi))
  const [eventi, setEventi] = useState([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(FORM_VUOTO)
  const [salvando, setSalvando] = useState(false)

  /* Carica il mese visibile (con margine per le celle di bordo) */
  const carica = useCallback(async () => {
    setLoading(true)
    setErrore('')
    try {
      const da = new Date(mese.getFullYear(), mese.getMonth() - 1, 1).toISOString()
      const a = new Date(mese.getFullYear(), mese.getMonth() + 2, 0, 23, 59, 59).toISOString()
      const { data, error } = await supabase
        .from('appuntamenti_commerciale')
        .select('*')
        .gte('inizio', da)
        .lte('inizio', a)
        .order('inizio', { ascending: true })
      if (error) throw error
      setEventi(data ?? [])
    } catch (err) {
      setErrore(err.message)
    } finally {
      setLoading(false)
    }
  }, [mese])

  useEffect(() => { if (profile?.id) carica() }, [profile?.id, carica])

  /* Griglia del mese: lunedì-based */
  const celle = useMemo(() => {
    const primo = new Date(mese.getFullYear(), mese.getMonth(), 1)
    const offset = (primo.getDay() + 6) % 7
    const inizio = new Date(primo)
    inizio.setDate(primo.getDate() - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inizio)
      d.setDate(inizio.getDate() + i)
      return d
    })
  }, [mese])

  const perGiorno = useMemo(() => {
    const m = new Map()
    for (const e of eventi) {
      const k = chiaveGiorno(new Date(e.inizio))
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(e)
    }
    return m
  }, [eventi])

  const eventiGiorno = perGiorno.get(selezionato) ?? []

  function apriNuovo() {
    const [y, m, g] = selezionato.split('-').map(Number)
    const start = new Date(y, m - 1, g, 9, 0)
    const end = new Date(y, m - 1, g, 10, 0)
    setEditId(null)
    setForm({ ...FORM_VUOTO, inizio: toLocalInput(start), fine: toLocalInput(end) })
    setModal(true)
  }

  function apriModifica(e) {
    setEditId(e.id)
    setForm({
      titolo: e.titolo ?? '', descrizione: e.descrizione ?? '',
      tipo: e.tipo ?? 'altro', esito: e.esito ?? 'da_fare',
      inizio: toLocalInput(e.inizio), fine: toLocalInput(e.fine),
      tutto_il_giorno: !!e.tutto_il_giorno,
      partecipante_nome: e.partecipante_nome ?? '', partecipante_email: e.partecipante_email ?? '',
      luogo: e.luogo ?? '', link_call: e.link_call ?? '',
    })
    setModal(true)
  }

  async function salva() {
    if (!form.titolo.trim()) { setErrore('Il titolo è obbligatorio'); return }
    if (!form.inizio || !form.fine) { setErrore('Indica inizio e fine'); return }
    if (new Date(form.fine) < new Date(form.inizio)) { setErrore('La fine non può precedere l\'inizio'); return }

    setSalvando(true)
    setErrore('')
    try {
      const payload = {
        commerciale_id: profile.id,
        titolo: form.titolo.trim(),
        descrizione: form.descrizione.trim() || null,
        tipo: form.tipo,
        esito: form.esito,
        inizio: new Date(form.inizio).toISOString(),
        fine: new Date(form.fine).toISOString(),
        tutto_il_giorno: form.tutto_il_giorno,
        partecipante_nome: form.partecipante_nome.trim() || null,
        partecipante_email: form.partecipante_email.trim() || null,
        luogo: form.luogo.trim() || null,
        link_call: form.link_call.trim() || null,
      }
      const { error } = editId
        ? await supabase.from('appuntamenti_commerciale').update(payload).eq('id', editId)
        : await supabase.from('appuntamenti_commerciale').insert(payload)
      if (error) throw error
      setModal(false)
      await carica()
    } catch (err) {
      setErrore(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function elimina() {
    if (!editId) return
    setSalvando(true)
    try {
      const { error } = await supabase.from('appuntamenti_commerciale').delete().eq('id', editId)
      if (error) throw error
      setModal(false)
      await carica()
    } catch (err) {
      setErrore(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const cambiaMese = (delta) =>
    setMese(m => new Date(m.getFullYear(), m.getMonth() + delta, 1))

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const oggiKey = chiaveGiorno(oggi)

  return (
    <>
      <PageHeader
        label="Area commerciale"
        title="Calendario"
        subtitle="La tua agenda: appuntamenti, demo e follow-up"
        action={<button onClick={apriNuovo} className="btn-primary flex items-center gap-2"><Plus size={15} /> Nuovo</button>}
      />

      {errore && !modal && (
        <div className="mb-4 p-3 bg-red-900/10 border border-red-500/20 font-body text-xs text-red-400 flex items-center gap-2">
          <AlertCircle size={14} /> {errore}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Griglia mese */}
        <div className="lg:col-span-2 bg-slate border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => cambiaMese(-1)} className="p-1.5 text-nebbia/40 hover:text-oro transition-colors">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-display text-xl font-light text-nebbia">
              {MESI[mese.getMonth()]} {mese.getFullYear()}
            </h2>
            <button onClick={() => cambiaMese(1)} className="p-1.5 text-nebbia/40 hover:text-oro transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {GIORNI.map(g => (
              <div key={g} className="text-center font-body text-[10px] text-nebbia/30 tracking-widest uppercase py-1">
                {g}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="py-16"><LoadingSpinner fullPage /></div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {celle.map((d, i) => {
                const k = chiaveGiorno(d)
                const fuoriMese = d.getMonth() !== mese.getMonth()
                const isSel = k === selezionato
                const isOggi = k === oggiKey
                const n = (perGiorno.get(k) ?? []).length
                return (
                  <button
                    key={i}
                    onClick={() => setSelezionato(k)}
                    className={`aspect-square flex flex-col items-center justify-center border transition-colors
                      ${isSel ? 'border-oro bg-oro/10' : 'border-white/5 hover:border-white/20'}
                      ${fuoriMese ? 'opacity-25' : ''}`}
                  >
                    <span className={`font-body text-sm ${isOggi ? 'text-oro font-semibold' : isSel ? 'text-oro' : 'text-nebbia/70'}`}>
                      {d.getDate()}
                    </span>
                    {n > 0 && (
                      <span className="mt-0.5 flex gap-0.5">
                        {Array.from({ length: Math.min(n, 3) }).map((_, j) => (
                          <span key={j} className="w-1 h-1 rounded-full bg-salvia" />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Dettaglio giorno */}
        <div className="bg-slate border border-white/5 p-5">
          <h3 className="font-display text-lg font-light text-nebbia mb-4">
            {(() => {
              const [y, m, g] = selezionato.split('-').map(Number)
              return `${g} ${MESI[m - 1]} ${y}`
            })()}
          </h3>

          {eventiGiorno.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nessun impegno" desc="Giornata libera."
              action={<button onClick={apriNuovo} className="btn-secondary flex items-center gap-2"><Plus size={14} /> Aggiungi</button>} />
          ) : (
            <div className="space-y-2">
              {eventiGiorno.map(e => {
                const es = ESITO_MAP[e.esito]
                return (
                  <button
                    key={e.id}
                    onClick={() => apriModifica(e)}
                    className="w-full text-left p-3 bg-petrolio/40 border border-white/5 hover:border-oro/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-body text-sm text-nebbia">{e.titolo}</p>
                      {es && <Badge label={es.label} variant={es.variant} />}
                    </div>
                    <p className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                      <Clock size={11} />
                      {e.tutto_il_giorno
                        ? 'Tutto il giorno'
                        : `${new Date(e.inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} – ${new Date(e.fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
                      <span className="text-nebbia/25">· {TIPO_LABEL[e.tipo] ?? 'Altro'}</span>
                    </p>
                    {e.partecipante_nome && (
                      <p className="font-body text-xs text-nebbia/30 mt-0.5">{e.partecipante_nome}</p>
                    )}
                    {e.luogo && (
                      <p className="font-body text-xs text-nebbia/30 mt-0.5 flex items-center gap-1"><MapPin size={10} />{e.luogo}</p>
                    )}
                    {e.link_call && (
                      <p className="font-body text-xs text-salvia/60 mt-0.5 flex items-center gap-1 truncate"><Video size={10} />{e.link_call}</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4 py-8 overflow-auto"
          onClick={() => !salvando && setModal(false)}>
          <div className="w-full max-w-lg bg-slate border border-white/10 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-2xl font-light text-nebbia">
                {editId ? 'Modifica appuntamento' : 'Nuovo appuntamento'}
              </h3>
              <button onClick={() => !salvando && setModal(false)} className="text-nebbia/30 hover:text-nebbia">
                <X size={18} />
              </button>
            </div>

            {errore && (
              <div className="mb-4 p-3 bg-red-900/10 border border-red-500/20 font-body text-xs text-red-400 flex items-center gap-2">
                <AlertCircle size={14} /> {errore}
              </div>
            )}

            <div className="space-y-4">
              <InputField label="Titolo *" value={form.titolo}
                onChange={e => set('titolo', e.target.value)} placeholder="Es. Demo Studio Rossi" />

              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Tipo" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                  {TIPI.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </SelectField>
                <SelectField label="Esito" value={form.esito} onChange={e => set('esito', e.target.value)}>
                  {ESITI.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </SelectField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Inizio *" type="datetime-local" value={form.inizio}
                  onChange={e => set('inizio', e.target.value)} />
                <InputField label="Fine *" type="datetime-local" value={form.fine}
                  onChange={e => set('fine', e.target.value)} />
              </div>

              <label className="flex items-center gap-2 font-body text-sm text-nebbia/60 cursor-pointer">
                <input type="checkbox" checked={form.tutto_il_giorno}
                  onChange={e => set('tutto_il_giorno', e.target.checked)}
                  className="accent-[#c9a227]" />
                Tutto il giorno
              </label>

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Referente" value={form.partecipante_nome}
                  onChange={e => set('partecipante_nome', e.target.value)} placeholder="Avv. Mario Rossi" />
                <InputField label="Email referente" type="email" value={form.partecipante_email}
                  onChange={e => set('partecipante_email', e.target.value)} placeholder="mario@studio.it" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Luogo" value={form.luogo}
                  onChange={e => set('luogo', e.target.value)} placeholder="Milano, via…" />
                <InputField label="Link call" value={form.link_call}
                  onChange={e => set('link_call', e.target.value)} placeholder="https://meet…" />
              </div>

              <TextareaField label="Note" rows={3} value={form.descrizione}
                onChange={e => set('descrizione', e.target.value)} placeholder="Appunti sulla trattativa…" />
            </div>

            <div className="flex gap-3 mt-6">
              {editId && (
                <button onClick={elimina} disabled={salvando}
                  className="px-4 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors font-body text-sm flex items-center gap-2">
                  <Trash2 size={14} /> Elimina
                </button>
              )}
              <button onClick={() => setModal(false)} disabled={salvando} className="btn-secondary flex-1 justify-center">
                Annulla
              </button>
              <button onClick={salva} disabled={salvando} className="btn-primary flex-1 justify-center">
                {salvando
                  ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                  : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
