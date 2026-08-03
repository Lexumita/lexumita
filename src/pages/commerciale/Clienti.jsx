// src/pages/commerciale/Clienti.jsx
// I clienti attribuiti al commerciale: SOLO anagrafica e storico acquisti.
//
// I dati arrivano da due viste dedicate (v_clienti_commerciale,
// v_acquisti_commerciale) che espongono un set di colonne ristretto e filtrano
// per commerciale_id = auth.uid(). Il commerciale non ha alcun accesso alla
// tabella profiles: dati fiscali, documenti e note interne restano invisibili.

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  PageHeader, StatCard, Table, Tr, Td, Badge, EmptyState, LoadingSpinner,
} from '@/components/shared'
import {
  Users, Search, ChevronDown, ChevronRight, ShoppingBag, AlertCircle, Euro,
} from 'lucide-react'
import { euro } from './Dashboard'

const RUOLO = {
  user: { label: 'Privato', variant: 'gray' },
  avvocato: { label: 'Avvocato', variant: 'oro' },
  commercialista: { label: 'Commercialista', variant: 'salvia' },
  cliente: { label: 'Cliente', variant: 'gray' },
}

const STATO_ABB = {
  attivo: { label: 'Attivo', variant: 'salvia' },
  scaduto: { label: 'Scaduto', variant: 'red' },
  in_scadenza: { label: 'In scadenza', variant: 'warning' },
  prova: { label: 'Prova', variant: 'oro' },
}

const dataIt = (iso) => iso ? new Date(iso).toLocaleDateString('it-IT') : '—'

export default function CommercialeClienti() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [clienti, setClienti] = useState([])
  const [acquisti, setAcquisti] = useState([])
  const [cerca, setCerca] = useState('')
  const [aperto, setAperto] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    let annullato = false

    async function carica() {
      setLoading(true)
      setErrore('')
      try {
        const [c, a] = await Promise.all([
          supabase.from('v_clienti_commerciale')
            .select('id, nome, cognome, email, studio, telefono, role, created_at, abbonamento_tipo, abbonamento_stato, abbonamento_scadenza')
            .order('created_at', { ascending: false }),
          supabase.from('v_acquisti_commerciale')
            .select('id, cliente_id, prodotto_nome, importo, stato, created_at, provvigione_importo, provvigione_stato')
            .order('created_at', { ascending: false }),
        ])
        if (annullato) return
        if (c.error) throw c.error
        if (a.error) throw a.error
        setClienti(c.data ?? [])
        setAcquisti(a.data ?? [])
      } catch (err) {
        if (!annullato) setErrore(err.message)
      } finally {
        if (!annullato) setLoading(false)
      }
    }

    carica()
    return () => { annullato = true }
  }, [profile?.id])

  const acquistiPerCliente = useMemo(() => {
    const m = new Map()
    for (const a of acquisti) {
      if (!m.has(a.cliente_id)) m.set(a.cliente_id, [])
      m.get(a.cliente_id).push(a)
    }
    return m
  }, [acquisti])

  const filtrati = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    if (!q) return clienti
    return clienti.filter(c =>
      `${c.nome ?? ''} ${c.cognome ?? ''} ${c.email ?? ''} ${c.studio ?? ''}`.toLowerCase().includes(q)
    )
  }, [clienti, cerca])

  const fatturatoTotale = acquisti
    .filter(a => a.stato === 'completato')
    .reduce((acc, a) => acc + Number(a.importo ?? 0), 0)

  if (loading) return <LoadingSpinner fullPage />

  return (
    <>
      <PageHeader
        label="Area commerciale"
        title="I miei clienti"
        subtitle="Chi si è registrato con il tuo codice e cosa ha acquistato"
      />

      {errore && (
        <div className="mb-4 p-3 bg-red-900/10 border border-red-500/20 font-body text-xs text-red-400 flex items-center gap-2">
          <AlertCircle size={14} /> {errore}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Clienti" value={clienti.length} icon={Users} colorClass="text-nebbia" />
        <StatCard label="Acquisti" value={acquisti.length} icon={ShoppingBag} colorClass="text-salvia" />
        <StatCard label="Fatturato generato" value={euro(fatturatoTotale)} icon={Euro} colorClass="text-oro" />
      </div>

      {/* Ricerca */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/25" />
        <input
          type="text"
          value={cerca}
          onChange={e => setCerca(e.target.value)}
          placeholder="Cerca per nome, email o studio…"
          className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-10 pr-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25"
        />
      </div>

      <div className="bg-slate border border-white/5">
        <Table
          headers={['', 'Cliente', 'Tipo', 'Registrato', 'Abbonamento', 'Acquisti']}
          empty={<EmptyState icon={Users} title="Nessun cliente"
            desc="Quando qualcuno si registra inserendo il tuo codice, comparirà qui." />}
        >
          {filtrati.flatMap(c => {
            const lista = acquistiPerCliente.get(c.id) ?? []
            const isOpen = aperto === c.id
            const ruolo = RUOLO[c.role] ?? RUOLO.user
            const abb = STATO_ABB[c.abbonamento_stato]
            const righe = [
              <Tr key={c.id} onClick={() => setAperto(isOpen ? null : c.id)}>
                <Td className="w-8">
                  {isOpen ? <ChevronDown size={15} className="text-oro" /> : <ChevronRight size={15} className="text-nebbia/25" />}
                </Td>
                <Td>
                  <p className="text-nebbia">{c.nome} {c.cognome}</p>
                  <p className="text-xs text-nebbia/30">{c.email}</p>
                  {c.studio && <p className="text-xs text-nebbia/25">{c.studio}</p>}
                </Td>
                <Td><Badge label={ruolo.label} variant={ruolo.variant} /></Td>
                <Td className="whitespace-nowrap">{dataIt(c.created_at)}</Td>
                <Td>
                  {c.abbonamento_tipo
                    ? <div className="flex items-center gap-2">
                        <span className="text-nebbia/60">{c.abbonamento_tipo}</span>
                        {abb && <Badge label={abb.label} variant={abb.variant} />}
                      </div>
                    : <span className="text-nebbia/25">—</span>}
                </Td>
                <Td className="text-oro">{lista.length}</Td>
              </Tr>,
            ]

            if (isOpen) {
              righe.push(
                <tr key={`${c.id}-det`} className="border-b border-white/5 bg-petrolio/30">
                  <td colSpan={6} className="px-4 py-4">
                    {lista.length === 0 ? (
                      <p className="font-body text-sm text-nebbia/30 text-center py-4">
                        Nessun acquisto registrato per questo cliente.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Storico acquisti</p>
                        {lista.map(a => (
                          <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate border border-white/5">
                            <div className="min-w-0">
                              <p className="font-body text-sm text-nebbia">{a.prodotto_nome ?? 'Prodotto'}</p>
                              <p className="font-body text-xs text-nebbia/30">{dataIt(a.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-body text-xs text-nebbia/30">Importo</p>
                                <p className="font-body text-sm text-nebbia/70">{euro(a.importo)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-body text-xs text-nebbia/30">Provvigione</p>
                                <p className="font-body text-sm text-oro">
                                  {a.provvigione_importo != null ? euro(a.provvigione_importo) : '—'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            }
            return righe
          })}
        </Table>
      </div>
    </>
  )
}
