// src/pages/admin/UtentiQuestionari.jsx
//
// La scheda "Questionari" dentro Utenti. Tre pannelli:
//   · Risposte   — chi ha risposto e cosa ha scritto, per intero
//   · Riepilogo  — le distribuzioni, per chi vuole il colpo d'occhio
//   · Domande    — aggiungi, correggi, riordina, disattiva
//
// L'invio delle mail NON passa da qui: i collegamenti si generano e si copiano,
// e la posta la manda l'utente a mano dal proprio client.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Link2, Copy, Check, RefreshCw, ChevronDown, ChevronRight, Plus,
  Loader2, AlertCircle, Download, EyeOff, Eye, GripVertical,
} from 'lucide-react'

const CODICE = 'feedback_uso_2026'

const TIPI = {
  scelta_singola:  'Scelta singola',
  scelta_multipla: 'Scelta multipla',
  scala_1_5:       'Scala 1-5',
  si_no:           'Sì / No',
  testo_libero:    'Testo libero',
}

const data = (iso) => iso ? new Date(iso).toLocaleDateString('it-IT',
  { day: '2-digit', month: 'short', year: '2-digit' }) : '—'

// ─────────────────────────────────────────────────────────────
// Pannello 1 — Le risposte, una per una
// ─────────────────────────────────────────────────────────────
function Risposte({ righe, caricando }) {
  const [aperta, setAperta] = useState(null)

  if (caricando) return <div className="p-10 text-center"><Loader2 className="animate-spin inline text-oro" /></div>
  if (!righe.length) return (
    <div className="p-10 text-center">
      <p className="font-body text-sm text-nebbia/40">Nessuna risposta ancora.</p>
      <p className="font-body text-xs text-nebbia/25 mt-1.5">
        Genera i collegamenti nel pannello «Collegamenti» e invia le mail.
      </p>
    </div>
  )

  return (
    <div>
      {righe.map(r => {
        const aperto = aperta === r.compilazione_id
        const nome = [r.nome, r.cognome].filter(Boolean).join(' ') || '(profilo cancellato)'
        return (
          <div key={r.compilazione_id} className="border-b border-white/5">
            <button onClick={() => setAperta(aperto ? null : r.compilazione_id)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] text-left">
              {aperto ? <ChevronDown size={14} className="text-oro shrink-0" />
                      : <ChevronRight size={14} className="text-nebbia/25 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm text-nebbia truncate">{nome}</p>
                <p className="font-body text-xs text-nebbia/30 truncate">{r.email ?? '—'}</p>
              </div>
              <span className="font-body text-xs text-nebbia/30 shrink-0">{data(r.inviata_il)}</span>
            </button>

            {aperto && (
              <div className="px-4 pb-4 pl-11 space-y-3">
                {(r.risposte ?? []).map((x, i) => (
                  <div key={i}>
                    <p className="font-body text-[11px] text-nebbia/30 mb-1">{x.domanda}</p>
                    {x.testo ? (
                      <p className="font-body text-sm text-nebbia leading-relaxed
                                    border-l-2 border-oro/30 pl-3 whitespace-pre-wrap">{x.testo}</p>
                    ) : x.num !== null && x.num !== undefined ? (
                      <p className="font-body text-sm text-oro">{x.num} / 5</p>
                    ) : (
                      <p className="font-body text-sm text-nebbia/80">
                        {(x.opzioni ?? []).join('  ·  ') || '—'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Pannello 2 — Il riepilogo
// ─────────────────────────────────────────────────────────────
function Riepilogo({ righe, nRisposte, caricando }) {
  if (caricando) return <div className="p-10 text-center"><Loader2 className="animate-spin inline text-oro" /></div>
  if (!nRisposte) return <div className="p-10 text-center font-body text-sm text-nebbia/40">Nessuna risposta ancora.</div>

  const perDomanda = {}
  for (const r of righe) {
    if (!r.opzione) continue
    ;(perDomanda[r.domanda_id] ??= { testo: r.domanda_testo, tipo: r.tipo, voci: [] })
      .voci.push(r)
  }

  return (
    <div className="p-4 space-y-6">
      <p className="font-body text-xs text-nebbia/35">
        {nRisposte} {nRisposte === 1 ? 'risposta' : 'risposte'}. Le percentuali sono sul totale
        di chi ha risposto a quella domanda.
      </p>
      {Object.entries(perDomanda).map(([id, d]) => {
        const tot = d.voci.reduce((s, v) => s + Number(v.conteggio), 0)
        return (
          <div key={id}>
            <p className="font-body text-sm text-nebbia mb-2.5">{d.testo}</p>
            <div className="space-y-1.5">
              {d.voci.sort((a, b) => Number(b.conteggio) - Number(a.conteggio)).map((v, i) => {
                const pct = tot ? Math.round(Number(v.conteggio) / tot * 100) : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-52 shrink-0 font-body text-xs text-nebbia/60 truncate"
                         title={v.opzione_etichetta}>{v.opzione_etichetta}</div>
                    <div className="flex-1 h-4 bg-white/5 min-w-0">
                      <div className="h-full bg-oro/50" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-16 shrink-0 font-body text-xs text-nebbia/40 text-right">
                      {v.conteggio} · {pct}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Pannello 3 — I collegamenti (si generano e si copiano, non si spediscono)
// ─────────────────────────────────────────────────────────────
function Collegamenti({ onMessaggio }) {
  const [dest, setDest] = useState([])
  const [caricando, setCaricando] = useState(true)
  const [scelti, setScelti] = useState(new Set())
  const [filtro, setFiltro] = useState('ha_usato')
  const [generati, setGenerati] = useState(null)
  const [lavoro, setLavoro] = useState(false)
  const [copiato, setCopiato] = useState(false)

  const carica = useCallback(async () => {
    setCaricando(true)
    const { data, error } = await supabase.rpc('questionario_destinatari', { p_codice: CODICE })
    if (error) onMessaggio('errore', error.message)
    setDest(data ?? []); setCaricando(false)
  }, [onMessaggio])

  useEffect(() => { carica() }, [carica])

  const visibili = dest.filter(d =>
    filtro === 'tutti' ? true :
    filtro === 'ha_usato' ? d.ha_usato :
    filtro === 'mai_usato' ? !d.ha_usato :
    filtro === 'non_risposto' ? (d.ha_usato && !d.risposto_il) : true)

  async function genera() {
    if (!scelti.size) return
    setLavoro(true)
    const { data, error } = await supabase.rpc('questionario_crea_inviti', {
      p_codice: CODICE, p_user_ids: [...scelti],
    })
    setLavoro(false)
    if (error) return onMessaggio('errore', error.message)
    setGenerati(data ?? [])
    onMessaggio('ok', `${data?.length ?? 0} collegamenti generati. I precedenti di queste persone non valgono più.`)
    carica()
  }

  function copiaTutto() {
    const t = (generati ?? []).map(g =>
      `${[g.nome, g.cognome].filter(Boolean).join(' ')}\t${g.email}\thttps://www.lexum.it/questionario/${g.token}`
    ).join('\n')
    navigator.clipboard.writeText(t).then(() => {
      setCopiato(true); setTimeout(() => setCopiato(false), 2000)
    }).catch(() => onMessaggio('errore', 'Il browser non ha permesso la copia.'))
  }

  function scaricaCsv() {
    const righe = [['nome', 'email', 'collegamento personale'],
      ...(generati ?? []).map(g => [
        [g.nome, g.cognome].filter(Boolean).join(' '), g.email,
        `https://www.lexum.it/questionario/${g.token}`])]
    const csv = righe.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'collegamenti-questionario.csv'
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  if (caricando) return <div className="p-10 text-center"><Loader2 className="animate-spin inline text-oro" /></div>

  return (
    <div className="p-4 space-y-4">
      <div className="p-3 border border-white/8 bg-white/[0.02]">
        <p className="font-body text-xs text-nebbia/45 leading-relaxed">
          Ogni collegamento è <strong className="text-nebbia/70">personale</strong>: serve a sapere
          chi ha risposto. Generarne uno nuovo per la stessa persona invalida il precedente.
          Da qui non parte nessuna email: copi i collegamenti e li invii dal tuo client.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[['ha_usato', 'Ha usato Lexum'], ['non_risposto', 'Non ha ancora risposto'],
          ['mai_usato', 'Non ha mai usato Lexum'], ['tutti', 'Tutti']].map(([id, l]) => (
          <button key={id} onClick={() => { setFiltro(id); setScelti(new Set()) }}
            className={`px-3 py-1.5 border font-body text-xs transition-colors ${
              filtro === id ? 'border-oro/50 bg-oro/10 text-oro'
                            : 'border-white/8 text-nebbia/45 hover:text-nebbia'}`}>{l}</button>
        ))}
        <span className="font-body text-xs text-nebbia/30 ml-auto">
          {visibili.length} persone · {scelti.size} selezionate
        </span>
      </div>

      <div className="border border-white/8 max-h-96 overflow-y-auto">
        <div className="px-3 py-2 border-b border-white/8 bg-white/[0.02] sticky top-0">
          <label className="flex items-center gap-2 font-body text-xs text-nebbia/50 cursor-pointer">
            <input type="checkbox" className="accent-oro"
              checked={visibili.length > 0 && scelti.size === visibili.length}
              onChange={e => setScelti(e.target.checked ? new Set(visibili.map(v => v.user_id)) : new Set())} />
            Seleziona tutti
          </label>
        </div>
        {visibili.map(d => (
          <label key={d.user_id}
            className="flex items-center gap-3 px-3 py-2 border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer">
            <input type="checkbox" className="accent-oro shrink-0" checked={scelti.has(d.user_id)}
              onChange={e => setScelti(s => {
                const n = new Set(s); e.target.checked ? n.add(d.user_id) : n.delete(d.user_id); return n
              })} />
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm text-nebbia truncate">
                {[d.nome, d.cognome].filter(Boolean).join(' ') || '(senza nome)'}
              </p>
              <p className="font-body text-xs text-nebbia/28 truncate">{d.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-body text-[10px]">
              {d.risposto_il  && <span className="text-salvia">ha risposto</span>}
              {!d.risposto_il && d.invitato_il && <span className="text-amber-400/70">invitato</span>}
              {!d.ha_usato && <span className="text-nebbia/25">mai usato</span>}
            </div>
          </label>
        ))}
        {!visibili.length && <p className="p-6 text-center font-body text-xs text-nebbia/25">Nessuno.</p>}
      </div>

      <button onClick={genera} disabled={!scelti.size || lavoro}
        className="flex items-center gap-2 px-5 py-2.5 bg-oro/15 border border-oro/40 text-oro
                   font-body text-sm hover:bg-oro/25 disabled:opacity-35 transition-colors">
        {lavoro ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
        Genera {scelti.size > 0 ? scelti.size : ''} collegamenti
      </button>

      {generati && generati.length > 0 && (
        <div className="border border-oro/25 bg-oro/[0.04]">
          <div className="px-3 py-2.5 border-b border-oro/15 flex items-center justify-between gap-3">
            <p className="font-body text-xs text-oro">
              {generati.length} collegamenti — copiali adesso, non si potranno rivedere
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={copiaTutto} className="flex items-center gap-1.5 px-2.5 py-1.5
                       border border-oro/30 font-body text-[11px] text-oro hover:bg-oro/10">
                {copiato ? <><Check size={11} /> Copiato</> : <><Copy size={11} /> Copia</>}
              </button>
              <button onClick={scaricaCsv} className="flex items-center gap-1.5 px-2.5 py-1.5
                       border border-oro/30 font-body text-[11px] text-oro hover:bg-oro/10">
                <Download size={11} /> CSV
              </button>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-3 space-y-2">
            {generati.map(g => (
              <div key={g.user_id} className="font-mono text-[10px] text-nebbia/55 break-all">
                <span className="text-nebbia/80">{[g.nome, g.cognome].filter(Boolean).join(' ')}</span>
                {' · '}{g.email}<br />
                https://www.lexum.it/questionario/{g.token}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Pannello 4 — L'editor delle domande
// ─────────────────────────────────────────────────────────────
function Domande({ onMessaggio }) {
  const [dom, setDom] = useState([])
  const [caricando, setCaricando] = useState(true)
  const [modifica, setModifica] = useState(null)

  const carica = useCallback(async () => {
    setCaricando(true)
    const { data, error } = await supabase
      .from('questionario_domanda').select('*').order('ordine')
    if (error) onMessaggio('errore', error.message)
    setDom(data ?? []); setCaricando(false)
  }, [onMessaggio])

  useEffect(() => { carica() }, [carica])

  async function salva(d) {
    const { error } = await supabase.from('questionario_domanda')
      .update({ testo: d.testo, aiuto: d.aiuto, opzioni: d.opzioni, ordine: d.ordine,
                obbligatoria: d.obbligatoria, max_selezioni: d.max_selezioni })
      .eq('id', d.id)
    if (error) return onMessaggio('errore', error.message)
    onMessaggio('ok', 'Domanda aggiornata.')
    setModifica(null); carica()
  }

  async function commutaAttiva(d) {
    const { error } = await supabase.from('questionario_domanda')
      .update({ attiva: !d.attiva }).eq('id', d.id)
    if (error) return onMessaggio('errore', error.message)
    carica()
  }

  async function elimina(d) {
    if (!window.confirm(
      `Eliminare "${d.testo?.it}"?\n\nSe qualcuno ha già risposto, il database rifiuterà: ` +
      `in quel caso disattivala invece di eliminarla, così le risposte restano leggibili.`)) return
    const { error } = await supabase.from('questionario_domanda').delete().eq('id', d.id)
    if (error) {
      return onMessaggio('errore', error.code === '23503'
        ? 'Non si può eliminare: ci sono già delle risposte. Disattivala invece.'
        : error.message)
    }
    onMessaggio('ok', 'Domanda eliminata.'); carica()
  }

  async function aggiungi() {
    const { data: q } = await supabase.from('questionario').select('id').eq('codice', CODICE).single()
    const n = Math.max(0, ...dom.map(d => d.ordine)) + 10
    const { error } = await supabase.from('questionario_domanda').insert({
      questionario_id: q.id, codice: `domanda_${Date.now().toString(36)}`,
      ordine: n, tipo: 'testo_libero',
      testo: { it: 'Nuova domanda — scrivi qui il testo' },
      opzioni: [], obbligatoria: false,
    })
    if (error) return onMessaggio('errore', error.message)
    onMessaggio('ok', 'Domanda aggiunta in fondo.'); carica()
  }

  if (caricando) return <div className="p-10 text-center"><Loader2 className="animate-spin inline text-oro" /></div>

  return (
    <div className="p-4 space-y-3">
      <div className="p-3 border border-white/8 bg-white/[0.02]">
        <p className="font-body text-xs text-nebbia/45 leading-relaxed">
          Il <strong className="text-nebbia/70">testo</strong> di una domanda si può correggere
          sempre: le risposte già raccolte conservano una copia di quello che la persona ha
          letto davvero. Il <strong className="text-nebbia/70">tipo</strong>, invece, si congela
          appena arriva la prima risposta. Una domanda con risposte non si può eliminare:
          si disattiva, e sparisce dal questionario senza portarsi via i dati.
        </p>
      </div>

      {dom.map(d => (
        <div key={d.id} className={`border p-4 ${d.attiva ? 'border-white/8' : 'border-white/5 opacity-45'}`}>
          {modifica === d.id ? (
            <FormDomanda d={d} onSalva={salva} onAnnulla={() => setModifica(null)} />
          ) : (
            <>
              <div className="flex items-start gap-3">
                <GripVertical size={13} className="text-nebbia/15 mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm text-nebbia">{d.testo?.it}</p>
                  {d.aiuto?.it && <p className="font-body text-xs text-nebbia/30 mt-1">{d.aiuto.it}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-2 font-body text-[10px] text-nebbia/30">
                    <span className="px-1.5 py-0.5 border border-white/8">{TIPI[d.tipo] ?? d.tipo}</span>
                    {d.obbligatoria && <span className="text-oro/60">obbligatoria</span>}
                    {d.max_selezioni && <span>max {d.max_selezioni} scelte</span>}
                    {(d.opzioni?.length > 0) && <span>{d.opzioni.length} opzioni</span>}
                    <span>ordine {d.ordine}</span>
                    {d.versione > 1 && <span>versione {d.versione}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setModifica(d.id)}
                    className="px-2 py-1 font-body text-[11px] text-nebbia/45 hover:text-oro">modifica</button>
                  <button onClick={() => commutaAttiva(d)} title={d.attiva ? 'disattiva' : 'riattiva'}
                    className="p-1.5 text-nebbia/30 hover:text-nebbia">
                    {d.attiva ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  <button onClick={() => elimina(d)}
                    className="px-2 py-1 font-body text-[11px] text-nebbia/25 hover:text-red-400">elimina</button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      <button onClick={aggiungi}
        className="flex items-center gap-2 px-4 py-2.5 border border-white/10 text-nebbia/55
                   font-body text-sm hover:border-oro/30 hover:text-oro transition-colors">
        <Plus size={14} /> Aggiungi una domanda
      </button>
    </div>
  )
}

function FormDomanda({ d, onSalva, onAnnulla }) {
  const [testo, setTesto] = useState(d.testo?.it ?? '')
  const [aiuto, setAiuto] = useState(d.aiuto?.it ?? '')
  const [ordine, setOrdine] = useState(d.ordine)
  const [obbl, setObbl] = useState(d.obbligatoria)
  const [maxSel, setMaxSel] = useState(d.max_selezioni ?? '')
  const [opz, setOpz] = useState((d.opzioni ?? []).map(o => `${o.codice} | ${o.it}`).join('\n'))

  const conOpzioni = ['scelta_singola', 'scelta_multipla', 'si_no'].includes(d.tipo)

  function salva() {
    const opzioni = conOpzioni
      ? opz.split('\n').map(r => r.trim()).filter(Boolean).map(r => {
          const [c, ...resto] = r.split('|')
          return { codice: c.trim(), it: resto.join('|').trim() || c.trim() }
        })
      : []
    onSalva({
      id: d.id,
      testo: { it: testo },
      aiuto: aiuto ? { it: aiuto } : null,
      opzioni, ordine: Number(ordine) || 0, obbligatoria: obbl,
      max_selezioni: maxSel === '' ? null : Number(maxSel),
    })
  }

  return (
    <div className="space-y-3">
      <textarea value={testo} onChange={e => setTesto(e.target.value)} rows={2}
        className="w-full bg-petrolio/60 border border-white/10 px-3 py-2 font-body text-sm text-nebbia
                   focus:border-oro/40 outline-none" placeholder="Il testo della domanda" />
      <input value={aiuto} onChange={e => setAiuto(e.target.value)}
        className="w-full bg-petrolio/60 border border-white/10 px-3 py-2 font-body text-xs text-nebbia/70
                   focus:border-oro/40 outline-none" placeholder="Riga d'aiuto sotto la domanda (facoltativa)" />

      {conOpzioni && (
        <div>
          <p className="font-body text-[11px] text-nebbia/35 mb-1.5">
            Le opzioni, una per riga, nella forma <code className="text-nebbia/55">codice | etichetta</code>.
            Il codice è l'identità: cambiando l'etichetta non si perde nulla, cambiando il codice sì.
          </p>
          <textarea value={opz} onChange={e => setOpz(e.target.value)} rows={5}
            className="w-full bg-petrolio/60 border border-white/10 px-3 py-2 font-mono text-xs
                       text-nebbia focus:border-oro/40 outline-none" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 font-body text-xs text-nebbia/55">
          ordine
          <input type="number" value={ordine} onChange={e => setOrdine(e.target.value)}
            className="w-20 bg-petrolio/60 border border-white/10 px-2 py-1 text-nebbia outline-none focus:border-oro/40" />
        </label>
        {d.tipo === 'scelta_multipla' && (
          <label className="flex items-center gap-2 font-body text-xs text-nebbia/55">
            max scelte
            <input type="number" value={maxSel} onChange={e => setMaxSel(e.target.value)}
              className="w-20 bg-petrolio/60 border border-white/10 px-2 py-1 text-nebbia outline-none focus:border-oro/40" />
          </label>
        )}
        <label className="flex items-center gap-2 font-body text-xs text-nebbia/55 cursor-pointer">
          <input type="checkbox" checked={obbl} onChange={e => setObbl(e.target.checked)} className="accent-oro" />
          obbligatoria
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={salva}
          className="px-4 py-2 bg-oro/15 border border-oro/40 text-oro font-body text-xs hover:bg-oro/25">Salva</button>
        <button onClick={onAnnulla}
          className="px-4 py-2 font-body text-xs text-nebbia/35 hover:text-nebbia">Annulla</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// La scheda
// ─────────────────────────────────────────────────────────────
export default function UtentiQuestionari() {
  const [pannello, setPannello] = useState('risposte')
  const [singole, setSingole] = useState([])
  const [aggregato, setAggregato] = useState([])
  const [caricando, setCaricando] = useState(true)
  const [avviso, setAvviso] = useState(null)

  const messaggio = useCallback((tipo, testo) => {
    setAvviso({ tipo, testo })
    if (tipo !== 'errore') setTimeout(() => setAvviso(null), 4000)
  }, [])

  const carica = useCallback(async () => {
    setCaricando(true)
    const [s, a] = await Promise.all([
      supabase.rpc('questionario_risposte_singole', { p_codice: CODICE }),
      supabase.rpc('questionario_risultati', { p_codice: CODICE }),
    ])
    if (s.error) messaggio('errore', s.error.message)
    setSingole(s.data ?? []); setAggregato(a.data ?? [])
    setCaricando(false)
  }, [messaggio])

  useEffect(() => { carica() }, [carica])

  const PANNELLI = [
    ['risposte',     `Risposte${singole.length ? ` (${singole.length})` : ''}`],
    ['riepilogo',    'Riepilogo'],
    ['collegamenti', 'Collegamenti'],
    ['domande',      'Domande'],
  ]

  return (
    <div className="space-y-4">
      {avviso && (
        <div className={`p-3 border font-body text-xs flex items-start gap-2 ${
          avviso.tipo === 'errore' ? 'bg-red-900/10 border-red-500/25 text-red-300'
                                   : 'bg-salvia/10 border-salvia/25 text-salvia'}`}>
          {avviso.tipo === 'errore' ? <AlertCircle size={13} className="shrink-0 mt-0.5" />
                                    : <Check size={13} className="shrink-0 mt-0.5" />}
          <span>{avviso.testo}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1">
          {PANNELLI.map(([id, l]) => (
            <button key={id} onClick={() => setPannello(id)}
              className={`px-3.5 py-2 font-body text-xs border transition-colors ${
                pannello === id ? 'border-oro/45 bg-oro/10 text-oro'
                                : 'border-white/8 text-nebbia/45 hover:text-nebbia'}`}>{l}</button>
          ))}
        </div>
        <button onClick={carica} disabled={caricando}
          className="flex items-center gap-1.5 font-body text-xs text-nebbia/35 hover:text-nebbia">
          <RefreshCw size={12} className={caricando ? 'animate-spin' : ''} /> aggiorna
        </button>
      </div>

      <div className="bg-slate border border-white/5">
        {pannello === 'risposte'     && <Risposte righe={singole} caricando={caricando} />}
        {pannello === 'riepilogo'    && <Riepilogo righe={aggregato} nRisposte={singole.length} caricando={caricando} />}
        {pannello === 'collegamenti' && <Collegamenti onMessaggio={messaggio} />}
        {pannello === 'domande'      && <Domande onMessaggio={messaggio} />}
      </div>
    </div>
  )
}
