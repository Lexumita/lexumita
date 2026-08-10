// src/pages/commerciale/Dashboard.jsx
// Sommario del commerciale: provvigioni per stato, prossimi appuntamenti,
// ultime vendite attribuite. Tutti i dati sono già filtrati dalle RLS/viste:
// il commerciale vede solo ciò che gli appartiene.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { PageHeader, StatCard, EmptyState, LoadingSpinner, Badge } from '@/components/shared'
import {
  Wallet, Clock, CheckCircle2, Users, CalendarDays, ArrowRight, Copy, Check,
  Link2 as LinkIcon,
} from 'lucide-react'

export const euro = (n) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n ?? 0))

export const STATO_PROVVIGIONE = {
  maturata: { label: 'Da richiedere', variant: 'oro' },
  richiesta: { label: 'Richiesta', variant: 'warning' },
  pagata: { label: 'Pagata', variant: 'salvia' },
  annullata: { label: 'Annullata', variant: 'gray' },
}

const TIPO_APP = {
  chiamata: 'Chiamata',
  demo: 'Demo',
  incontro: 'Incontro',
  follow_up: 'Follow-up',
  altro: 'Appuntamento',
}

function dataOra(iso, tuttoGiorno) {
  if (!iso) return ''
  const d = new Date(iso)
  const data = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
  if (tuttoGiorno) return data
  return `${data} · ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
}

export default function CommercialeDashboard() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [tot, setTot] = useState({ maturata: 0, richiesta: 0, pagata: 0 })
  const [nClienti, setNClienti] = useState(0)
  const [appuntamenti, setAppuntamenti] = useState([])
  const [ultime, setUltime] = useState([])
  const [copiato, setCopiato] = useState(false)
  const [linkCopiato, setLinkCopiato] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    let annullato = false

    async function carica() {
      setLoading(true)
      setErrore('')
      try {
        const [prov, clienti, app, recenti] = await Promise.all([
          supabase.from('provvigioni').select('stato, importo'),
          supabase.from('v_clienti_commerciale').select('id', { count: 'exact', head: true }),
          supabase.from('appuntamenti_commerciale')
            .select('id, titolo, inizio, tutto_il_giorno, tipo, partecipante_nome, luogo')
            .gte('inizio', new Date().toISOString())
            .order('inizio', { ascending: true })
            .limit(5),
          supabase.from('provvigioni')
            .select('id, prodotto_nome, importo, stato, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
        ])

        if (annullato) return
        if (prov.error) throw prov.error
        if (app.error) throw app.error
        if (recenti.error) throw recenti.error

        const somme = { maturata: 0, richiesta: 0, pagata: 0 }
        for (const r of prov.data ?? []) {
          if (somme[r.stato] !== undefined) somme[r.stato] += Number(r.importo ?? 0)
        }
        setTot(somme)
        setNClienti(clienti.count ?? 0)
        setAppuntamenti(app.data ?? [])
        setUltime(recenti.data ?? [])
      } catch (err) {
        if (!annullato) setErrore(err.message)
      } finally {
        if (!annullato) setLoading(false)
      }
    }

    carica()
    return () => { annullato = true }
  }, [profile?.id])

  async function copiaCodice() {
    if (!profile?.codice_commerciale) return
    try {
      await navigator.clipboard.writeText(profile.codice_commerciale)
      setCopiato(true)
      setTimeout(() => setCopiato(false), 1500)
    } catch { /* clipboard non disponibile */ }
  }

  // Link d'invito: chi lo apre trova il codice già inserito nel form di
  // registrazione, così l'attribuzione non dipende dal fatto che lo digiti.
  const linkInvito = profile?.codice_commerciale
    ? `${window.location.origin}/registrati?ref=${encodeURIComponent(profile.codice_commerciale)}`
    : null

  async function copiaLink() {
    if (!linkInvito) return
    try {
      await navigator.clipboard.writeText(linkInvito)
      setLinkCopiato(true)
      setTimeout(() => setLinkCopiato(false), 1500)
    } catch { /* clipboard non disponibile */ }
  }

  if (loading) return <LoadingSpinner fullPage />

  return (
    <>
      <PageHeader
        label="Area commerciale"
        title={`Ciao ${profile?.nome ?? ''}`}
        subtitle="Il riepilogo delle tue provvigioni e dei prossimi appuntamenti"
      />

      {errore && (
        <div className="mb-6 p-3 bg-red-900/10 border border-red-500/20 font-body text-xs text-red-400">
          {errore}
        </div>
      )}

      {/* Codice personale e link d'invito — affiancati; se manca il link, il codice occupa tutta la riga */}
      <div className={`grid gap-4 mb-6 ${linkInvito ? 'lg:grid-cols-2' : ''}`}>
        {/* Codice personale */}
        <div className="bg-slate border border-white/5 p-5 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase">Il tuo codice</p>
            {profile?.codice_commerciale && (
              <button onClick={copiaCodice} className="btn-secondary flex items-center gap-2 shrink-0">
                {copiato ? <><Check size={14} /> Copiato</> : <><Copy size={14} /> Copia</>}
              </button>
            )}
          </div>
          <p className="font-display text-2xl font-light text-oro tracking-widest">
            {profile?.codice_commerciale ?? '— non assegnato —'}
          </p>
          <p className="font-body text-xs text-nebbia/25 mt-auto pt-2">
            Fallo inserire al cliente in fase di registrazione: solo così i suoi acquisti ti vengono attribuiti.
          </p>
        </div>

        {/* Link d'invito — il codice arriva già compilato, niente da digitare */}
        {linkInvito && (
          <div className="bg-slate border border-oro/15 p-5 flex flex-col min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase">Il tuo link d'invito</p>
              <button onClick={copiaLink} className="btn-secondary flex items-center gap-2 shrink-0">
                {linkCopiato ? <><Check size={14} /> Copiato</> : <><LinkIcon size={14} /> Copia link</>}
              </button>
            </div>
            <p className="font-body text-sm text-oro/90 break-all">{linkInvito}</p>
            <p className="font-body text-xs text-nebbia/25 mt-auto pt-2">
              Chi si registra da questo link ha già il tuo codice inserito: l'attribuzione è automatica.
            </p>
          </div>
        )}
      </div>

      {/* Riepilogo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Da richiedere" value={euro(tot.maturata)} icon={Wallet} colorClass="text-oro" />
        <StatCard label="Richieste" value={euro(tot.richiesta)} icon={Clock} colorClass="text-amber-400" />
        <StatCard label="Pagate" value={euro(tot.pagata)} icon={CheckCircle2} colorClass="text-salvia" />
        <StatCard label="Clienti" value={nClienti} icon={Users} colorClass="text-nebbia" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Prossimi appuntamenti */}
        <div className="bg-slate border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-light text-nebbia">Prossimi appuntamenti</h2>
            <Link to="/commerciale/calendario" className="font-body text-xs text-oro hover:text-oro/70 flex items-center gap-1">
              Calendario <ArrowRight size={12} />
            </Link>
          </div>
          {appuntamenti.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nessun appuntamento" desc="Non hai impegni in programma." />
          ) : (
            <div className="space-y-2">
              {appuntamenti.map(a => (
                <div key={a.id} className="flex items-start gap-3 p-3 bg-petrolio/40 border border-white/5">
                  <div className="text-center shrink-0 w-16">
                    <p className="font-body text-xs text-oro">{dataOra(a.inizio, a.tutto_il_giorno)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm text-nebbia truncate">{a.titolo}</p>
                    <p className="font-body text-xs text-nebbia/30 truncate">
                      {TIPO_APP[a.tipo] ?? 'Appuntamento'}
                      {a.partecipante_nome ? ` · ${a.partecipante_nome}` : ''}
                      {a.luogo ? ` · ${a.luogo}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ultime provvigioni */}
        <div className="bg-slate border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-light text-nebbia">Ultime provvigioni</h2>
            <Link to="/commerciale/provvigioni" className="font-body text-xs text-oro hover:text-oro/70 flex items-center gap-1">
              Tutte <ArrowRight size={12} />
            </Link>
          </div>
          {ultime.length === 0 ? (
            <EmptyState icon={Wallet} title="Nessuna provvigione" desc="Quando un tuo cliente acquista, la trovi qui." />
          ) : (
            <div className="space-y-2">
              {ultime.map(p => {
                const s = STATO_PROVVIGIONE[p.stato] ?? STATO_PROVVIGIONE.maturata
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-petrolio/40 border border-white/5">
                    <div className="min-w-0">
                      <p className="font-body text-sm text-nebbia truncate">{p.prodotto_nome ?? 'Prodotto'}</p>
                      <p className="font-body text-xs text-nebbia/30">
                        {new Date(p.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-body text-sm text-oro">{euro(p.importo)}</p>
                      <Badge label={s.label} variant={s.variant} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
