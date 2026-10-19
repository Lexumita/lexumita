// src/pages/admin/Dashboard.jsx
//
// In alto i contatori (utenti per ruolo, ticket aperti, revenue), sotto le metriche
// (blog e sito, percorso dei nuovi iscritti: components/admin/Metriche.jsx).

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, StatCard } from '@/components/shared'
import Metriche from '@/components/admin/Metriche'
import { Users, Headphones, CreditCard, AlertCircle } from 'lucide-react'
import {
  caricaContatoriAdmin, totaliProfessionisti, descriviStati, formattaImporto
} from '@/lib/contatoriAdmin'

// I box degli utenti registrati, in quest'ordine, ognuno col suo colore.
// Le classi sono scritte per intero perché Tailwind le trovi.
const GRUPPI = [
  { id: 'user', label: 'User', ruoli: ['user'],
    testo: 'text-sky-300', box: 'border-sky-400/40 bg-sky-400/10', barra: 'bg-sky-400/80' },
  { id: 'professionisti', label: 'Professionisti', ruoli: ['avvocato', 'commercialista'],
    testo: 'text-oro', box: 'border-oro/40 bg-oro/10', barra: 'bg-oro/80' },
  { id: 'commerciale', label: 'Commerciali', ruoli: ['commerciale'],
    testo: 'text-rose-300', box: 'border-rose-400/40 bg-rose-400/10', barra: 'bg-rose-400/80' },
  { id: 'cliente', label: 'Clienti degli avvocati', ruoli: ['cliente'],
    testo: 'text-salvia', box: 'border-salvia/40 bg-salvia/10', barra: 'bg-salvia/80' },
  { id: 'admin', label: 'Admin', ruoli: ['admin'],
    testo: 'text-nebbia/80', box: 'border-white/20 bg-white/5', barra: 'bg-nebbia/50' },
]
const ALTRI = { id: 'altri', label: 'Altri', testo: 'text-nebbia/40', box: 'border-white/10', barra: 'bg-nebbia/20' }

// Ogni ruolo finisce in un box; un ruolo nuovo va in «Altri», così la somma fa sempre il totale
function gruppiUtenti(c) {
  const perRuolo = c?.per_ruolo ?? {}
  const ruoliNoti = new Set(GRUPPI.flatMap(g => g.ruoli))
  const gruppi = GRUPPI.map(g => ({ ...g, n: g.ruoli.reduce((t, r) => t + (perRuolo[r] ?? 0), 0) }))
  const nAltri = Object.entries(perRuolo).filter(([r]) => !ruoliNoti.has(r)).reduce((t, [, n]) => t + n, 0)
  return nAltri ? [...gruppi, { ...ALTRI, n: nAltri }] : gruppi
}

const PROFESSIONI = { avvocato: ['avvocato', 'avvocati'], commercialista: ['commercialista', 'commercialisti'] }

function dettaglioProfessionisti(c) {
  return Object.entries(c?.professionisti ?? {})
    .filter(([, s]) => s.totale)
    .map(([r, s]) => {
      const [uno, molti] = PROFESSIONI[r] ?? [r, r]
      return `${s.totale} ${s.totale === 1 ? uno : molti}`
    })
    .join(' · ')
}

function UtentiRegistrati({ c, vuoto }) {
  const totale = c?.totale ?? 0
  const gruppi = gruppiUtenti(c)
  const perc = (n) => (totale ? `${Math.round((n / totale) * 100)}%` : '')

  return (
    <div className="bg-slate border border-white/5 p-5 h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-3xl font-semibold text-nebbia">{vuoto ? '—' : totale}</p>
          <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mt-1">Utenti registrati</p>
        </div>
        <Link to="/admin/utenti" className="flex items-center gap-2 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
          <Users size={18} className="text-nebbia/15" /> Vedi tutti →
        </Link>
      </div>

      {!vuoto && (
        <>
          {/* La stessa divisione in una barra: quanto pesa ogni gruppo sul totale */}
          <div className="flex h-2 mt-4 gap-px overflow-hidden">
            {gruppi.filter(g => g.n).map(g => (
              <div key={g.id} className={g.barra} style={{ width: `${(g.n / totale) * 100}%` }} title={`${g.label}: ${g.n}`} />
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 mt-4">
            {gruppi.map(g => {
              const prof = g.id === 'professionisti'
              return (
                <div key={g.id} className={`border p-3 ${g.box}`}>
                  <p className={`font-display text-2xl font-semibold leading-none ${g.testo}`}>{g.n}</p>
                  <p className={`font-body text-[11px] tracking-wide uppercase mt-1.5 ${g.testo}`}>{g.label}</p>
                  <p className="font-body text-[11px] text-nebbia/30 mt-1">
                    {prof && g.n ? dettaglioProfessionisti(c) : perc(g.n)}
                  </p>
                  {prof && g.n > 0 && (
                    <p className="font-body text-[11px] text-nebbia/30">{descriviStati(totaliProfessionisti(c))}</p>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [c, setC] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    // Stessa fonte della pagina Utenti: i numeri devono coincidere
    caricaContatoriAdmin()
      .then(setC)
      .catch(() => setErrore('Impossibile caricare i contatori. Ricarica la pagina.'))
      .finally(() => setLoading(false))
  }, [])

  const vuoto = loading || !c
  const nVerifiche = c?.verifiche_pendenti ?? 0
  const nTicket = c?.ticket_aperti ?? 0
  const valuta = c?.valuta ?? 'EUR'
  const altreValute = Object.entries(c?.ricavi ?? {}).filter(([v, tot]) => v !== valuta && Number(tot) !== 0)

  return (
    <div className="space-y-6">
      <PageHeader label="Admin" title="Dashboard" subtitle="Panoramica della piattaforma" />

      {errore && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
          <AlertCircle size={14} /> {errore}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <UtentiRegistrati c={c} vuoto={vuoto} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 content-start">
          <StatCard
            label="Ticket aperti"
            value={vuoto ? '—' : nTicket}
            colorClass={nTicket > 0 ? 'text-red-400' : 'text-nebbia/30'}
            icon={Headphones}
          />
          <StatCard
            label="Revenue totale"
            value={vuoto ? '—' : formattaImporto(c.ricavi?.[valuta], valuta)}
            sub={altreValute.length ? altreValute.map(([v, tot]) => `+ ${formattaImporto(tot, v)}`).join(' · ') : null}
            colorClass="text-salvia"
            icon={CreditCard}
          />
        </div>
      </div>

      {/* Alert verifiche pendenti */}
      {!vuoto && nVerifiche > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-amber-900/10 border border-amber-500/20">
          <AlertCircle size={16} className="text-amber-400 shrink-0" />
          <p className="font-body text-sm text-amber-400 min-w-0 flex-1">
            {nVerifiche} {nVerifiche === 1 ? 'richiesta' : 'richieste'} di verifica identità in attesa
          </p>
          <Link to="/admin/utenti" className="font-body text-xs text-amber-400 border border-amber-500/30 px-3 py-1.5 hover:bg-amber-400/10 transition-colors ml-auto whitespace-nowrap">
            Gestisci →
          </Link>
        </div>
      )}

      {/* Alert ticket aperti */}
      {!vuoto && nTicket > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-red-900/10 border border-red-500/20">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="font-body text-sm text-red-400 min-w-0 flex-1">
            {nTicket} {nTicket === 1 ? 'ticket aperto' : 'ticket aperti'} da gestire
          </p>
          <Link to="/admin/assistenza" className="font-body text-xs text-red-400 border border-red-500/30 px-3 py-1.5 hover:bg-red-400/10 transition-colors ml-auto whitespace-nowrap">
            Gestisci →
          </Link>
        </div>
      )}

      <div className="border-t border-white/5 pt-6">
        <Metriche />
      </div>
    </div>
  )
}
