// src/pages/admin/Prodotti.jsx

import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { PageHeader, BackButton, Badge } from '@/components/shared'
import { Plus, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
const TIPO_CONFIG = {
  abbonamento: { label: 'Abbonamento', variant: 'oro' },
  seat_addon: { label: 'Seat add-on', variant: 'gray' },
  accesso_singolo: { label: 'Accesso doc.', variant: 'gray' },
  crediti_ai: { label: 'Crediti AI', variant: 'salvia' },
  gratuito: { label: 'Gratuito', variant: 'salvia' },
}

function Dash() {
  return <span className="font-body text-xs text-nebbia/20">—</span>
}

// ─────────────────────────────────────────────────────────────
// LISTA PRODOTTI
// ─────────────────────────────────────────────────────────────
export function AdminProdotti() {
  const [prodotti, setProdotti] = useState([])
  const [loading, setLoading] = useState(true)
  const [soloAttivi, setSoloAttivi] = useState(false)

  useEffect(() => {
    async function carica() {
      setLoading(true)
      const { data } = await supabase
        .from('prodotti')
        .select('*')
        .order('created_at', { ascending: false })
      setProdotti(data ?? [])
      setLoading(false)
    }
    carica()
  }, [])

  const rows = prodotti.filter(p => soloAttivi ? p.attivo : true)

  return (
    <div className="space-y-5">
      <PageHeader
        label="Admin"
        title="Prodotti"
        action={
          <Link to="/admin/prodotti/nuovo" className="btn-primary text-sm">
            <Plus size={15} />Nuovo prodotto
          </Link>
        }
      />

      <label className="flex items-center gap-2 font-body text-sm text-nebbia/50 cursor-pointer">
        <input type="checkbox" checked={soloAttivi} onChange={e => setSoloAttivi(e.target.checked)} className="accent-oro" />
        Solo attivi
      </label>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-slate border border-white/5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Prodotto', 'Tipo', 'Posti', 'Crediti AI', 'Banca dati', 'Monetizzazione', 'Prezzo', 'Durata', '% Revenue', 'Stato', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">
                    Nessun prodotto trovato
                  </td>
                </tr>
              ) : rows.map(p => {
                const tc = TIPO_CONFIG[p.tipo] ?? TIPO_CONFIG.abbonamento
                const isAbb = p.tipo === 'abbonamento'
                return (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                    <td className="px-4 py-3 font-body text-sm font-medium text-nebbia">{p.nome}</td>
                    <td className="px-4 py-3"><Badge label={tc.label} variant={tc.variant} /></td>
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                      {(p.tipo === 'accesso_singolo' || p.tipo === 'crediti_ai') ? <Dash /> : p.posti === null ? 'illim.' : p.posti}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                      {p.crediti_ai_mensili > 0 ? p.crediti_ai_mensili : <Dash />}
                    </td>
                    <td className="px-4 py-3">
                      {isAbb
                        ? <Badge label={p.include_banca_dati ? 'Sì' : 'No'} variant={p.include_banca_dati ? 'salvia' : 'gray'} />
                        : <Dash />}
                    </td>
                    <td className="px-4 py-3">
                      {isAbb
                        ? <Badge label={p.include_monetizzazione ? 'Sì' : 'No'} variant={p.include_monetizzazione ? 'salvia' : 'gray'} />
                        : <Dash />}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-oro font-medium">EUR {p.prezzo}</td>
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                      {p.durata_mesi ? `${p.durata_mesi} mesi` : <Dash />}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                      {p.revenue_pct ? `${p.revenue_pct}%` : <Dash />}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={p.attivo ? 'Attivo' : 'Inattivo'} variant={p.attivo ? 'salvia' : 'gray'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/prodotti/${p.id}`} className="font-body text-xs text-oro hover:text-oro/70">
                        Modifica
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
// FORM PRODOTTO
// ─────────────────────────────────────────────────────────────
export function AdminProdottiForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id && id !== 'nuovo'

  const [form, setForm] = useState({
    nome: '', tipo: 'abbonamento', prezzo: '',
    posti: '1', durata_mesi: '12',
    include_banca_dati: false, include_monetizzazione: false,
    revenue_pct: '', crediti_ai_mensili: '0', solo_lex_user: false, attivo: true,
  })
  const [loading, setLoading] = useState(isEdit)
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')
  const [success, setSuccess] = useState(false)

  const f = k => ({
    value: form[k] ?? '',
    onChange: e => setForm(p => ({ ...p, [k]: e.target.value }))
  })

  const isAbb = form.tipo === 'abbonamento'
  const isAddon = form.tipo === 'seat_addon'
  const isAccesso = form.tipo === 'accesso_singolo'
  const isCreditiAI = form.tipo === 'crediti_ai'
  const isGratuito = form.tipo === 'gratuito'

  // Quanti posti ha il prodotto
  const postiNum = parseInt(form.posti) || 0
  const isSingolo = isAbb && postiNum === 1
  const isStudio = isAbb && postiNum > 1

  useEffect(() => {
    if (!isEdit) return
    async function carica() {
      const { data } = await supabase.from('prodotti').select('*').eq('id', id).single()
      if (data) setForm({
        nome: data.nome,
        tipo: data.tipo,
        prezzo: data.prezzo,
        posti: data.posti ?? '1',
        durata_mesi: data.durata_mesi ?? '',
        include_banca_dati: data.include_banca_dati,
        include_monetizzazione: data.include_monetizzazione,
        revenue_pct: data.revenue_pct ?? '',
        crediti_ai_mensili: data.crediti_ai_mensili ?? '0',
        solo_lex_user: data.solo_lex_user ?? false,
        attivo: data.attivo,
      })
      setLoading(false)
    }
    carica()
  }, [id])

  async function handleSalva() {
    setErrore('')

    if (!form.nome.trim()) return setErrore('Il nome è obbligatorio')
    if (!isGratuito && (!form.prezzo || isNaN(parseFloat(form.prezzo)))) return setErrore('Il prezzo è obbligatorio')
    if ((isAbb || isGratuito) && (!form.posti || parseInt(form.posti) < 1)) return setErrore('I posti devono essere almeno 1')
    if ((isAbb || isGratuito) && (!form.durata_mesi || parseInt(form.durata_mesi) < 1)) return setErrore('La durata è obbligatoria')
    if (isAccesso && (!form.revenue_pct || isNaN(parseInt(form.revenue_pct)))) return setErrore('La % revenue è obbligatoria')

    setSalvando(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        prezzo: isGratuito ? 0 : parseFloat(form.prezzo),
        posti: (isAbb || isAddon || isGratuito) ? parseInt(form.posti) : null,
        durata_mesi: (isAbb || isGratuito) ? parseInt(form.durata_mesi) || null : null,
        include_banca_dati: (isAbb || isGratuito) ? form.include_banca_dati : false,
        include_monetizzazione: (isAbb || isGratuito) ? form.include_monetizzazione : false,
        revenue_pct: isAccesso ? parseInt(form.revenue_pct) : null,
        crediti_ai_mensili: (isAbb || isCreditiAI || isGratuito) ? parseInt(form.crediti_ai_mensili) || 0 : 0,
        solo_lex_user: isCreditiAI ? form.solo_lex_user : false,
        attivo: form.attivo,
      }

      if (isEdit) {
        const { error } = await supabase.from('prodotti').update(payload).eq('id', id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('prodotti').insert(payload)
        if (error) throw new Error(error.message)
      }

      setSuccess(true)
      setTimeout(() => navigate('/admin/prodotti'), 1500)
    } catch (err) {
      setErrore(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const TIPI = [
    { v: 'abbonamento', l: 'Abbonamento', desc: 'Piano per avvocato o studio — posti determina il tipo' },
    { v: 'seat_addon', l: 'Seat add-on', desc: 'Aggiunge posti a uno studio esistente' },
    { v: 'accesso_singolo', l: 'Accesso singolo', desc: 'Acquisto di una singola sentenza dalla banca dati' },
    { v: 'crediti_ai', l: 'Crediti AI', desc: 'Pacchetto crediti AI acquistabili separatamente' },
    { v: 'gratuito', l: 'Gratuito', desc: 'Prova gratuita a tempo limitato — attivabile una sola volta per avvocato' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="space-y-5">
        <BackButton to="/admin/prodotti" label="Tutti i prodotti" />
        <div className="bg-slate border border-white/5 p-10 flex flex-col items-center text-center gap-4">
          <CheckCircle size={40} className="text-salvia" />
          <h2 className="font-display text-2xl text-nebbia">
            {isEdit ? 'Prodotto aggiornato' : 'Prodotto creato'}
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackButton to="/admin/prodotti" label="Tutti i prodotti" />
      <PageHeader label="Admin" title={isEdit ? 'Modifica prodotto' : 'Nuovo prodotto'} />

      <div className="bg-slate border border-white/5 p-6 space-y-6 max-w-2xl">

        {/* Nome */}
        <div>
          <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Nome prodotto *</label>
          <input {...f('nome')} placeholder="Es. Abbonamento Annuale Pro"
            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
        </div>

        {/* Tipo */}
        <div>
          <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-3">Tipo *</label>
          <div className="space-y-2">
            {TIPI.map(({ v, l, desc }) => (
              <button key={v} type="button" onClick={() => setForm(p => ({ ...p, tipo: v }))}
                className={`w-full p-3 text-left border transition-all ${form.tipo === v ? 'bg-oro/10 border-oro/40 text-oro' : 'text-nebbia/50 border-white/10 hover:border-oro/20'}`}>
                <p className="font-body text-sm font-medium">{l}</p>
                <p className={`font-body text-xs mt-0.5 ${form.tipo === v ? 'text-oro/60' : 'text-nebbia/25'}`}>{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Posti — per abbonamento e seat addon */}
        {(isAbb || isAddon || isGratuito) && (
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
              {isAddon ? 'Posti aggiuntivi *' : 'Numero di posti *'}
            </label>
            <input type="number" min="1" {...f('posti')} placeholder="1"
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />

            {/* Info automatica in base ai posti */}
            {isAbb && postiNum > 0 && (
              <div className={`mt-2 p-3 border flex items-center gap-2 ${isSingolo ? 'bg-oro/5 border-oro/15' : 'bg-salvia/5 border-salvia/15'}`}>
                <Info size={13} className={isSingolo ? 'text-oro/60' : 'text-salvia/60'} />
                <p className={`font-body text-xs ${isSingolo ? 'text-oro/70' : 'text-salvia/70'}`}>
                  {isSingolo
                    ? 'Con 1 posto → avvocato singolo. Nessun pannello studio.'
                    : `Con ${postiNum} posti → chi acquista diventa titolare dello studio e può invitare ${postiNum - 1} colleghi.`
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Prezzo */}
        {!isGratuito && (
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Prezzo (EUR) *</label>
            <input type="number" step="0.01" min="0" {...f('prezzo')} placeholder="499"
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
          </div>
        )}

        {/* Durata — solo abbonamento */}
        {(isAbb || isGratuito) && (
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Durata *</label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[['6', '6 mesi'], ['12', '12 mesi']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setForm(p => ({ ...p, durata_mesi: v }))}
                  className={`py-3 px-4 text-left border transition-all ${String(form.durata_mesi) === v ? 'bg-oro/10 border-oro/40 text-oro' : 'text-nebbia/50 border-white/10 hover:border-oro/20'}`}>
                  <p className="font-body text-sm font-medium">{l}</p>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-nebbia/30">Oppure inserisci:</span>
              <input type="number" min="1" {...f('durata_mesi')} placeholder="es. 24"
                className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-1.5 outline-none focus:border-oro/50 w-24 placeholder:text-nebbia/25" />
              <span className="font-body text-xs text-nebbia/30">mesi</span>
            </div>
          </div>
        )}

        {/* Banca dati — solo abbonamento */}
        {(isAbb || isGratuito) && (
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-3">Banca dati sentenze *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: false, l: 'Non inclusa', desc: 'Solo gestionale — clienti, pratiche, documenti, pagamenti' },
                { v: true, l: 'Inclusa', desc: 'Gestionale + accesso alle sentenze caricate da altri avvocati' },
              ].map(({ v, l, desc }) => (
                <button key={l} type="button" onClick={() => setForm(p => ({ ...p, include_banca_dati: v }))}
                  className={`p-3 text-left border transition-all ${form.include_banca_dati === v ? 'bg-oro/10 border-oro/40 text-oro' : 'text-nebbia/50 border-white/10 hover:border-oro/20'}`}>
                  <p className="font-body text-sm font-medium">{l}</p>
                  <p className={`font-body text-xs mt-0.5 ${form.include_banca_dati === v ? 'text-oro/60' : 'text-nebbia/25'}`}>{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Monetizzazione — solo abbonamento */}
        {(isAbb || isGratuito) && (
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-3">Monetizzazione sentenze *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: false, l: 'Non inclusa', desc: "L'avvocato non può caricare sentenze né guadagnare" },
                { v: true, l: 'Inclusa', desc: "L'avvocato può caricare sentenze e ricevere compensi" },
              ].map(({ v, l, desc }) => (
                <button key={l} type="button" onClick={() => setForm(p => ({ ...p, include_monetizzazione: v }))}
                  className={`p-3 text-left border transition-all ${form.include_monetizzazione === v ? 'bg-salvia/10 border-salvia/40 text-salvia' : 'text-nebbia/50 border-white/10 hover:border-salvia/20'}`}>
                  <p className="font-body text-sm font-medium">{l}</p>
                  <p className={`font-body text-xs mt-0.5 ${form.include_monetizzazione === v ? 'text-salvia/60' : 'text-nebbia/25'}`}>{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* % Revenue — solo accesso singolo */}
        {isAccesso && (
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">% Revenue all'avvocato *</label>
            <input type="number" min="0" max="100" {...f('revenue_pct')} placeholder="60"
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
            {form.revenue_pct && (
              <p className="font-body text-xs text-nebbia/25 mt-1.5">
                Avvocato: {form.revenue_pct}% · Lexum: {100 - parseInt(form.revenue_pct)}%
              </p>
            )}
          </div>
        )}

        {/* Crediti AI — per abbonamento e crediti_ai */}
        {(isAbb || isCreditiAI || isGratuito) && (
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widests uppercase mb-2">
              Crediti AI {isAbb ? '/ mese inclusi' : 'nel pacchetto'} *
            </label>
            <input type="number" min="0" {...f('crediti_ai_mensili')} placeholder="100"
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
            <p className="font-body text-xs text-nebbia/25 mt-1.5">
              {isAbb
                ? 'Crediti AI inclusi ogni mese nel piano. 0 = nessun credito AI incluso.'
                : 'Numero di crediti AI che l\'utente riceve con questo acquisto.'
              }
            </p>
          </div>
        )}

        {/* Seat addon info */}
        {isAddon && (
          <div className="bg-petrolio/50 border border-white/5 p-4">
            <p className="font-body text-xs text-nebbia/40 leading-relaxed">
              Il seat add-on aggiunge posti a uno studio esistente. La validità segue la scadenza del piano base.
            </p>
          </div>
        )}

        {/* Solo lex_user */}
        {isCreditiAI && (
          <div className="flex items-center gap-3 p-4 bg-petrolio/40 border border-white/5">
            <input
              type="checkbox"
              id="solo_lex_user"
              checked={form.solo_lex_user ?? false}
              onChange={e => setForm(p => ({ ...p, solo_lex_user: e.target.checked }))}
              className="accent-salvia w-4 h-4"
            />
            <label htmlFor="solo_lex_user" className="font-body text-sm text-nebbia/70 cursor-pointer">
              Visibile solo agli utenti Lex AI — non agli avvocati
            </label>
          </div>
        )}

        {/* Attivo */}
        <div className="flex items-center gap-3 p-4 bg-petrolio/40 border border-white/5">
          <input type="checkbox" id="attivo" checked={form.attivo}
            onChange={e => setForm(p => ({ ...p, attivo: e.target.checked }))}
            className="accent-oro w-4 h-4" />
          <label htmlFor="attivo" className="font-body text-sm text-nebbia/70 cursor-pointer">
            Prodotto attivo — visibile agli utenti in fase di acquisto
          </label>
        </div>

        {errore && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
            <AlertCircle size={14} /> {errore}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => navigate('/admin/prodotti')} className="btn-secondary text-sm flex-1">Annulla</button>
          <button onClick={handleSalva} disabled={salvando} className="btn-primary text-sm flex-1 justify-center">
            {salvando
              ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
              : isEdit ? 'Salva modifiche' : 'Crea prodotto'
            }
          </button>
        </div>
      </div>
    </div>
  )
}