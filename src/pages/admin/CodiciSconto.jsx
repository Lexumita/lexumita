// src/pages/admin/CodiciSconto.jsx
// Codici sconto (28-10-2026): l'admin li crea con la percentuale e le condizioni, li manda a chi vuole e
// vede chi li ha usati. Chi compra scrive il codice alla cassa (src/components/CodiceSconto.jsx); il prezzo
// lo decide il server (tagada-checkout), che riverifica il codice. Un uso conta a pagamento fatto e si
// annulla con un rimborso (trigger su tagada_ordini, migrazione 20261028_codici_sconto.sql).

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader, Badge, EmptyState } from '@/components/shared'
import { supabase } from '@/lib/supabase'
import { formatImporto } from '@/lib/prezzi'
import { Plus, Tag, X, AlertCircle, Copy, Check, Loader2 } from 'lucide-react'

const TIPI = [
  ['abbonamento', 'Abbonamenti professionisti'],
  ['piano_privato', 'Piano Personale'],
  ['crediti_ai', 'Pacchetti crediti'],
  ['seat_addon', 'Accessi in più'],
  ['spazio_archiviazione', 'Archivio in più'],
  ['clienti_addon', 'Clienti in più'],
]
const NOME_TIPO = Object.fromEntries(TIPI)
const PER_CHI = { '': 'Tutti', privati: 'Solo privati', professionisti: 'Solo professionisti' }

const dataIt = (iso) => iso ? new Date(iso).toLocaleDateString('it-IT') : null
const giorno = (iso) => iso ? new Date(iso).toLocaleDateString('sv-SE') : ''   // AAAA-MM-GG nel fuso locale

function nuovoCodice() {
  const lettere = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const caso = crypto.getRandomValues(new Uint8Array(6))
  return 'LEXUM-' + Array.from(caso, n => lettere[n % lettere.length]).join('')
}

function statoDi(c, usati) {
  const ora = new Date()
  if (!c.attivo) return ['Spento', 'gray']
  if (c.valido_al && new Date(c.valido_al) < ora) return ['Scaduto', 'gray']
  if (c.valido_dal && new Date(c.valido_dal) > ora) return ['Non ancora valido', 'warning']
  if (c.usi_massimi && usati >= c.usi_massimi) return ['Esaurito', 'red']
  return ['Attivo', 'salvia']
}

const VUOTO = {
  codice: '', percentuale: '10', tipi: [], prodotto: '', per_chi: '', email: '',
  valido_dal: '', valido_al: '', usi_massimi: '', usi_per_persona: '1', note: '', attivo: true,
}

// ─────────────────────────────────────────────────────────────
// MODULO: nuovo codice o modifica
// ─────────────────────────────────────────────────────────────
function ModuloCodice({ codice, prodotti, onChiudi, onSalvato }) {
  const [f, setF] = useState(() => codice ? {
    codice: codice.codice,
    percentuale: String(codice.percentuale),
    tipi: codice.tipi ?? [],
    prodotto: codice.prodotti?.[0] ?? '',
    per_chi: codice.per_chi ?? '',
    email: codice.email ?? '',
    valido_dal: giorno(codice.valido_dal),
    valido_al: giorno(codice.valido_al),
    usi_massimi: codice.usi_massimi ?? '',
    usi_per_persona: codice.usi_per_persona ?? '',
    note: codice.note ?? '',
    attivo: codice.attivo,
  } : { ...VUOTO, codice: nuovoCodice() })
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')
  const imposta = (k, v) => setF(prec => ({ ...prec, [k]: v }))
  const prodottiScelti = prodotti.filter(p => !f.tipi.length || f.tipi.includes(p.tipo))

  async function salva() {
    setErrore('')
    const pct = Number(String(f.percentuale).replace(',', '.'))
    if (!/^[A-Z0-9][A-Z0-9-]{2,29}$/.test(f.codice.trim().toUpperCase())) return setErrore('Il codice va da 3 a 30 caratteri: lettere, numeri e trattini.')
    if (!(pct > 0 && pct < 100)) return setErrore('Lo sconto va da 1 a 99%.')
    if (f.valido_dal && f.valido_al && f.valido_al < f.valido_dal) return setErrore('La data di fine viene prima di quella di inizio.')
    const riga = {
      codice: f.codice.trim().toUpperCase(),
      percentuale: pct,
      tipi: f.tipi.length ? f.tipi : null,
      prodotti: f.prodotto ? [f.prodotto] : null,
      per_chi: f.per_chi || null,
      email: f.email.trim() || null,
      valido_dal: f.valido_dal ? new Date(`${f.valido_dal}T00:00:00`).toISOString() : null,
      valido_al: f.valido_al ? new Date(`${f.valido_al}T23:59:59`).toISOString() : null,
      usi_massimi: f.usi_massimi ? Number(f.usi_massimi) : null,
      usi_per_persona: f.usi_per_persona ? Number(f.usi_per_persona) : null,
      note: f.note,
      attivo: f.attivo,
    }
    setSalvando(true)
    const { error } = codice
      ? await supabase.from('codici_sconto').update(riga).eq('id', codice.id)
      : await supabase.from('codici_sconto').insert(riga)
    setSalvando(false)
    if (error) return setErrore(error.code === '23505' ? 'Esiste già un codice con questo nome.' : error.message)
    onSalvato()
  }

  const campo = 'w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25'
  const etichetta = 'block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2'

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm overflow-y-auto" onClick={onChiudi}>
      <div className="w-full max-w-2xl bg-slate border border-white/10 p-6 space-y-5 my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl font-light text-nebbia">{codice ? 'Modifica codice' : 'Nuovo codice sconto'}</p>
          <button onClick={onChiudi} className="text-nebbia/40 hover:text-nebbia"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={etichetta}>Codice</label>
            <div className="flex gap-2">
              <input value={f.codice} onChange={e => imposta('codice', e.target.value.toUpperCase())} maxLength={30}
                className={`${campo} tracking-wider uppercase`} />
              <button type="button" onClick={() => imposta('codice', nuovoCodice())} className="btn-secondary text-xs shrink-0">Genera</button>
            </div>
          </div>
          <div>
            <label className={etichetta}>Sconto %</label>
            <input value={f.percentuale} onChange={e => imposta('percentuale', e.target.value)} inputMode="decimal" className={campo} />
          </div>
        </div>

        <div>
          <label className={etichetta}>Vale per</label>
          <div className="flex flex-wrap gap-2">
            {TIPI.map(([k, nome]) => {
              const scelto = f.tipi.includes(k)
              return (
                <button key={k} type="button"
                  onClick={() => { imposta('tipi', scelto ? f.tipi.filter(t => t !== k) : [...f.tipi, k]); imposta('prodotto', '') }}
                  className={`px-3 py-1.5 border font-body text-xs transition-colors ${scelto ? 'border-oro/50 bg-oro/10 text-oro' : 'border-white/10 text-nebbia/50 hover:border-oro/30'}`}>
                  {nome}
                </button>
              )
            })}
          </div>
          <p className="font-body text-xs text-nebbia/30 mt-2">Nessuna scelta = vale per tutto.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={etichetta}>Solo questo prodotto</label>
            <select value={f.prodotto} onChange={e => imposta('prodotto', e.target.value)} className={campo}>
              <option value="">Tutti i prodotti scelti sopra</option>
              {prodottiScelti.map(p => <option key={p.id} value={p.id}>{p.nome} · {formatImporto(p.prezzo)}</option>)}
            </select>
          </div>
          <div>
            <label className={etichetta}>Per chi</label>
            <select value={f.per_chi} onChange={e => imposta('per_chi', e.target.value)} className={campo}>
              {Object.entries(PER_CHI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={etichetta}>Riservato a (email)</label>
          <input value={f.email} onChange={e => imposta('email', e.target.value)} type="email" placeholder="Vuoto = chiunque abbia il codice" className={campo} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={etichetta}>Valido dal</label>
            <input type="date" value={f.valido_dal} onChange={e => imposta('valido_dal', e.target.value)} className={campo} />
          </div>
          <div>
            <label className={etichetta}>Valido fino al</label>
            <input type="date" value={f.valido_al} onChange={e => imposta('valido_al', e.target.value)} className={campo} />
          </div>
          <div>
            <label className={etichetta}>Usi in tutto</label>
            <input value={f.usi_massimi} onChange={e => imposta('usi_massimi', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Vuoto = senza limite" className={campo} />
          </div>
          <div>
            <label className={etichetta}>Usi per persona</label>
            <input value={f.usi_per_persona} onChange={e => imposta('usi_per_persona', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Vuoto = senza limite" className={campo} />
          </div>
        </div>

        <div>
          <label className={etichetta}>Note (solo per te)</label>
          <textarea value={f.note} onChange={e => imposta('note', e.target.value)} rows={2} placeholder="Es. a chi l'hai dato, perché"
            className={`${campo} resize-none`} />
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={f.attivo} onChange={e => imposta('attivo', e.target.checked)} className="w-4 h-4 accent-[#C9A45C]" />
          <span className="font-body text-sm text-nebbia/70">Attivo</span>
        </label>

        {errore && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
            <AlertCircle size={14} /> {errore}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={onChiudi} className="btn-secondary text-sm flex-1 justify-center">Annulla</button>
          <button onClick={salva} disabled={salvando} className="btn-primary text-sm flex-1 justify-center disabled:opacity-40">
            {salvando ? <Loader2 size={14} className="animate-spin" /> : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PAGINA
// ─────────────────────────────────────────────────────────────
export default function AdminCodiciSconto() {
  const [codici, setCodici] = useState([])
  const [usi, setUsi] = useState([])
  const [prodotti, setProdotti] = useState([])
  const [persone, setPersone] = useState({})
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [modulo, setModulo] = useState(null)      // null | 'nuovo' | codice
  const [aperto, setAperto] = useState(null)      // id del codice di cui si vedono gli usi
  const [copiato, setCopiato] = useState(null)

  const carica = useCallback(async () => {
    setLoading(true)
    setErrore('')
    const [c, u, p] = await Promise.all([
      supabase.from('codici_sconto').select('*').order('creato_il', { ascending: false }),
      supabase.from('codici_sconto_usi').select('*').order('creato_il', { ascending: false }),
      supabase.from('prodotti').select('id, nome, tipo, prezzo').eq('attivo', true).in('tipo', TIPI.map(([k]) => k)).order('prezzo'),
    ])
    if (c.error || u.error || p.error) setErrore((c.error ?? u.error ?? p.error).message)
    setCodici(c.data ?? [])
    setUsi(u.data ?? [])
    setProdotti(p.data ?? [])
    const ids = [...new Set((u.data ?? []).map(x => x.user_id))]
    if (ids.length) {
      const { data } = await supabase.from('profiles').select('id, nome, cognome, email').in('id', ids)
      setPersone(Object.fromEntries((data ?? []).map(x => [x.id, x])))
    }
    setLoading(false)
  }, [])

  useEffect(() => { carica() }, [carica])

  const usiPerCodice = useMemo(() => {
    const m = {}
    for (const u of usi) (m[u.codice_id] ??= []).push(u)
    return m
  }, [usi])
  const nomeProdotto = useMemo(() => Object.fromEntries(prodotti.map(p => [p.id, p.nome])), [prodotti])

  async function accendiSpegni(c) {
    const { error } = await supabase.from('codici_sconto').update({ attivo: !c.attivo }).eq('id', c.id)
    if (error) setErrore(error.message)
    else carica()
  }

  function copia(c) {
    navigator.clipboard?.writeText(c.codice)
    setCopiato(c.id)
    setTimeout(() => setCopiato(null), 1500)
  }

  return (
    <div className="space-y-6">
      <PageHeader label="Admin" title="Codici sconto"
        subtitle="Crei il codice, lo mandi a chi vuoi: alla cassa toglie la percentuale dal prezzo"
        action={<button onClick={() => setModulo('nuovo')} className="btn-primary text-sm"><Plus size={14} /> Nuovo codice</button>} />

      {errore && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
          <AlertCircle size={14} /> {errore}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={18} className="animate-spin text-oro" /></div>
      ) : codici.length === 0 ? (
        <EmptyState icon={Tag} title="Nessun codice sconto" desc="Crea il primo con «Nuovo codice»." />
      ) : (
        <div className="space-y-3">
          {codici.map(c => {
            const suoi = (usiPerCodice[c.id] ?? []).filter(u => !u.annullato)
            const [stato, variante] = statoDi(c, suoi.length)
            const valePer = c.prodotti?.length
              ? c.prodotti.map(id => nomeProdotto[id] ?? 'prodotto non più in vendita').join(', ')
              : c.tipi?.length ? c.tipi.map(t => NOME_TIPO[t] ?? t).join(', ') : 'Tutto'
            const validita = [dataIt(c.valido_dal) && `dal ${dataIt(c.valido_dal)}`, dataIt(c.valido_al) && `fino al ${dataIt(c.valido_al)}`].filter(Boolean).join(' ') || 'Sempre'
            return (
              <div key={c.id} className="bg-slate border border-white/5">
                <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0 lg:w-64">
                    <button onClick={() => copia(c)} title="Copia il codice"
                      className="font-body text-sm tracking-wider text-oro hover:text-oro/70 flex items-center gap-1.5">
                      {c.codice} {copiato === c.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                    <span className="font-display text-xl text-nebbia">−{Number(c.percentuale).toLocaleString('it-IT')}%</span>
                  </div>
                  <div className="flex-1 min-w-0 font-body text-xs text-nebbia/50 space-y-0.5">
                    <p><span className="text-nebbia/30">Vale per:</span> {valePer} · {PER_CHI[c.per_chi ?? '']}</p>
                    <p><span className="text-nebbia/30">Validità:</span> {validita}{c.email && <> · <span className="text-nebbia/30">riservato a</span> {c.email}</>}</p>
                    {c.note && <p className="text-nebbia/35 italic">{c.note}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    <button onClick={() => setAperto(aperto === c.id ? null : c.id)} className="font-body text-xs text-nebbia/60 hover:text-nebbia">
                      Usi {suoi.length}{c.usi_massimi ? `/${c.usi_massimi}` : ''}{c.usi_per_persona ? ` · ${c.usi_per_persona} a persona` : ''}
                    </button>
                    <Badge label={stato} variant={variante} />
                    <button onClick={() => accendiSpegni(c)} className="font-body text-xs text-nebbia/40 hover:text-nebbia">{c.attivo ? 'Spegni' : 'Accendi'}</button>
                    <button onClick={() => setModulo(c)} className="font-body text-xs text-oro hover:text-oro/70">Modifica</button>
                  </div>
                </div>
                {aperto === c.id && (
                  <div className="border-t border-white/5 p-4">
                    {(usiPerCodice[c.id] ?? []).length === 0 ? (
                      <p className="font-body text-xs text-nebbia/30">Non ancora usato.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {usiPerCodice[c.id].map(u => {
                          const p = persone[u.user_id]
                          return (
                            <li key={u.id} className={`font-body text-xs flex flex-wrap gap-x-3 ${u.annullato ? 'text-nebbia/25 line-through' : 'text-nebbia/60'}`}>
                              <span>{dataIt(u.creato_il)}</span>
                              <span>{p ? `${p.nome ?? ''} ${p.cognome ?? ''}`.trim() || p.email : 'utente'}{p?.email ? ` · ${p.email}` : ''}</span>
                              <span>{nomeProdotto[u.prodotto_id] ?? 'prodotto'}</span>
                              <span>{u.importo_listino != null ? `${formatImporto(u.importo_listino)} → ` : ''}{formatImporto(u.importo_pagato)}</span>
                              {u.annullato && <span>rimborsato</span>}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modulo && (
        <ModuloCodice
          codice={modulo === 'nuovo' ? null : modulo}
          prodotti={prodotti}
          onChiudi={() => setModulo(null)}
          onSalvato={() => { setModulo(null); carica() }}
        />
      )}
    </div>
  )
}
