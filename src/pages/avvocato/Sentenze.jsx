// src/pages/avvocato/Sentenze.jsx

import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { PageHeader, BackButton, Badge, StatCard } from '@/components/shared'
import {
  Plus, Search, Eye, Upload, FileText,
  Coins, Send, AlertCircle, CheckCircle, ChevronUp,
  ChevronDown, ArrowUpDown, Download, Sparkles, X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// HOOK — carica codici_lex raggruppati per macro-area
// ─────────────────────────────────────────────────────────────
function useCodiciLex() {
  const [categorie, setCategorie] = useState([])
  const [raggruppate, setRaggruppate] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carica() {
      const { data } = await supabase
        .from('codici_lex')
        .select('codice, label, macro_area, macro_label, ordine')
        .order('macro_label')
        .order('ordine')

      setCategorie(data ?? [])

      const gruppi = {}
      for (const c of data ?? []) {
        const key = c.macro_label || 'Altro'
        if (!gruppi[key]) gruppi[key] = []
        gruppi[key].push(c)
      }
      setRaggruppate(Object.entries(gruppi).map(([macro, items]) => ({ macro, items })))
      setLoading(false)
    }
    carica()
  }, [])

  return { categorie, raggruppate, loading }
}

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
const STATO_BADGE = {
  pubblica: { label: 'Pubblica', variant: 'salvia' },
  sospesa: { label: 'Sospesa', variant: 'gray' },
}

const TIPI_PROVVEDIMENTO = [
  { value: 'sentenza', label: 'Sentenza' },
  { value: 'ordinanza', label: 'Ordinanza' },
  { value: 'ordinanza_interlocutoria', label: 'Ordinanza interlocutoria' },
  { value: 'decreto_presidenziale', label: 'Decreto presidenziale' },
]

// ─────────────────────────────────────────────────────────────
// AGGIUNGI A PRATICA
// ─────────────────────────────────────────────────────────────
function AggiungiAPratica({ sentenza }) {
  const [aperto, setAperto] = useState(false)
  const [cerca, setCerca] = useState('')
  const [pratiche, setPratiche] = useState([])
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvato, setSalvato] = useState(null)
  const [errore, setErrore] = useState(null)

  async function cercaPratiche(q) {
    setCerca(q)
    if (!q.trim()) { setPratiche([]); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('pratiche')
        .select('id, titolo, cliente:cliente_id(nome, cognome)')
        .eq('avvocato_id', user.id)
        .eq('stato', 'aperta')
        .ilike('titolo', `%${q}%`)
        .limit(5)
      setPratiche(data ?? [])
    } finally { setLoading(false) }
  }

  async function aggiungi(pratica) {
    setSalvando(true); setErrore(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const titoloSentenza = [sentenza.organo, sentenza.sezione, sentenza.numero && `n. ${sentenza.numero}`, sentenza.anno]
        .filter(Boolean).join(' ')
      await supabase.from('note_interne').insert({
        pratica_id: pratica.id,
        autore_id: user.id,
        tipo: 'sentenza_acquistata',
        testo: sentenza.testo_integrale ?? '',
        metadati: {
          domanda: `Sentenza: ${titoloSentenza}`,
          sentenza_id: sentenza.id,
          oggetto: sentenza.oggetto,
          organo: sentenza.organo,
          anno: sentenza.anno,
          categorie_lex: sentenza.categorie_lex,
          ts: new Date().toISOString(),
        }
      })
      setSalvato(pratica.titolo)
      setAperto(false)
    } catch (e) {
      setErrore(e.message)
    } finally { setSalvando(false) }
  }

  if (salvato) return (
    <p className="font-body text-sm text-salvia flex items-center gap-2">
      <CheckCircle size={14} /> Sentenza aggiunta alla pratica "{salvato}"
    </p>
  )

  return (
    <div>
      <button onClick={() => setAperto(!aperto)} className="btn-secondary text-sm flex items-center gap-2">
        <FileText size={13} /> {aperto ? 'Annulla' : 'Aggiungi a pratica'}
      </button>

      {aperto && (
        <div className="mt-3 bg-slate border border-white/10 p-4 space-y-3">
          <p className="font-body text-xs text-nebbia/50">Cerca la pratica a cui aggiungere questa sentenza:</p>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
            <input
              placeholder="Cerca pratica per nome..."
              value={cerca}
              onChange={e => cercaPratiche(e.target.value)}
              autoFocus
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-8 pr-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
            />
            {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />}
          </div>
          {!loading && cerca && pratiche.length === 0 && (
            <p className="font-body text-xs text-nebbia/30">Nessuna pratica trovata</p>
          )}
          {pratiche.map(p => (
            <button key={p.id} onClick={() => aggiungi(p)} disabled={salvando}
              className="w-full text-left px-3 py-2.5 bg-petrolio border border-white/5 hover:border-oro/30 transition-colors">
              <p className="font-body text-sm text-nebbia">{p.titolo}</p>
              {p.cliente && <p className="font-body text-xs text-nebbia/30 mt-0.5">{p.cliente.nome} {p.cliente.cognome}</p>}
            </button>
          ))}
          {errore && <p className="font-body text-xs text-red-400">{errore}</p>}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// HEADER SORTABILE
// ─────────────────────────────────────────────────────────────
function SortTh({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field
  return (
    <th className="px-4 py-3 text-left">
      <button onClick={() => onSort(field)}
        className="flex items-center gap-1.5 font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase hover:text-oro transition-colors group">
        {label}
        <span className="text-nebbia/20 group-hover:text-oro/60">
          {active ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={11} />}
        </span>
      </button>
    </th>
  )
}

// ─────────────────────────────────────────────────────────────
// HELPER — titolo compatto della sentenza
// ─────────────────────────────────────────────────────────────
function titoloSentenza(s) {
  const parti = [s.organo, s.sezione, s.numero && `n. ${s.numero}`, s.anno].filter(Boolean)
  return parti.join(' · ') || 'Sentenza senza riferimenti'
}

// ─────────────────────────────────────────────────────────────
// TAB LE MIE SENTENZE
// ─────────────────────────────────────────────────────────────
function TabSentenze({ meId, studioId }) {
  const [sentenze, setSentenze] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statoF, setStatoF] = useState('')
  const [tipoF, setTipoF] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    async function carica() {
      setLoading(true)
      let query = supabase
        .from('sentenze')
        .select('id, organo, sezione, numero, anno, oggetto, tipo_provvedimento, categorie_lex, stato, accessi, created_at')
        .order('created_at', { ascending: false })
      if (studioId) query = query.eq('studio_id', studioId)
      else query = query.eq('autore_id', meId)
      const { data } = await query
      setSentenze(data ?? [])
      setLoading(false)
    }
    if (meId) carica()
  }, [meId, studioId])

  function handleSort(f) {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(f); setSortDir('asc') }
  }

  const rows = sentenze
    .filter(s => {
      if (statoF && s.stato !== statoF) return false
      if (tipoF && s.tipo_provvedimento !== tipoF) return false
      if (search) {
        const haystack = `${s.oggetto ?? ''} ${s.organo ?? ''} ${(s.categorie_lex ?? []).join(' ')}`.toLowerCase()
        if (!haystack.includes(search.toLowerCase())) return false
      }
      return true
    })
    .sort((a, b) => {
      let va = a[sortField] ?? '', vb = b[sortField] ?? ''
      if (['accessi', 'anno'].includes(sortField)) { va = +va; vb = +vb }
      else if (sortField === 'created_at') { va = new Date(va); vb = new Date(vb) }
      else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase() }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const totAccessi = sentenze.reduce((a, s) => a + (s.accessi ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Sentenze caricate" value={sentenze.length} colorClass="text-oro" />
        <StatCard label="Accessi totali" value={totAccessi} colorClass="text-salvia" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
          <input placeholder="Cerca oggetto, organo, categoria..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
        </div>
        <select value={tipoF} onChange={e => setTipoF(e.target.value)}
          className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
          <option value="">Tutti i tipi</option>
          {TIPI_PROVVEDIMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={statoF} onChange={e => setStatoF(e.target.value)}
          className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
          <option value="">Tutti gli stati</option>
          <option value="pubblica">Pubblica</option>
          <option value="sospesa">Sospesa</option>
        </select>
        {(search || tipoF || statoF) && (
          <button onClick={() => { setSearch(''); setTipoF(''); setStatoF('') }}
            className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors px-3 py-2.5 border border-white/5 hover:border-red-500/30">
            Reset
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-slate border border-white/5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <SortTh label="Oggetto" field="oggetto" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Organo" field="organo" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Categoria</th>
                <SortTh label="Anno" field="anno" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Accessi" field="accessi" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Stato" field="stato" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Caricata il" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">
                  {sentenze.length === 0 ? 'Nessuna sentenza caricata' : 'Nessun risultato'}
                </td></tr>
              ) : rows.map(s => {
                const sb = STATO_BADGE[s.stato] ?? STATO_BADGE.pubblica
                return (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                    <td className="px-4 py-3 font-body text-sm font-medium text-nebbia max-w-xs truncate">{s.oggetto ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-body text-xs text-nebbia/60">{s.organo ?? '—'}</p>
                      {s.sezione && <p className="font-body text-[10px] text-nebbia/30">{s.sezione}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.categorie_lex ?? []).map(c => (
                          <span key={c} className="font-body text-[10px] px-1.5 py-0.5 bg-petrolio border border-white/10 text-nebbia/40">{c}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">{s.anno ?? '—'}</td>
                    <td className="px-4 py-3 font-body text-sm text-oro">{s.accessi ?? 0}</td>
                    <td className="px-4 py-3"><Badge label={sb.label} variant={sb.variant} /></td>
                    <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/sentenze/${s.id}`} className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors">
                        <Eye size={13} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB GUADAGNI
// ─────────────────────────────────────────────────────────────
function TabGuadagni({ meId, studioId }) {
  const [compensi, setCompensi] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRichiesta, setShowRichiesta] = useState(false)
  const [nota, setNota] = useState('')
  const [inviando, setInviando] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    async function carica() {
      setLoading(true)
      const { data } = await supabase
        .from('accessi_sentenze')
        .select(`
          id, prezzo, quota_autore, stato, created_at,
          sentenza:sentenza_id(id, oggetto, organo, autore_id, studio_id),
          acquirente:acquirente_id(nome, cognome)
        `)
        .order('created_at', { ascending: false })

      const miei = (data ?? []).filter(c =>
        c.sentenza?.autore_id === meId ||
        (studioId && c.sentenza?.studio_id === studioId)
      )
      setCompensi(miei)
      setLoading(false)
    }
    if (meId) carica()
  }, [meId, studioId])

  const daCreditare = compensi.filter(c => c.stato === 'da_liquidare').reduce((a, c) => a + parseFloat(c.quota_autore ?? 0), 0)
  const giaCreditato = compensi.filter(c => c.stato === 'liquidato').reduce((a, c) => a + parseFloat(c.quota_autore ?? 0), 0)

  async function inviaRichiesta() {
    setInviando(true); setErrore('')
    try {
      const { error } = await supabase.from('richieste_pagamento').insert({
        avvocato_id: meId,
        studio_id: studioId ?? null,
        importo: daCreditare,
        note: nota.trim() || null,
      })
      if (error) throw new Error(error.message)
      setSuccess(true); setShowRichiesta(false)
    } catch (err) { setErrore(err.message) } finally { setInviando(false) }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Guadagni totali" value={`€ ${(daCreditare + giaCreditato).toFixed(2)}`} colorClass="text-oro" />
        <StatCard label="Da liquidare" value={`€ ${daCreditare.toFixed(2)}`} colorClass="text-amber-400" />
        <StatCard label="Già liquidato" value={`€ ${giaCreditato.toFixed(2)}`} colorClass="text-salvia" />
      </div>

      {daCreditare > 0 && !success && (
        <div className="bg-slate/40 border border-oro/15 p-4">
          {!showRichiesta ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-sm text-nebbia">
                  Hai <span className="text-oro font-medium">€ {daCreditare.toFixed(2)}</span> disponibili
                </p>
                <p className="font-body text-xs text-nebbia/40 mt-0.5">Invia una richiesta di pagamento a Lexum</p>
              </div>
              <button onClick={() => setShowRichiesta(true)} className="btn-primary text-sm ml-4">Richiedi pagamento</button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-body text-sm text-oro font-medium">Richiesta — € {daCreditare.toFixed(2)}</p>
              <textarea rows={2} value={nota} onChange={e => setNota(e.target.value)}
                placeholder="IBAN, riferimento fattura..."
                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
              {errore && <p className="font-body text-xs text-red-400">{errore}</p>}
              <div className="flex gap-3">
                <button onClick={() => setShowRichiesta(false)} className="btn-secondary text-sm">Annulla</button>
                <button onClick={inviaRichiesta} disabled={inviando} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40">
                  {inviando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Send size={13} /> Invia</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-salvia/5 border border-salvia/20">
          <CheckCircle size={16} className="text-salvia shrink-0" />
          <p className="font-body text-sm text-salvia">Richiesta inviata. Lexum la elaborerà entro 5 giorni lavorativi.</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-slate border border-white/5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Data', 'Sentenza', 'Acquirente', 'Prezzo', 'Quota', 'Stato'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compensi.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">Nessun compenso ancora</td></tr>
              ) : compensi.map(c => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                  <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString('it-IT')}</td>
                  <td className="px-4 py-3 font-body text-sm text-nebbia max-w-xs truncate">{c.sentenza?.oggetto ?? '—'}</td>
                  <td className="px-4 py-3 font-body text-sm text-nebbia/60">{`${c.acquirente?.nome ?? ''} ${c.acquirente?.cognome ?? ''}`.trim() || '—'}</td>
                  <td className="px-4 py-3 font-body text-sm text-nebbia/50">€ {parseFloat(c.prezzo ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 font-body text-sm font-medium text-oro">€ {parseFloat(c.quota_autore ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge label={c.stato === 'liquidato' ? 'Liquidato' : 'Da liquidare'} variant={c.stato === 'liquidato' ? 'salvia' : 'warning'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PAGINA LISTA
// ─────────────────────────────────────────────────────────────
export function AvvocatoSentenze() {
  const [tab, setTab] = useState('sentenze')
  const [meId, setMeId] = useState(null)
  const [studioId, setStudioId] = useState(null)

  useEffect(() => {
    async function carica() {
      const { data: { user } } = await supabase.auth.getUser()
      setMeId(user.id)
      const { data } = await supabase.from('profiles').select('titolare_id').eq('id', user.id).single()
      setStudioId(data?.titolare_id ?? null)
    }
    carica()
  }, [])

  if (!meId) return <div className="flex items-center justify-center py-40"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-5">
      <PageHeader label="Mie Sentenze"
        title="Sentenze"
        subtitle="Carica sentenze e tieni d'occhio i tuoi guadagni"
        action={tab === 'sentenze' ? (
          <div className="flex gap-3">
            <Link to="/banca-dati?tab=sentenze" className="btn-secondary text-sm flex items-center gap-2">
              <Search size={13} /> Esplora banca dati
            </Link>
            <Link to="/sentenze/nuova" className="btn-primary text-sm">
              <Plus size={15} /> Carica sentenza
            </Link>
          </div>
        ) : null}
      />

      <div className="flex gap-0 border-b border-white/8">
        {[
          { id: 'sentenze', label: 'Le mie sentenze', icon: FileText },
          { id: 'guadagni', label: 'Guadagni', icon: Coins },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 font-body text-sm border-b-2 transition-colors ${tab === t.id ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'
              }`}>
            <t.icon size={14} strokeWidth={1.5} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'sentenze' && <TabSentenze meId={meId} studioId={studioId} />}
      {tab === 'guadagni' && <TabGuadagni meId={meId} studioId={studioId} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// FORM SENTENZA — schema giurisprudenza, PDF + estrazione obbligatori
// ─────────────────────────────────────────────────────────────
function FormSentenza({ sentenza, isEdit }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const { raggruppate, loading: loadingCategorie } = useCodiciLex()

  const [form, setForm] = useState({
    tipo_provvedimento: sentenza?.tipo_provvedimento ?? '',
    organo: sentenza?.organo ?? '',
    sezione: sentenza?.sezione ?? '',
    numero: sentenza?.numero ?? '',
    anno: sentenza?.anno ?? '',
    data_deposito: sentenza?.data_deposito ?? '',
    oggetto: sentenza?.oggetto ?? '',
    principio_diritto: sentenza?.principio_diritto ?? '',
    categoria_lex: (sentenza?.categorie_lex ?? [])[0] ?? '',
    materia: (sentenza?.materia ?? []).join(', '),
    parole_chiave: (sentenza?.parole_chiave ?? []).join(', '),
    norme_richiamate: (sentenza?.norme_richiamate ?? []).join('\n'),
    presidente: sentenza?.presidente ?? '',
    relatore: sentenza?.relatore ?? '',
    estensore: sentenza?.estensore ?? '',
  })
  const [file, setFile] = useState(null)
  const [testoIntegrale, setTestoIntegrale] = useState(sentenza?.testo_integrale ?? '')
  const [estraendo, setEstraendo] = useState(false)
  const [erroreOCR, setErroreOCR] = useState('')
  const [pagineOCR, setPagineOCR] = useState(null)
  const [suggerendo, setSuggerendo] = useState(false)
  const [suggerendoMassima, setSuggerendoMassima] = useState(false)
  const [metadatiSuggeriti, setMetadati] = useState(false)
  const [avanzateAperte, setAvanzateAperte] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')
  const [success, setSuccess] = useState(false)
  const [meId, setMeId] = useState(null)
  const [studioId, setStudioId] = useState(null)
  const [isMembro, setIsMembro] = useState(false)

  useEffect(() => {
    async function carica() {
      const { data: { user } } = await supabase.auth.getUser()
      setMeId(user.id)
      const { data } = await supabase.from('profiles').select('titolare_id').eq('id', user.id).single()
      if (data?.titolare_id) {
        setStudioId(data.titolare_id)
        setIsMembro(true)
      } else {
        setIsMembro(false)
      }
    }
    carica()
  }, [])

  async function handleFileChange(selectedFile) {
    setFile(selectedFile)
    setTestoIntegrale('')
    setErroreOCR('')
    setPagineOCR(null)
    if (!selectedFile) return

    setEstraendo(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('file', selectedFile)

      // extract-pdf-text: estrae E pulisce (NFKC + cleanup Unicode + paragrafi)
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-pdf-text`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        }
      )
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)

      setTestoIntegrale(json.testo)
      setPagineOCR(json.pagine)

      await suggerisciMetadati(json.testo)
    } catch (err) {
      setErroreOCR(err.message)
    } finally {
      setEstraendo(false)
    }
  }

  async function suggerisciMetadati(testo) {
    setSuggerendo(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-metadata`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ testo }),
        }
      )
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)

      setForm(prev => ({
        ...prev,
        tipo_provvedimento: prev.tipo_provvedimento || json.tipo_provvedimento || '',
        organo: prev.organo || json.organo || '',
        sezione: prev.sezione || json.sezione || '',
        numero: prev.numero || json.numero || '',
        anno: prev.anno || (json.anno ? String(json.anno) : ''),
        data_deposito: prev.data_deposito || json.data_deposito || '',
        oggetto: prev.oggetto || json.oggetto || '',
        principio_diritto: prev.principio_diritto || json.principio_diritto || '',
        categoria_lex: prev.categoria_lex || json.categoria_lex || '',
        materia: prev.materia || (json.materia ?? []).join(', '),
        parole_chiave: prev.parole_chiave || (json.parole_chiave ?? []).join(', '),
        norme_richiamate: prev.norme_richiamate || (json.norme_richiamate ?? []).join('\n'),
        presidente: prev.presidente || json.presidente || '',
        relatore: prev.relatore || json.relatore || '',
        estensore: prev.estensore || json.estensore || '',
      }))
      setMetadati(true)
    } catch (e) {
      console.error('Suggerimento metadati fallito:', e)
    } finally {
      setSuggerendo(false)
    }
  }

  async function suggerisciMassima() {
    if (!testoIntegrale.trim()) return
    setSuggerendoMassima(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-metadata`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ testo: testoIntegrale, tipo: 'massima' }),
        }
      )
      const json = await res.json()
      if (json.principio_diritto) {
        setForm(prev => ({ ...prev, principio_diritto: prev.principio_diritto || json.principio_diritto }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSuggerendoMassima(false)
    }
  }

  async function handleSalva() {
    setErrore('')
    if (!form.oggetto.trim()) return setErrore('L\'oggetto è obbligatorio')
    if (!form.organo.trim()) return setErrore('L\'organo è obbligatorio')
    if (!form.categoria_lex) return setErrore('La categoria è obbligatoria')
    if (!isEdit && !file) return setErrore('Il file PDF è obbligatorio')
    if (!isEdit && estraendo) return setErrore('Attendi il completamento dell\'estrazione testo')
    if (!isEdit && erroreOCR) return setErrore('Estrazione PDF fallita: carica un altro PDF prima di salvare')
    if (!isEdit && !testoIntegrale.trim()) return setErrore('Il testo della sentenza è obbligatorio per la ricerca semantica')
    if (!isEdit && testoIntegrale.trim().length < 200) return setErrore('Il testo estratto è troppo breve (servono almeno 200 caratteri)')

    setSalvando(true)
    try {
      let storagePath = sentenza?.pdf_storage_path ?? null
      let sizeBytes = sentenza?.pdf_size_bytes ?? null
      let pdfPages = sentenza?.pdf_pages ?? pagineOCR ?? null

      if (file) {
        const ext = file.name.split('.').pop()
        const path = `${meId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('sentenze').upload(path, file)
        if (upErr) throw new Error(upErr.message)
        storagePath = path
        sizeBytes = file.size
      }

      const payload = {
        fonte: 'avvocato_upload',
        tipo_provvedimento: form.tipo_provvedimento || null,
        organo: form.organo.trim(),
        sezione: form.sezione.trim() || null,
        numero: form.numero.trim() || null,
        anno: form.anno ? parseInt(form.anno) : null,
        data_deposito: form.data_deposito || null,
        data_pubblicazione: form.data_deposito || new Date().toISOString().slice(0, 10),
        oggetto: form.oggetto.trim(),
        principio_diritto: form.principio_diritto.trim() || null,
        testo_integrale: testoIntegrale.trim() || null,
        materia: form.materia ? form.materia.split(',').map(t => t.trim()).filter(Boolean) : [],
        parole_chiave: form.parole_chiave ? form.parole_chiave.split(',').map(t => t.trim()).filter(Boolean) : [],
        norme_richiamate: form.norme_richiamate ? form.norme_richiamate.split('\n').map(t => t.trim()).filter(Boolean) : [],
        presidente: form.presidente.trim() || null,
        relatore: form.relatore.trim() || null,
        estensore: form.estensore.trim() || null,
        categorie_lex: form.categoria_lex ? [form.categoria_lex] : [],
        pdf_storage_path: storagePath,
        pdf_size_bytes: sizeBytes,
        pdf_pages: pdfPages,
        vigente: true,
        rilevanza: 3,
      }

      let sentenzaId
      if (isEdit) {
        const { error } = await supabase.from('sentenze').update(payload).eq('id', sentenza.id)
        if (error) throw new Error(error.message)
        sentenzaId = sentenza.id
      } else {
        const { data: nuova, error } = await supabase.from('sentenze').insert({
          ...payload, autore_id: meId, studio_id: studioId ?? null,
          stato: 'in_revisione', accessi: 0,
        }).select('id').single()
        if (error) throw new Error(error.message)
        sentenzaId = nuova.id
      }

      // Embedding fire & forget
      if (sentenzaId && (form.principio_diritto.trim() || form.oggetto.trim())) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-sentenza`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ sentenza_id: sentenzaId }),
            }
          ).catch(err => console.warn('Embedding background error:', err))
        } catch (_) { }
      }

      setSuccess(true)
      setTimeout(() => navigate('/sentenze'), 1500)
    } catch (err) {
      setErrore(err.message)
    } finally {
      setSalvando(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-5">
        <BackButton to="/sentenze" label="Le mie sentenze" />
        <div className="bg-slate border border-white/5 p-10 flex flex-col items-center text-center gap-4">
          <CheckCircle size={40} className="text-salvia" />
          <h2 className="font-display text-2xl text-nebbia">{isEdit ? 'Sentenza aggiornata' : 'Sentenza inviata'}</h2>
          {!isEdit && <p className="font-body text-sm text-nebbia/50">La sentenza è stata inviata. Sarà visibile nella banca dati dopo l'approvazione di Lexum.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <BackButton to="/sentenze" label="Le mie sentenze" />
      <PageHeader label="Banca dati" title={isEdit ? 'Modifica sentenza' : 'Carica sentenza'} />

      {isMembro && (
        <div className="bg-amber-900/10 border border-amber-500/20 p-4">
          <p className="font-body text-xs text-amber-400/80">Stai caricando come membro dello studio. I compensi andranno al titolare.</p>
        </div>
      )}

      {!isMembro && !isEdit && (
        <div className="bg-slate/40 border border-oro/15 p-4">
          <p className="font-body text-xs text-oro mb-1">Come funziona il guadagno</p>
          <p className="font-body text-xs text-nebbia/50 leading-relaxed">Ogni accesso alla tua sentenza ti genera una quota liquidabile su richiesta.</p>
        </div>
      )}

      <div className="flex gap-6 items-start">

        {/* ── COLONNA SINISTRA: documento + testo estratto ── */}
        <div className="flex-[3] min-w-0 space-y-4">
          {!isEdit && (
            <>
              <div className="bg-slate border border-white/5 p-5">
                <p className="section-label mb-4">Documento *</p>
                <label className={`border border-dashed p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${file ? 'border-salvia/30 bg-salvia/5' : 'border-white/15 hover:border-oro/30'}`}>
                  <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                    onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
                  {file ? (
                    <>
                      <FileText size={24} className="text-salvia mb-2" />
                      <p className="font-body text-sm text-salvia font-medium">{file.name}</p>
                      <p className="font-body text-xs text-nebbia/30 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB{pagineOCR ? ` · ${pagineOCR} pagine` : ''}</p>
                      <button type="button" onClick={e => { e.preventDefault(); setFile(null); setTestoIntegrale(''); setErroreOCR(''); setPagineOCR(null) }}
                        className="font-body text-xs text-nebbia/30 hover:text-red-400 mt-2">Rimuovi</button>
                    </>
                  ) : (
                    <>
                      <Upload size={28} className="text-nebbia/20 mb-3" />
                      <p className="font-body text-sm text-nebbia/40 mb-2">Trascina il PDF qui oppure</p>
                      <span className="btn-secondary text-sm">Scegli file PDF</span>
                    </>
                  )}
                </label>

                {estraendo && (
                  <div className="flex items-center gap-3 p-4 bg-petrolio/60 border border-white/5 mt-3">
                    <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full shrink-0" />
                    <p className="font-body text-sm text-nebbia/60">Estrazione testo in corso...</p>
                  </div>
                )}

                {suggerendo && (
                  <div className="flex items-center gap-3 p-4 bg-salvia/5 border border-salvia/20 mt-3">
                    <span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full shrink-0" />
                    <p className="font-body text-sm text-salvia/70">Lex sta analizzando e suggerendo i metadati...</p>
                  </div>
                )}

                {metadatiSuggeriti && !suggerendo && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-3 p-4 bg-salvia/5 border border-salvia/20">
                      <Sparkles size={15} className="text-salvia shrink-0" />
                      <p className="font-body text-sm text-salvia/70">Metadati suggeriti da Lex — verifica e modifica se necessario.</p>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-amber-900/10 border border-amber-500/20">
                      <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="font-body text-sm text-amber-400/80 leading-relaxed">
                        <span className="font-medium">Privacy:</span> rimuovi nomi di persone fisiche, indirizzi e dati personali prima di pubblicare.
                      </p>
                    </div>
                  </div>
                )}

                {erroreOCR && (
                  <div className="bg-red-900/15 border border-red-500/30 p-4 space-y-3 mt-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-red-400 mb-1">
                          Estrazione testo fallita
                        </p>
                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                          {erroreOCR}
                        </p>
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed mt-2">
                          Senza testo estraibile non è possibile pubblicare la sentenza:
                          serve per la ricerca semantica e per generare i metadati.
                          Carica una versione testuale del PDF.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileChange(null)}
                      className="px-3 py-1.5 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors"
                    >
                      Carica un altro PDF
                    </button>
                  </div>
                )}
              </div>

              {testoIntegrale && !estraendo && (
                <div className="bg-slate border border-white/5 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="section-label">Testo estratto</p>
                    <span className="font-body text-[10px] text-salvia border border-salvia/20 px-2 py-0.5">
                      {testoIntegrale.length.toLocaleString('it-IT')} caratteri
                    </span>
                  </div>
                  <p className="font-body text-xs text-nebbia/30">Verifica e correggi — rimuovi dati personali prima di pubblicare.</p>
                  <textarea
                    value={testoIntegrale}
                    onChange={e => setTestoIntegrale(e.target.value)}
                    rows={20}
                    className="w-full bg-petrolio/60 border border-salvia/20 text-nebbia/70 font-body text-xs px-4 py-3 outline-none focus:border-oro/40 resize-y leading-relaxed whitespace-pre-wrap"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── COLONNA DESTRA: metadati ── */}
        <div className="flex-[2] min-w-0 space-y-4 sticky top-6">
          <div className="bg-slate border border-white/5 p-5 space-y-4">
            <p className="section-label">Metadati</p>

            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Oggetto *</label>
              <input value={form.oggetto} onChange={e => setForm(p => ({ ...p, oggetto: e.target.value }))}
                placeholder="Es. Responsabilità medica — errore diagnostico — nesso causale"
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
              <p className="font-body text-xs text-nebbia/25 mt-1">6-15 parole che riassumono la questione giuridica</p>
            </div>

            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Tipo provvedimento</label>
              <select value={form.tipo_provvedimento}
                onChange={e => setForm(p => ({ ...p, tipo_provvedimento: e.target.value }))}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50">
                <option value="">Seleziona tipo...</option>
                {TIPI_PROVVEDIMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Organo *</label>
                <input value={form.organo} onChange={e => setForm(p => ({ ...p, organo: e.target.value }))}
                  placeholder="Es. Corte di Cassazione"
                  className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
              </div>
              <div>
                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Sezione</label>
                <input value={form.sezione} onChange={e => setForm(p => ({ ...p, sezione: e.target.value }))}
                  placeholder="Es. Sezione III Civile"
                  className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Numero</label>
                <input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
                  placeholder="8058"
                  className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
              </div>
              <div>
                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Anno</label>
                <input type="number" value={form.anno} onChange={e => setForm(p => ({ ...p, anno: e.target.value }))}
                  placeholder="2026"
                  className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
              </div>
              <div>
                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Data deposito</label>
                <input type="date" value={form.data_deposito} onChange={e => setForm(p => ({ ...p, data_deposito: e.target.value }))}
                  className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50" />
              </div>
            </div>

            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Categoria *</label>
              <select value={form.categoria_lex}
                onChange={e => setForm(p => ({ ...p, categoria_lex: e.target.value }))}
                disabled={loadingCategorie}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 disabled:opacity-40">
                <option value="">{loadingCategorie ? 'Caricamento...' : 'Seleziona categoria...'}</option>
                {raggruppate.map(g => (
                  <optgroup key={g.macro} label={g.macro}>
                    {g.items.map(c => (
                      <option key={c.codice} value={c.codice}>{c.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-body text-xs text-nebbia/50 tracking-widest uppercase">Principio di diritto</label>
                {testoIntegrale && (
                  <button onClick={suggerisciMassima} disabled={suggerendoMassima}
                    className="flex items-center gap-1.5 font-body text-xs text-salvia hover:text-salvia/80 transition-colors disabled:opacity-40">
                    {suggerendoMassima
                      ? <span className="animate-spin w-3 h-3 border-2 border-salvia border-t-transparent rounded-full" />
                      : <Sparkles size={11} />
                    }
                    Suggerisci con Lex
                  </button>
                )}
              </div>
              <textarea
                rows={5}
                value={form.principio_diritto}
                onChange={e => setForm(p => ({ ...p, principio_diritto: e.target.value }))}
                placeholder="Massima di 3-5 righe che esprime il principio di diritto affermato..."
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
              />
              <p className="font-body text-xs text-nebbia/25 mt-1">Principio astratto, senza dettagli del caso concreto</p>
            </div>

            <div className="border-t border-white/5 pt-3">
              <button
                onClick={() => setAvanzateAperte(!avanzateAperte)}
                className="w-full flex items-center justify-between font-body text-xs text-nebbia/40 tracking-widest uppercase hover:text-nebbia transition-colors">
                <span>Dettagli avanzati</span>
                {avanzateAperte ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {avanzateAperte && (
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Materia</label>
                    <input value={form.materia} onChange={e => setForm(p => ({ ...p, materia: e.target.value }))}
                      placeholder="responsabilità extracontrattuale, nesso causale..."
                      className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                    <p className="font-body text-xs text-nebbia/25 mt-1">Separate da virgola</p>
                  </div>

                  <div>
                    <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Parole chiave</label>
                    <input value={form.parole_chiave} onChange={e => setForm(p => ({ ...p, parole_chiave: e.target.value }))}
                      placeholder="errore diagnostico, onere della prova..."
                      className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                    <p className="font-body text-xs text-nebbia/25 mt-1">Separate da virgola</p>
                  </div>

                  <div>
                    <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Norme richiamate</label>
                    <textarea rows={3} value={form.norme_richiamate} onChange={e => setForm(p => ({ ...p, norme_richiamate: e.target.value }))}
                      placeholder={`IT:art.2043 C.C.\nIT:art.40 C.P.\nIT:D.Lgs.81/2008`}
                      className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25 font-mono" />
                    <p className="font-body text-xs text-nebbia/25 mt-1">Una per riga, formato IT:art.NNN C.C. o IT:D.Lgs.NNN/AAAA</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Presidente</label>
                      <input value={form.presidente} onChange={e => setForm(p => ({ ...p, presidente: e.target.value }))}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
                    </div>
                    <div>
                      <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Relatore</label>
                      <input value={form.relatore} onChange={e => setForm(p => ({ ...p, relatore: e.target.value }))}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
                    </div>
                    <div>
                      <label className="block font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Estensore</label>
                      <input value={form.estensore} onChange={e => setForm(p => ({ ...p, estensore: e.target.value }))}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {errore && (
              <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                <AlertCircle size={14} /> {errore}
              </div>
            )}

            {!isEdit && !estraendo && !erroreOCR && (!file || !testoIntegrale.trim() || testoIntegrale.trim().length < 200) && (
              <p className="font-body text-xs text-amber-400/80 flex items-center gap-1.5">
                <AlertCircle size={11} />
                {!file
                  ? 'Carica il PDF della sentenza per procedere'
                  : !testoIntegrale.trim()
                    ? 'Attendi l\'estrazione del testo'
                    : 'Il testo estratto è troppo breve (servono almeno 200 caratteri)'
                }
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate('/sentenze')} className="btn-secondary text-sm flex-1">Annulla</button>
              <button
                onClick={handleSalva}
                disabled={
                  salvando
                  || estraendo
                  || (!isEdit && !file)
                  || (!isEdit && !testoIntegrale.trim())
                  || (!isEdit && testoIntegrale.trim().length < 200)
                  || !!erroreOCR
                }
                className="btn-primary text-sm flex-1 justify-center"
              >
                {salvando
                  ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                  : isEdit ? 'Salva modifiche' : 'Carica sentenza'
                }
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export function AvvocatoSentenzeNuova() { return <FormSentenza isEdit={false} /> }

// ─────────────────────────────────────────────────────────────
// DETTAGLIO (per avvocato — sua sentenza)
// ─────────────────────────────────────────────────────────────
export function AvvocatoSentenzeDettaglio() {
  const { id } = useParams()
  const [s, setS] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [accessi, setAccessi] = useState(0)
  const [guadagno, setGuadagno] = useState(0)

  useEffect(() => {
    async function carica() {
      setLoading(true)
      const { data: sentenza } = await supabase.from('sentenze').select('*').eq('id', id).single()
      if (sentenza) {
        setS(sentenza)
        if (sentenza.pdf_storage_path) {
          const { data } = await supabase.storage.from('sentenze').createSignedUrl(sentenza.pdf_storage_path, 3600)
          setPdfUrl(data?.signedUrl ?? null)
        }
        const { data: acc } = await supabase.from('accessi_sentenze').select('quota_autore').eq('sentenza_id', id)
        const tot = (acc ?? []).reduce((a, c) => a + parseFloat(c.quota_autore ?? 0), 0)
        setAccessi(acc?.length ?? 0)
        setGuadagno(tot)
      }
      setLoading(false)
    }
    carica()
  }, [id])

  if (loading) return <div className="flex items-center justify-center py-40"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
  if (!s) return <div className="space-y-5"><BackButton to="/sentenze" label="Le mie sentenze" /><p className="font-body text-sm text-nebbia/40">Sentenza non trovata.</p></div>

  const sb = STATO_BADGE[s.stato] ?? STATO_BADGE.pubblica
  const titolo = titoloSentenza(s)

  return (
    <div className="space-y-5">
      <BackButton to="/sentenze" label="Le mie sentenze" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="section-label mb-2">Sentenza</p>
          <h1 className="font-display text-3xl font-light text-nebbia">{s.oggetto ?? 'Sentenza'}</h1>
          <p className="font-body text-xs text-nebbia/30 mt-1">{titolo}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge label={sb.label} variant={sb.variant} />
          <AggiungiAPratica sentenza={s} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Accessi totali" value={accessi} colorClass="text-oro" />
        <StatCard label="Guadagno maturato" value={`€ ${guadagno.toFixed(2)}`} colorClass="text-salvia" />
        <StatCard label="Caricata il" value={new Date(s.created_at).toLocaleDateString('it-IT')} colorClass="text-nebbia/50" />
      </div>

      {(s.categorie_lex ?? []).length > 0 && (
        <div className="bg-slate border border-white/5 p-5">
          <p className="section-label mb-3">Categorie</p>
          <div className="flex flex-wrap gap-2">
            {s.categorie_lex.map(t => <span key={t} className="font-body text-xs px-3 py-1 bg-petrolio border border-white/10 text-nebbia/50">{t}</span>)}
          </div>
        </div>
      )}

      {s.principio_diritto && (
        <div className="bg-slate border border-white/5 p-5">
          <p className="section-label mb-3">Principio di diritto</p>
          <p className="font-body text-sm text-nebbia/60 leading-relaxed whitespace-pre-line">{s.principio_diritto}</p>
        </div>
      )}

      {(s.parole_chiave ?? []).length > 0 && (
        <div className="bg-slate border border-white/5 p-5">
          <p className="section-label mb-3">Parole chiave</p>
          <div className="flex flex-wrap gap-2">
            {s.parole_chiave.map(t => <span key={t} className="font-body text-xs px-3 py-1 bg-petrolio border border-white/10 text-nebbia/50">{t}</span>)}
          </div>
        </div>
      )}

      {(s.norme_richiamate ?? []).length > 0 && (
        <div className="bg-slate border border-white/5 p-5">
          <p className="section-label mb-3">Norme richiamate</p>
          <div className="space-y-1">
            {s.norme_richiamate.map((n, i) => (
              <p key={i} className="font-mono text-xs text-nebbia/50">{n}</p>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate border border-white/5 p-5">
        <p className="section-label mb-4">Documento</p>
        {pdfUrl ? (
          <div className="space-y-3">
            <iframe src={pdfUrl} className="w-full rounded" style={{ height: 600 }} title={s.oggetto ?? 'Sentenza'} />
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn-secondary text-sm inline-flex items-center gap-2">
              <Download size={13} /> Scarica PDF
            </a>
          </div>
        ) : (
          <div className="border border-dashed border-white/15 p-8 flex flex-col items-center text-center">
            <FileText size={36} className="text-nebbia/15 mb-3" />
            <p className="font-body text-sm text-nebbia/30">Documento non disponibile</p>
          </div>
        )}
      </div>
    </div>
  )
}