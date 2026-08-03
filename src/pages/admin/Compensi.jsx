// src/pages/admin/Compensi.jsx
// Gestione provvigioni lato azienda: chi ha venduto cosa, quanto deve ancora
// essere liquidato e le richieste di pagamento dei commerciali.
//
// Il cambio di stato di una richiesta passa dalla RPC
// admin_evadi_richiesta_pagamento(), che allinea in un colpo solo la richiesta
// e le provvigioni collegate (pagata -> pagate; rifiutata -> tornano maturate).

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, StatCard, Badge, EmptyState } from '@/components/shared'
import { supabase } from '@/lib/supabase'
import {
  Wallet, Clock, CheckCircle2, Users, Search, AlertCircle, Check,
  ArrowRight, Receipt, X,
} from 'lucide-react'

const euro = (n) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n ?? 0))

const dataIt = (iso) => iso ? new Date(iso).toLocaleDateString('it-IT') : '—'

const STATO_PROV = {
  maturata: { label: 'Da liquidare', variant: 'oro' },
  richiesta: { label: 'Richiesta', variant: 'warning' },
  pagata: { label: 'Pagata', variant: 'salvia' },
  annullata: { label: 'Annullata', variant: 'gray' },
}

const STATO_RICH = {
  in_attesa: { label: 'In attesa', variant: 'warning' },
  approvata: { label: 'Approvata', variant: 'oro' },
  pagata: { label: 'Pagata', variant: 'salvia' },
  rifiutata: { label: 'Rifiutata', variant: 'red' },
}

/* Modal di evasione richiesta */
function ModalEvadi({ richiesta, onClose, onFatto }) {
  const [stato, setStato] = useState('pagata')
  const [nota, setNota] = useState('')
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState('')

  if (!richiesta) return null

  async function conferma() {
    setBusy(true)
    setErrore('')
    try {
      const { error } = await supabase.rpc('admin_evadi_richiesta_pagamento', {
        p_richiesta_id: richiesta.id,
        p_stato: stato,
        p_nota: nota.trim() || null,
      })
      if (error) throw error
      onFatto()
    } catch (err) {
      setErrore(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-md bg-slate border border-white/10 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="section-label mb-1">Richiesta di pagamento</p>
            <h3 className="font-display text-2xl font-light text-nebbia">{euro(richiesta.importo)}</h3>
            <p className="font-body text-xs text-nebbia/40 mt-1">
              {richiesta.commerciale_nome} · {dataIt(richiesta.created_at)}
            </p>
          </div>
          <button onClick={() => !busy && onClose()} className="text-nebbia/30 hover:text-nebbia"><X size={18} /></button>
        </div>

        {errore && (
          <div className="mb-4 p-3 bg-red-900/10 border border-red-500/20 font-body text-xs text-red-400 flex items-center gap-2">
            <AlertCircle size={14} /> {errore}
          </div>
        )}

        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Esito</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { id: 'approvata', label: 'Approva' },
            { id: 'pagata', label: 'Pagata' },
            { id: 'rifiutata', label: 'Rifiuta' },
          ].map(o => (
            <button key={o.id} onClick={() => setStato(o.id)} disabled={busy}
              className={`p-2.5 border font-body text-sm transition-all ${stato === o.id
                ? 'bg-oro/10 border-oro/40 text-oro'
                : 'bg-petrolio border-white/10 text-nebbia/60 hover:border-oro/20'}`}>
              {o.label}
            </button>
          ))}
        </div>

        <p className="font-body text-xs text-nebbia/30 mb-4 leading-relaxed">
          {stato === 'pagata' && 'Le provvigioni collegate verranno segnate come pagate.'}
          {stato === 'approvata' && 'La richiesta risulta approvata; le provvigioni restano in stato “richiesta”.'}
          {stato === 'rifiutata' && 'Le provvigioni collegate tornano “da liquidare” e potranno essere richieste di nuovo.'}
        </p>

        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Nota per il commerciale</label>
        <textarea rows={3} value={nota} onChange={e => setNota(e.target.value)}
          placeholder="Es. bonifico eseguito il…"
          className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} disabled={busy} className="btn-secondary flex-1 justify-center">Annulla</button>
          <button onClick={conferma} disabled={busy} className="btn-primary flex-1 justify-center">
            {busy ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminCompensi() {
  const [tab, setTab] = useState('richieste')
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [provvigioni, setProvvigioni] = useState([])
  const [richieste, setRichieste] = useState([])
  const [cerca, setCerca] = useState('')
  const [daEvadere, setDaEvadere] = useState(null)

  const carica = useCallback(async () => {
    setLoading(true)
    setErrore('')
    try {
      const [p, r, comm] = await Promise.all([
        supabase.from('provvigioni')
          .select('id, commerciale_id, cliente_id, prodotto_nome, importo, importo_vendita, provvigione_tipo, provvigione_valore, stato, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('richieste_pagamento')
          .select('id, commerciale_id, importo, stato, note, nota_admin, created_at')
          .eq('tipo', 'provvigione')
          .order('created_at', { ascending: false }),
        supabase.from('profiles')
          .select('id, nome, cognome, email, codice_commerciale')
          .eq('role', 'commerciale'),
      ])
      if (p.error) throw p.error
      if (r.error) throw r.error

      const mappa = new Map((comm.data ?? []).map(c => [c.id, c]))
      const nome = (id) => {
        const c = mappa.get(id)
        return c ? `${c.nome} ${c.cognome}` : '—'
      }

      setProvvigioni((p.data ?? []).map(x => ({
        ...x,
        commerciale_nome: nome(x.commerciale_id),
        commerciale_codice: mappa.get(x.commerciale_id)?.codice_commerciale ?? null,
      })))
      setRichieste((r.data ?? []).map(x => ({ ...x, commerciale_nome: nome(x.commerciale_id) })))
    } catch (err) {
      setErrore(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carica() }, [carica])

  const somma = (stato) => provvigioni
    .filter(p => p.stato === stato)
    .reduce((acc, p) => acc + Number(p.importo ?? 0), 0)

  const nCommerciali = new Set(provvigioni.map(p => p.commerciale_id)).size
  const nInAttesa = richieste.filter(r => r.stato === 'in_attesa').length

  const provFiltrate = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    if (!q) return provvigioni
    return provvigioni.filter(p =>
      `${p.commerciale_nome} ${p.commerciale_codice ?? ''} ${p.prodotto_nome ?? ''}`.toLowerCase().includes(q))
  }, [provvigioni, cerca])

  return (
    <div className="space-y-5">
      <PageHeader label="Admin" title="Compensi" subtitle="Provvigioni dei commerciali e richieste di pagamento" />

      {errore && (
        <div className="p-3 bg-red-900/10 border border-red-500/20 font-body text-xs text-red-400 flex items-center gap-2">
          <AlertCircle size={14} /> {errore}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Da liquidare" value={euro(somma('maturata'))} icon={Wallet} colorClass="text-oro" />
        <StatCard label="Richieste" value={euro(somma('richiesta'))} sub={nInAttesa ? `${nInAttesa} da evadere` : null}
          icon={Clock} colorClass={nInAttesa ? 'text-amber-400' : 'text-nebbia/40'} />
        <StatCard label="Pagate" value={euro(somma('pagata'))} icon={CheckCircle2} colorClass="text-salvia" />
        <StatCard label="Commerciali attivi" value={nCommerciali} icon={Users} colorClass="text-nebbia" />
      </div>

      <div className="flex gap-1 border-b border-white/5">
        {[
          { key: 'richieste', label: `Richieste di pagamento${nInAttesa ? ` (${nInAttesa})` : ''}` },
          { key: 'provvigioni', label: `Provvigioni (${provvigioni.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 font-body text-sm transition-colors border-b-2 -mb-px ${tab === t.key
              ? 'text-oro border-oro' : 'text-nebbia/40 border-transparent hover:text-nebbia/70'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : tab === 'richieste' ? (
        richieste.length === 0 ? (
          <div className="bg-slate border border-white/5">
            <EmptyState icon={Receipt} title="Nessuna richiesta"
              desc="Quando un commerciale chiede la liquidazione delle sue provvigioni, la trovi qui." />
          </div>
        ) : (
          <div className="bg-slate border border-white/5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Data', 'Commerciale', 'Importo', 'Stato', 'Nota', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {richieste.map(r => {
                  const s = STATO_RICH[r.stato] ?? STATO_RICH.in_attesa
                  return (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                      <td className="px-4 py-3 font-body text-sm text-nebbia/60 whitespace-nowrap">{dataIt(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/utenti/${r.commerciale_id}`} className="font-body text-sm text-nebbia hover:text-oro transition-colors">
                          {r.commerciale_nome}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-oro">{euro(r.importo)}</td>
                      <td className="px-4 py-3"><Badge label={s.label} variant={s.variant} /></td>
                      <td className="px-4 py-3 font-body text-xs text-nebbia/40 max-w-56">
                        {r.note ?? '—'}
                        {r.nota_admin && <span className="block text-salvia/60 mt-0.5">↳ {r.nota_admin}</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.stato !== 'pagata' && r.stato !== 'rifiutata' && (
                          <button onClick={() => setDaEvadere(r)}
                            className="font-body text-xs text-oro hover:text-oro/70 border border-oro/25 hover:border-oro/50 px-3 py-1.5 transition-colors">
                            Evadi
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
            <input value={cerca} onChange={e => setCerca(e.target.value)}
              placeholder="Cerca per commerciale, codice o prodotto…"
              className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
          </div>

          {provFiltrate.length === 0 ? (
            <div className="bg-slate border border-white/5">
              <EmptyState icon={Wallet} title="Nessuna provvigione"
                desc="Le provvigioni si generano quando un cliente attribuito a un commerciale acquista un prodotto con provvigione impostata." />
            </div>
          ) : (
            <div className="bg-slate border border-white/5 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Data', 'Commerciale', 'Prodotto', 'Vendita', 'Provv.', 'Importo', 'Stato'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {provFiltrate.map(p => {
                    const s = STATO_PROV[p.stato] ?? STATO_PROV.maturata
                    return (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                        <td className="px-4 py-3 font-body text-sm text-nebbia/60 whitespace-nowrap">{dataIt(p.created_at)}</td>
                        <td className="px-4 py-3">
                          <Link to={`/admin/utenti/${p.commerciale_id}`} className="font-body text-sm text-nebbia hover:text-oro transition-colors">
                            {p.commerciale_nome}
                          </Link>
                          {p.commerciale_codice && (
                            <p className="font-body text-xs text-oro/60 tracking-wider">{p.commerciale_codice}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-nebbia/60">{p.prodotto_nome ?? '—'}</td>
                        <td className="px-4 py-3 font-body text-sm text-nebbia/40">{euro(p.importo_vendita)}</td>
                        <td className="px-4 py-3 font-body text-xs text-nebbia/30">
                          {p.provvigione_tipo === 'percentuale' ? `${Number(p.provvigione_valore)}%` : 'fisso'}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-oro">{euro(p.importo)}</td>
                        <td className="px-4 py-3"><Badge label={s.label} variant={s.variant} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ModalEvadi
        richiesta={daEvadere}
        onClose={() => setDaEvadere(null)}
        onFatto={() => { setDaEvadere(null); carica() }}
      />
    </div>
  )
}
