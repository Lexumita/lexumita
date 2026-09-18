// src/pages/admin/Dashboard.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, StatCard } from '@/components/shared'
import {
  Users, ShieldCheck, Headphones, CreditCard,
  BookOpen, Briefcase, AlertCircle, UserCheck
} from 'lucide-react'
import {
  caricaContatoriAdmin, totaliProfessionisti, composizioneIscritti, formattaImporto
} from '@/lib/contatoriAdmin'

const QUICK = [
  {
    to: '/admin/utenti',
    label: 'Coda verifiche',
    desc: 'Approva o rifiuta richieste avvocati',
    border: 'border-amber-500/30 hover:border-amber-500/50',
  },
  {
    to: '/admin/assistenza',
    label: 'Assistenza',
    desc: 'Gestisci i ticket aperti',
    border: 'border-red-500/30 hover:border-red-500/50',
  },
  {
    to: '/admin/prodotti',
    label: 'Prodotti',
    desc: 'Abbonamenti e accessi singoli',
    border: 'border-oro/30 hover:border-oro/50',
  },
  {
    to: '/admin/pagamenti',
    label: 'Compensi',
    desc: 'Revenue sharing avvocati',
    border: 'border-salvia/30 hover:border-salvia/50',
  },
]

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
  const prof = totaliProfessionisti(c)
  const nVerifiche = c?.verifiche_pendenti ?? 0
  const nTicket = c?.ticket_aperti ?? 0
  const valuta = c?.valuta ?? 'EUR'
  const altreValute = Object.entries(c?.ricavi ?? {}).filter(([v, tot]) => v !== valuta && Number(tot) !== 0)

  const subProfessionisti = [
    `su ${prof.totale}`,
    prof.in_grazia ? `${prof.in_grazia} in grazia` : null,
    prof.scaduti ? `${prof.scaduti} ${prof.scaduti === 1 ? 'scaduto' : 'scaduti'}` : null,
    prof.senza_piano ? `${prof.senza_piano} senza piano` : null,
  ].filter(Boolean).join(' · ')

  const STATS = [
    {
      label: 'Utenti registrati',
      value: vuoto ? '—' : c.totale,
      sub: vuoto ? null : composizioneIscritti(c),
      colorClass: 'text-nebbia',
      icon: Users,
    },
    {
      label: 'Professionisti attivi',
      value: vuoto ? '—' : prof.attivi,
      sub: vuoto ? null : subProfessionisti,
      colorClass: 'text-oro',
      icon: Briefcase,
    },
    {
      label: 'Clienti registrati',
      value: vuoto ? '—' : c.per_ruolo?.cliente ?? 0,
      colorClass: 'text-nebbia/60',
      icon: UserCheck,
    },
    {
      label: 'Verifiche pendenti',
      value: vuoto ? '—' : nVerifiche,
      colorClass: nVerifiche > 0 ? 'text-amber-400' : 'text-nebbia/30',
      icon: ShieldCheck,
    },
    {
      label: 'Ticket aperti',
      value: vuoto ? '—' : nTicket,
      colorClass: nTicket > 0 ? 'text-red-400' : 'text-nebbia/30',
      icon: Headphones,
    },
    {
      label: 'Revenue totale',
      value: vuoto ? '—' : formattaImporto(c.ricavi?.[valuta], valuta),
      sub: altreValute.length ? altreValute.map(([v, tot]) => `+ ${formattaImporto(tot, v)}`).join(' · ') : null,
      colorClass: 'text-salvia',
      icon: CreditCard,
    },
    {
      label: 'Sentenze in banca dati',
      value: vuoto ? '—' : c.sentenze_pubbliche ?? 0,
      colorClass: 'text-oro',
      icon: BookOpen,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader label="Admin" title="Dashboard" subtitle="Panoramica della piattaforma" />

      {errore && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
          <AlertCircle size={14} /> {errore}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STATS.map(s => (
          <StatCard key={s.label} {...s} />
        ))}
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
    </div>
  )
}
