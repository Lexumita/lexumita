// src/pages/commerciale/Provvigioni.jsx
// Due viste: lo storico riga per riga delle provvigioni generate dalle vendite
// e lo storico delle richieste di pagamento inviate all'azienda.
//
// Il passaggio 'maturata' -> 'richiesta' NON avviene qui: il commerciale non ha
// permessi di scrittura sulle provvigioni. Chiama la RPC
// richiedi_pagamento_provvigioni(), che fa tutto in modo atomico e validato.

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  PageHeader, StatCard, Table, Tr, Td, Badge, EmptyState, LoadingSpinner, TextareaField,
} from '@/components/shared'
import { Wallet, Clock, CheckCircle2, Send, X, AlertCircle, Receipt } from 'lucide-react'
import { euro, STATO_PROVVIGIONE } from './Dashboard'

const STATO_RICHIESTA = {
  in_attesa: { label: 'In attesa', variant: 'warning' },
  approvata: { label: 'Approvata', variant: 'oro' },
  pagata: { label: 'Pagata', variant: 'salvia' },
  rifiutata: { label: 'Rifiutata', variant: 'red' },
}

const dataIt = (iso) => iso ? new Date(iso).toLocaleDateString('it-IT') : '—'

export default function CommercialeProvvigioni() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('provvigioni')
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [provvigioni, setProvvigioni] = useState([])
  const [richieste, setRichieste] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [note, setNote] = useState('')
  const [invio, setInvio] = useState(false)
  const [ok, setOk] = useState('')

  const carica = useCallback(async () => {
    setLoading(true)
    setErrore('')
    try {
      const [p, r] = await Promise.all([
        supabase.from('provvigioni')
          .select('id, prodotto_nome, importo, importo_vendita, provvigione_tipo, provvigione_valore, stato, created_at, cliente_id')
          .order('created_at', { ascending: false }),
        supabase.from('richieste_pagamento')
          .select('id, importo, stato, note, nota_admin, created_at, updated_at')
          .eq('tipo', 'provvigione')
          .order('created_at', { ascending: false }),
      ])
      if (p.error) throw p.error
      if (r.error) throw r.error
      setProvvigioni(p.data ?? [])
      setRichieste(r.data ?? [])
    } catch (err) {
      setErrore(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (profile?.id) carica() }, [profile?.id, carica])

  const somma = (stato) => provvigioni
    .filter(p => p.stato === stato)
    .reduce((acc, p) => acc + Number(p.importo ?? 0), 0)

  const totMaturate = somma('maturata')
  const nMaturate = provvigioni.filter(p => p.stato === 'maturata').length

  async function inviaRichiesta() {
    setInvio(true)
    setErrore('')
    try {
      const { error } = await supabase.rpc('richiedi_pagamento_provvigioni', {
        p_note: note.trim() || null,
      })
      if (error) throw error
      setModalOpen(false)
      setNote('')
      setOk('Richiesta inviata. La troverai in "Richieste di pagamento".')
      setTimeout(() => setOk(''), 4000)
      await carica()
    } catch (err) {
      setErrore(err.message)
    } finally {
      setInvio(false)
    }
  }

  if (loading) return <LoadingSpinner fullPage />

  return (
    <>
      <PageHeader
        label="Area commerciale"
        title="Provvigioni"
        subtitle="Storico delle vendite attribuite e delle richieste di pagamento"
        action={
          totMaturate > 0 ? (
            <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
              <Send size={15} /> Richiedi pagamento
            </button>
          ) : null
        }
      />

      {errore && (
        <div className="mb-4 p-3 bg-red-900/10 border border-red-500/20 font-body text-xs text-red-400 flex items-center gap-2">
          <AlertCircle size={14} /> {errore}
        </div>
      )}
      {ok && (
        <div className="mb-4 p-3 bg-salvia/10 border border-salvia/20 font-body text-xs text-salvia flex items-center gap-2">
          <CheckCircle2 size={14} /> {ok}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Da richiedere" value={euro(totMaturate)} sub={`${nMaturate} vendite`} icon={Wallet} colorClass="text-oro" />
        <StatCard label="Richieste" value={euro(somma('richiesta'))} icon={Clock} colorClass="text-amber-400" />
        <StatCard label="Pagate" value={euro(somma('pagata'))} icon={CheckCircle2} colorClass="text-salvia" />
      </div>

      {/* Tab */}
      <div className="flex gap-1 mb-4 border-b border-white/5">
        {[
          { key: 'provvigioni', label: `Provvigioni (${provvigioni.length})` },
          { key: 'richieste', label: `Richieste di pagamento (${richieste.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 font-body text-sm transition-colors border-b-2 -mb-px ${tab === t.key
              ? 'text-oro border-oro'
              : 'text-nebbia/40 border-transparent hover:text-nebbia/70'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'provvigioni' ? (
        <div className="bg-slate border border-white/5">
          <Table
            headers={['Data', 'Prodotto', 'Vendita', 'Provvigione', 'Importo', 'Stato']}
            empty={<EmptyState icon={Wallet} title="Nessuna provvigione"
              desc="Quando un cliente registrato con il tuo codice effettua un acquisto, la provvigione compare qui automaticamente." />}
          >
            {provvigioni.map(p => {
              const s = STATO_PROVVIGIONE[p.stato] ?? STATO_PROVVIGIONE.maturata
              return (
                <Tr key={p.id}>
                  <Td className="whitespace-nowrap">{dataIt(p.created_at)}</Td>
                  <Td className="text-nebbia">{p.prodotto_nome ?? '—'}</Td>
                  <Td>{euro(p.importo_vendita)}</Td>
                  <Td className="text-nebbia/40">
                    {p.provvigione_tipo === 'percentuale'
                      ? `${Number(p.provvigione_valore)}%`
                      : 'fisso'}
                  </Td>
                  <Td className="text-oro">{euro(p.importo)}</Td>
                  <Td><Badge label={s.label} variant={s.variant} /></Td>
                </Tr>
              )
            })}
          </Table>
        </div>
      ) : (
        <div className="bg-slate border border-white/5">
          <Table
            headers={['Data', 'Importo', 'Stato', 'Nota', 'Risposta azienda']}
            empty={<EmptyState icon={Receipt} title="Nessuna richiesta"
              desc="Quando hai provvigioni da riscuotere, usa il pulsante “Richiedi pagamento”." />}
          >
            {richieste.map(r => {
              const s = STATO_RICHIESTA[r.stato] ?? STATO_RICHIESTA.in_attesa
              return (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap">{dataIt(r.created_at)}</Td>
                  <Td className="text-oro">{euro(r.importo)}</Td>
                  <Td><Badge label={s.label} variant={s.variant} /></Td>
                  <Td className="text-nebbia/40">{r.note ?? '—'}</Td>
                  <Td className="text-nebbia/40">{r.nota_admin ?? '—'}</Td>
                </Tr>
              )
            })}
          </Table>
        </div>
      )}

      {/* Modal richiesta */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4" onClick={() => !invio && setModalOpen(false)}>
          <div className="w-full max-w-md bg-slate border border-white/10 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="section-label mb-1">Richiesta di pagamento</p>
                <h3 className="font-display text-2xl font-light text-nebbia">{euro(totMaturate)}</h3>
              </div>
              <button onClick={() => !invio && setModalOpen(false)} className="text-nebbia/30 hover:text-nebbia">
                <X size={18} />
              </button>
            </div>

            <p className="font-body text-sm text-nebbia/40 mb-5 leading-relaxed">
              Stai richiedendo il pagamento di <span className="text-oro">{nMaturate}</span>{' '}
              {nMaturate === 1 ? 'provvigione maturata' : 'provvigioni maturate'}.
              Verranno messe in stato “Richiesta” e l'azienda le prenderà in carico.
            </p>

            <TextareaField
              label="Nota (opzionale)"
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Es. dati per il bonifico, riferimento fattura…"
            />

            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalOpen(false)} disabled={invio} className="btn-secondary flex-1 justify-center">
                Annulla
              </button>
              <button onClick={inviaRichiesta} disabled={invio} className="btn-primary flex-1 justify-center">
                {invio
                  ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                  : <><Send size={15} /> Invia</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
