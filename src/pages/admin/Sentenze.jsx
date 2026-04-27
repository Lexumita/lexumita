// src/pages/admin/Sentenze.jsx

import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { PageHeader, BackButton, Badge, StatCard } from '@/components/shared'
import {
  Search, Eye, EyeOff, Trash2, FileText,
  ChevronUp, ChevronDown, ArrowUpDown, AlertCircle,
  Download, CheckCircle, Filter, X, Gavel, Clock,
  Calendar, Scale, BookOpen, Landmark
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function titoloSentenza(s) {
  const parti = [s.organo, s.sezione, s.numero && `n. ${s.numero}`, s.anno].filter(Boolean)
  return parti.join(' · ') || 'Sentenza'
}

function labelTipoProvvedimento(t) {
  const map = {
    sentenza: 'Sentenza',
    ordinanza: 'Ordinanza',
    ordinanza_interlocutoria: 'Ord. interlocutoria',
    decreto_presidenziale: 'Decreto',
    rassegna: 'Rassegna',
    relazione: 'Relazione',
  }
  return map[t] ?? t
}

const STATO_BADGE = {
  pubblica: { label: 'Pubblica', variant: 'salvia' },
  in_revisione: { label: 'In revisione', variant: 'warning' },
  sospesa: { label: 'Sospesa', variant: 'gray' },
}

const TIPI_FILTRO = [
  { v: '', l: 'Tutti i tipi' },
  { v: 'sentenza', l: 'Sentenza' },
  { v: 'ordinanza', l: 'Ordinanza' },
  { v: 'ordinanza_interlocutoria', l: 'Ord. interlocutoria' },
  { v: 'decreto_presidenziale', l: 'Decreto presidenziale' },
]

// ═══════════════════════════════════════════════════════════════
// HOOK — carica mappa codici_lex
// ═══════════════════════════════════════════════════════════════
function useCodiciLex() {
  const [mappa, setMappa] = useState({})
  useEffect(() => {
    supabase.from('codici_lex').select('codice, label, macro_label').then(({ data }) => {
      const m = {}
      for (const c of data ?? []) m[c.codice] = { label: c.label, macro_label: c.macro_label }
      setMappa(m)
    })
  }, [])
  return mappa
}

// ═══════════════════════════════════════════════════════════════
// SORT HEADER
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// PAGINA LISTA
// ═══════════════════════════════════════════════════════════════
export function AdminSentenze() {
  const mappaCategorie = useCodiciLex()

  const [sentenze, setSentenze] = useState([])
  const [guadagni, setGuadagni] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tabAttivo, setTabAttivo] = useState('in_revisione')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAnno, setFiltroAnno] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    async function carica() {
      setLoading(true)

      const { data } = await supabase
        .from('sentenze')
        .select(`
          id, oggetto, organo, sezione, numero, anno,
          tipo_provvedimento, categorie_lex, stato, accessi,
          data_pubblicazione, created_at,
          autore:autore_id(id, nome, cognome, email)
        `)
        .order('created_at', { ascending: false })

      setSentenze(data ?? [])

      const { data: acc } = await supabase
        .from('accessi_sentenze')
        .select('sentenza_id, quota_autore')

      const map = {}
      for (const a of acc ?? []) {
        map[a.sentenza_id] = (map[a.sentenza_id] ?? 0) + parseFloat(a.quota_autore ?? 0)
      }
      setGuadagni(map)

      setLoading(false)
    }
    carica()
  }, [])

  // Seleziona automaticamente "Pubbliche" al primo render se non c'e niente in revisione
  useEffect(() => {
    if (!loading && sentenze.length > 0) {
      const nRevisione = sentenze.filter(s => s.stato === 'in_revisione').length
      if (nRevisione === 0 && tabAttivo === 'in_revisione') {
        setTabAttivo('pubblica')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  function handleSort(f) {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(f); setSortDir('asc') }
  }

  async function toggleStato(id, nuovoStato) {
    await supabase.from('sentenze').update({ stato: nuovoStato }).eq('id', id)
    setSentenze(prev => prev.map(s => s.id === id ? { ...s, stato: nuovoStato } : s))
  }

  async function elimina(id) {
    if (!confirm('Eliminare definitivamente questa sentenza? Questa azione non puo essere annullata.')) return
    await supabase.from('sentenze').delete().eq('id', id)
    setSentenze(prev => prev.filter(s => s.id !== id))
  }

  // Stats
  const stats = useMemo(() => {
    const byStato = { in_revisione: 0, pubblica: 0, sospesa: 0 }
    let accessiTot = 0
    let guadagnoTot = 0
    for (const s of sentenze) {
      byStato[s.stato] = (byStato[s.stato] ?? 0) + 1
      accessiTot += s.accessi ?? 0
      guadagnoTot += guadagni[s.id] ?? 0
    }
    return { byStato, accessiTot, guadagnoTot }
  }, [sentenze, guadagni])

  const anniDisponibili = [...new Set(sentenze.map(s => s.anno).filter(Boolean))].sort((a, b) => b - a)

  // Filtro
  const rows = sentenze
    .filter(s => {
      if (tabAttivo !== 'tutte' && s.stato !== tabAttivo) return false
      if (filtroTipo && s.tipo_provvedimento !== filtroTipo) return false
      if (filtroAnno && String(s.anno) !== filtroAnno) return false
      if (search) {
        const avv = `${s.autore?.nome ?? ''} ${s.autore?.cognome ?? ''}`
        const haystack = `${s.oggetto ?? ''} ${s.organo ?? ''} ${avv} ${(s.categorie_lex ?? []).join(' ')}`.toLowerCase()
        if (!haystack.includes(search.toLowerCase())) return false
      }
      return true
    })
    .sort((a, b) => {
      let va = a[sortField] ?? ''
      let vb = b[sortField] ?? ''
      if (['accessi', 'anno'].includes(sortField)) { va = +va; vb = +vb }
      else if (sortField === 'created_at' || sortField === 'data_pubblicazione') {
        va = new Date(va || 0); vb = new Date(vb || 0)
      }
      else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase() }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  return (
    <div className="space-y-6">
      <PageHeader
        label="Admin"
        title="Sentenze"
        subtitle="Modera le sentenze caricate dagli avvocati"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="In revisione"
          value={stats.byStato.in_revisione}
          colorClass={stats.byStato.in_revisione > 0 ? 'text-amber-400' : 'text-nebbia/40'}
        />
        <StatCard label="Pubbliche" value={stats.byStato.pubblica} colorClass="text-salvia" />
        <StatCard label="Sospese" value={stats.byStato.sospesa} colorClass="text-nebbia/40" />
        <StatCard
          label="Guadagni generati"
          value={`EUR ${stats.guadagnoTot.toFixed(2)}`}
          colorClass="text-oro"
        />
      </div>

      {/* Tab per stato */}
      <div className="flex gap-0 border-b border-white/8 overflow-x-auto">
        {[
          { id: 'in_revisione', label: 'In revisione', icon: Clock, count: stats.byStato.in_revisione },
          { id: 'pubblica', label: 'Pubbliche', icon: CheckCircle, count: stats.byStato.pubblica },
          { id: 'sospesa', label: 'Sospese', icon: EyeOff, count: stats.byStato.sospesa },
          { id: 'tutte', label: 'Tutte', icon: Gavel, count: sentenze.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTabAttivo(t.id)}
            className={`flex items-center gap-2 px-5 py-3 font-body text-sm border-b-2 transition-colors whitespace-nowrap ${tabAttivo === t.id ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'
              }`}>
            <t.icon size={13} strokeWidth={1.5} />
            {t.label}
            {t.count > 0 && (
              <span className={`font-body text-xs px-1.5 py-0.5 ${tabAttivo === t.id ? 'bg-oro/15 text-oro' : 'bg-white/5 text-nebbia/40'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Banner priorita revisione */}
      {stats.byStato.in_revisione > 0 && tabAttivo !== 'in_revisione' && (
        <div className="flex items-center justify-between gap-3 p-4 bg-amber-900/10 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-amber-400" />
            <p className="font-body text-sm text-amber-400">
              {stats.byStato.in_revisione} {stats.byStato.in_revisione === 1 ? 'sentenza in attesa' : 'sentenze in attesa'} di approvazione
            </p>
          </div>
          <button onClick={() => setTabAttivo('in_revisione')}
            className="font-body text-xs text-amber-400 border border-amber-500/30 px-3 py-1.5 hover:bg-amber-500/10 transition-colors">
            Rivedi ora
          </button>
        </div>
      )}

      {/* Filtri ricerca */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
          <input
            placeholder="Cerca oggetto, organo, avvocato, categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
          />
        </div>

        <div className="flex items-center gap-1.5 text-nebbia/30">
          <Filter size={12} />
          <span className="font-body text-xs uppercase tracking-widest">Filtri</span>
        </div>

        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-2 outline-none focus:border-oro/40">
          {TIPI_FILTRO.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>

        {anniDisponibili.length > 0 && (
          <select value={filtroAnno} onChange={e => setFiltroAnno(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia/60 font-body text-xs px-3 py-2 outline-none focus:border-oro/40">
            <option value="">Tutti gli anni</option>
            {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {(search || filtroTipo || filtroAnno) && (
          <button onClick={() => { setSearch(''); setFiltroTipo(''); setFiltroAnno('') }}
            className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors flex items-center gap-1">
            <X size={11} /> Reset
          </button>
        )}
      </div>

      {/* Tabella */}
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
                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Avvocato</th>
                <SortTh label="Anno" field="anno" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Accessi" field="accessi" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Guadagno</th>
                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Stato</th>
                <SortTh label="Caricata" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-16 text-center font-body text-sm text-nebbia/30">
                  {sentenze.length === 0 ? 'Nessuna sentenza caricata' : 'Nessun risultato con questi filtri'}
                </td></tr>
              ) : rows.map(s => {
                const avv = `${s.autore?.nome ?? ''} ${s.autore?.cognome ?? ''}`.trim()
                const sb = STATO_BADGE[s.stato] ?? STATO_BADGE.in_revisione
                const categoriaPrincipale = (s.categorie_lex ?? [])[0]
                const catInfo = categoriaPrincipale ? mappaCategorie[categoriaPrincipale] : null

                return (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-body text-sm font-medium text-nebbia line-clamp-2 max-w-xs">{s.oggetto ?? '—'}</p>
                      {s.tipo_provvedimento && (
                        <span className="font-body text-[10px] text-nebbia/40 mt-0.5 inline-block">
                          {labelTipoProvvedimento(s.tipo_provvedimento)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-body text-xs text-nebbia/70">{s.organo ?? '—'}</p>
                      {s.sezione && <p className="font-body text-[10px] text-nebbia/30">{s.sezione}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {catInfo ? (
                        <div>
                          <p className="font-body text-xs text-nebbia/60">{catInfo.label}</p>
                          <p className="font-body text-[10px] text-nebbia/30">{catInfo.macro_label}</p>
                        </div>
                      ) : categoriaPrincipale ? (
                        <span className="font-body text-xs text-amber-400/70">{categoriaPrincipale}</span>
                      ) : (
                        <span className="font-body text-xs text-nebbia/25">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                      {avv ? `Avv. ${avv}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">{s.anno ?? '—'}</td>
                    <td className="px-4 py-3 font-body text-sm text-oro">{s.accessi ?? 0}</td>
                    <td className="px-4 py-3 font-body text-sm text-salvia">
                      EUR {(guadagni[s.id] ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3"><Badge label={sb.label} variant={sb.variant} /></td>
                    <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center justify-end">
                        {s.stato === 'in_revisione' && (
                          <button
                            onClick={() => toggleStato(s.id, 'pubblica')}
                            title="Approva"
                            className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-salvia hover:bg-salvia/10 transition-colors"
                          >
                            <CheckCircle size={13} />
                          </button>
                        )}
                        <Link to={`/admin/sentenze/${s.id}`}
                          className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-oro hover:bg-oro/10 transition-colors">
                          <Eye size={13} />
                        </Link>
                        <button onClick={() => elimina(s.id)}
                          title="Elimina"
                          className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
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

// ═══════════════════════════════════════════════════════════════
// DETTAGLIO SENTENZA
// ═══════════════════════════════════════════════════════════════
export function AdminSentenzeDettaglio() {
  const { id } = useParams()
  const navigate = useNavigate()
  const mappaCategorie = useCodiciLex()

  const [s, setS] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guadagno, setGuadagno] = useState(0)
  const [nAccessi, setNAccessi] = useState(0)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [cambiando, setCambiando] = useState(false)
  const [errore, setErrore] = useState('')
  const [notaRifiuto, setNotaRifiuto] = useState('')
  const [mostraRifiuto, setMostraRifiuto] = useState(false)

  useEffect(() => {
    async function carica() {
      setLoading(true)
      const { data: sentenza } = await supabase
        .from('sentenze')
        .select('*, autore:autore_id(id, nome, cognome, email)')
        .eq('id', id)
        .maybeSingle()

      if (sentenza) {
        setS(sentenza)

        if (sentenza.pdf_storage_path) {
          const { data } = await supabase.storage
            .from('sentenze')
            .createSignedUrl(sentenza.pdf_storage_path, 3600)
          setPdfUrl(data?.signedUrl ?? null)
        }

        const { data: acc } = await supabase
          .from('accessi_sentenze')
          .select('quota_autore')
          .eq('sentenza_id', id)

        const tot = (acc ?? []).reduce((a, c) => a + parseFloat(c.quota_autore ?? 0), 0)
        setNAccessi(acc?.length ?? 0)
        setGuadagno(tot)
      }
      setLoading(false)
    }
    carica()
  }, [id])

  async function cambiaStato(nuovoStato, nota = null) {
    setCambiando(true); setErrore('')
    const payload = { stato: nuovoStato }
    if (nota) payload.note_interne = nota
    const { error } = await supabase.from('sentenze').update(payload).eq('id', id)
    if (error) { setErrore(error.message); setCambiando(false); return }
    setS(prev => ({ ...prev, stato: nuovoStato, note_interne: nota ?? prev.note_interne }))
    setCambiando(false)
    setMostraRifiuto(false)
    setNotaRifiuto('')
  }

  async function elimina() {
    if (!confirm('Eliminare definitivamente questa sentenza? Questa azione non puo essere annullata.')) return
    await supabase.from('sentenze').delete().eq('id', id)
    navigate('/admin/sentenze')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
    </div>
  )

  if (!s) return (
    <div className="space-y-5">
      <BackButton to="/admin/sentenze" label="Sentenze" />
      <p className="font-body text-sm text-nebbia/40">Sentenza non trovata.</p>
    </div>
  )

  const sb = STATO_BADGE[s.stato] ?? STATO_BADGE.in_revisione
  const titolo = titoloSentenza(s)
  const dataVisibile = s.data_pubblicazione ?? s.data_deposito

  return (
    <div className="space-y-6">
      <BackButton to="/admin/sentenze" label="Sentenze" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <p className="section-label !m-0">Moderazione</p>
            <Badge label={sb.label} variant={sb.variant} />
            {s.tipo_provvedimento && (
              <span className="font-body text-[10px] text-nebbia/50 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">
                {labelTipoProvvedimento(s.tipo_provvedimento)}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-light text-nebbia">{s.oggetto ?? 'Sentenza'}</h1>
          <p className="font-body text-sm text-nebbia/40 mt-2">{titolo}</p>
          {dataVisibile && (
            <p className="font-body text-xs text-nebbia/30 mt-1 flex items-center gap-1.5">
              <Calendar size={11} /> Pubblicata il {new Date(dataVisibile).toLocaleDateString('it-IT')}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Accessi" value={nAccessi} colorClass="text-oro" />
        <StatCard label="Guadagno" value={`EUR ${guadagno.toFixed(2)}`} colorClass="text-salvia" />
        <StatCard label="Caricata" value={new Date(s.created_at).toLocaleDateString('it-IT')} colorClass="text-nebbia/50" />
        <StatCard label="Aggiornata" value={s.updated_at ? new Date(s.updated_at).toLocaleDateString('it-IT') : '—'} colorClass="text-nebbia/50" />
      </div>

      {/* Autore */}
      <div className="bg-slate border border-white/5 p-5">
        <p className="section-label mb-3">Autore</p>
        {s.autore ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-body text-sm font-medium text-nebbia">
                Avv. {s.autore.nome} {s.autore.cognome}
              </p>
              <p className="font-body text-xs text-nebbia/40 mt-0.5">{s.autore.email}</p>
            </div>
            <Link to={`/admin/utenti/${s.autore.id}`}
              className="font-body text-xs text-oro hover:text-oro/70 transition-colors">
              Profilo utente →
            </Link>
          </div>
        ) : (
          <p className="font-body text-sm text-nebbia/40">Autore non disponibile</p>
        )}
      </div>

      {/* Metadati */}
      <div className="bg-slate border border-white/5 p-5 space-y-3">
        <p className="section-label mb-2">Metadati</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ['Organo', s.organo],
            ['Sezione', s.sezione],
            ['Numero', s.numero],
            ['Anno', s.anno],
            ['Tipo', labelTipoProvvedimento(s.tipo_provvedimento)],
            ['Data deposito', s.data_deposito ? new Date(s.data_deposito).toLocaleDateString('it-IT') : null],
            ['Fonte', s.fonte],
            ['Vigente', s.vigente ? 'Si' : 'No'],
          ].filter(([, v]) => v).map(([l, v]) => (
            <div key={l} className="flex justify-between gap-2 border-b border-white/5 pb-2">
              <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
              <span className="font-body text-sm text-nebbia/70 text-right">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Categorie Lex */}
      {(s.categorie_lex ?? []).length > 0 && (
        <div className="bg-slate border border-white/5 p-5">
          <p className="section-label mb-3">Categorie</p>
          <div className="flex flex-wrap gap-2">
            {s.categorie_lex.map(c => {
              const info = mappaCategorie[c]
              return (
                <span key={c} className={`font-body text-xs px-3 py-1 border ${info ? 'bg-petrolio border-white/10 text-nebbia/60' : 'bg-amber-900/10 border-amber-500/30 text-amber-400'}`}>
                  {info ? info.label : c}
                  {info && <span className="text-nebbia/30 ml-1.5">· {info.macro_label}</span>}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Principio di diritto */}
      {s.principio_diritto && (
        <div className="bg-slate border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scale size={13} className="text-oro/60" />
            <p className="section-label !m-0">Principio di diritto</p>
          </div>
          <p className="font-body text-sm text-nebbia/75 leading-relaxed whitespace-pre-line">
            {s.principio_diritto}
          </p>
        </div>
      )}

      {/* Materia + Parole chiave */}
      {((s.materia ?? []).length > 0 || (s.parole_chiave ?? []).length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(s.materia ?? []).length > 0 && (
            <div className="bg-slate border border-white/5 p-5">
              <p className="section-label mb-3">Materia</p>
              <div className="flex flex-wrap gap-2">
                {s.materia.map(m => (
                  <span key={m} className="font-body text-xs px-2.5 py-1 bg-petrolio border border-white/10 text-nebbia/60">{m}</span>
                ))}
              </div>
            </div>
          )}
          {(s.parole_chiave ?? []).length > 0 && (
            <div className="bg-slate border border-white/5 p-5">
              <p className="section-label mb-3">Parole chiave</p>
              <div className="flex flex-wrap gap-2">
                {s.parole_chiave.map(p => (
                  <span key={p} className="font-body text-xs px-2.5 py-1 bg-petrolio border border-white/10 text-nebbia/60">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Norme richiamate */}
      {(s.norme_richiamate ?? []).length > 0 && (
        <div className="bg-slate border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={13} className="text-oro/60" />
            <p className="section-label !m-0">Norme richiamate</p>
          </div>
          <div className="space-y-1.5">
            {s.norme_richiamate.map((n, i) => (
              <p key={i} className="font-mono text-xs text-nebbia/60 px-3 py-2 bg-petrolio/50 border-l-2 border-oro/20">
                {n}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Collegio */}
      {(s.presidente || s.relatore || s.estensore) && (
        <div className="bg-slate border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gavel size={13} className="text-oro/60" />
            <p className="section-label !m-0">Collegio</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {s.presidente && (
              <div>
                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Presidente</p>
                <p className="font-body text-sm text-nebbia/70">{s.presidente}</p>
              </div>
            )}
            {s.relatore && (
              <div>
                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Relatore</p>
                <p className="font-body text-sm text-nebbia/70">{s.relatore}</p>
              </div>
            )}
            {s.estensore && (
              <div>
                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Estensore</p>
                <p className="font-body text-sm text-nebbia/70">{s.estensore}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documento PDF */}
      <div className="bg-slate border border-white/5 p-5">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText size={13} className="text-oro/60" />
            <p className="section-label !m-0">Documento</p>
          </div>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noreferrer"
              className="font-body text-xs text-nebbia/50 hover:text-oro flex items-center gap-1.5 transition-colors">
              <Download size={11} /> Apri in nuova scheda
            </a>
          )}
        </div>
        {pdfUrl ? (
          <iframe src={pdfUrl} title={s.oggetto ?? 'Sentenza'}
            className="w-full border border-white/5" style={{ height: 700 }} />
        ) : (
          <div className="border border-dashed border-white/10 p-8 flex flex-col items-center text-center">
            <FileText size={28} className="text-nebbia/15 mb-2" />
            <p className="font-body text-sm text-nebbia/30">PDF non disponibile</p>
          </div>
        )}
      </div>

      {/* Testo integrale */}
      {s.testo_integrale && (
        <div className="bg-slate border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={13} className="text-oro/60" />
            <p className="section-label !m-0">Testo integrale estratto</p>
          </div>
          <div className="bg-petrolio/60 border border-white/5 p-5 max-h-[500px] overflow-y-auto">
            <p className="font-body text-xs text-nebbia/60 whitespace-pre-line leading-relaxed">
              {s.testo_integrale}
            </p>
          </div>
        </div>
      )}

      {/* Note interne (se presenti) */}
      {s.note_interne && (
        <div className="bg-slate border border-amber-500/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={13} className="text-amber-400" />
            <p className="section-label !m-0">Note di moderazione</p>
          </div>
          <p className="font-body text-sm text-nebbia/70 whitespace-pre-line">{s.note_interne}</p>
        </div>
      )}

      {/* MODERAZIONE */}
      <div className="bg-slate border border-oro/20 p-5">
        <p className="section-label mb-4">Azioni di moderazione</p>

        {errore && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20 mb-4">
            <AlertCircle size={14} /> {errore}
          </div>
        )}

        {/* Form nota rifiuto */}
        {mostraRifiuto && (
          <div className="bg-petrolio/60 border border-amber-500/20 p-4 mb-4 space-y-3">
            <p className="font-body text-sm text-amber-400 font-medium">Motivazione del rifiuto</p>
            <textarea
              rows={3}
              value={notaRifiuto}
              onChange={e => setNotaRifiuto(e.target.value)}
              placeholder="Es. Contiene dati personali non anonimizzati..."
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
            />
            <p className="font-body text-xs text-nebbia/30">
              Questa nota sara salvata in "note_interne" e visibile all'autore.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => cambiaStato('sospesa', notaRifiuto)}
                disabled={cambiando || !notaRifiuto.trim()}
                className="flex items-center gap-2 font-body text-sm px-4 py-2 border border-amber-500/30 text-amber-400 hover:bg-amber-900/10 transition-colors disabled:opacity-40">
                Conferma rifiuto
              </button>
              <button onClick={() => { setMostraRifiuto(false); setNotaRifiuto('') }}
                className="font-body text-sm px-4 py-2 border border-white/10 text-nebbia/40 hover:text-nebbia transition-colors">
                Annulla
              </button>
            </div>
          </div>
        )}

        {!mostraRifiuto && (
          <div className="flex gap-3 flex-wrap">
            {s.stato === 'in_revisione' && (
              <>
                <button onClick={() => cambiaStato('pubblica')} disabled={cambiando}
                  className="flex items-center gap-2 font-body text-sm px-4 py-2.5 bg-salvia/10 border border-salvia/30 text-salvia hover:bg-salvia/20 transition-colors disabled:opacity-40">
                  <CheckCircle size={14} /> Approva e pubblica
                </button>
                <button onClick={() => setMostraRifiuto(true)} disabled={cambiando}
                  className="flex items-center gap-2 font-body text-sm px-4 py-2.5 border border-amber-500/30 text-amber-400 hover:bg-amber-900/10 transition-colors disabled:opacity-40">
                  <EyeOff size={14} /> Rifiuta
                </button>
              </>
            )}

            {s.stato === 'pubblica' && (
              <button onClick={() => cambiaStato('sospesa')} disabled={cambiando}
                className="flex items-center gap-2 font-body text-sm px-4 py-2.5 border border-amber-500/30 text-amber-400 hover:bg-amber-900/10 transition-colors disabled:opacity-40">
                <EyeOff size={14} /> Sospendi
              </button>
            )}

            {s.stato === 'sospesa' && (
              <button onClick={() => cambiaStato('pubblica')} disabled={cambiando}
                className="flex items-center gap-2 font-body text-sm px-4 py-2.5 bg-salvia/10 border border-salvia/30 text-salvia hover:bg-salvia/20 transition-colors disabled:opacity-40">
                <Eye size={14} /> Riattiva
              </button>
            )}

            <button onClick={elimina} disabled={cambiando}
              className="flex items-center gap-2 font-body text-sm px-4 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-900/10 transition-colors disabled:opacity-40 ml-auto">
              <Trash2 size={14} /> Elimina definitivamente
            </button>
          </div>
        )}
      </div>

      {/* Footer tecnico */}
      <div className="pt-4 border-t border-white/5">
        <p className="font-body text-xs text-nebbia/25 text-center">
          ID: {s.id}
          {s.pdf_size_bytes && ` · ${(s.pdf_size_bytes / 1024 / 1024).toFixed(1)} MB`}
          {s.pdf_pages && ` · ${s.pdf_pages} pagine`}
        </p>
      </div>
    </div>
  )
}