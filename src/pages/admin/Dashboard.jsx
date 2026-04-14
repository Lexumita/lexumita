// src/pages/admin/Dashboard.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, StatCard } from '@/components/shared'
import {
  Users, ShieldCheck, Headphones, CreditCard,
  BookOpen, Briefcase, AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carica() {
      setLoading(true)

      const [
        { count: nAvvocati },
        { count: nVerifiche },
        { count: nTicket },
        { count: nSentenze },
        { count: nClienti },
        revenuRes,
      ] = await Promise.all([
        // Avvocati attivi (con piano attivo)
        supabase.from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'avvocato'),

        // Verifiche pendenti
        supabase.from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('verification_status', 'pending'),

        // Ticket assistenza aperti verso Lexum
        supabase.from('ticket_assistenza')
          .select('id', { count: 'exact', head: true })
          .is('destinatario_id', null)
          .eq('stato', 'aperto'),

        // Sentenze pubbliche in banca dati
        supabase.from('sentenze')
          .select('id', { count: 'exact', head: true })
          .eq('stato', 'pubblica'),

        // Clienti registrati
        supabase.from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'cliente'),

        // Revenue totale (somma transazioni completate)
        supabase.from('transazioni')
          .select('importo')
          .eq('stato', 'completato'),
      ])

      const revenue = (revenuRes.data ?? []).reduce((a, t) => a + parseFloat(t.importo ?? 0), 0)

      setStats({
        nAvvocati: nAvvocati ?? 0,
        nVerifiche: nVerifiche ?? 0,
        nTicket: nTicket ?? 0,
        nSentenze: nSentenze ?? 0,
        nClienti: nClienti ?? 0,
        revenue,
      })
      setLoading(false)
    }
    carica()
  }, [])

  const STATS = [
    {
      label: 'Avvocati attivi',
      value: loading ? '—' : stats?.nAvvocati ?? 0,
      colorClass: 'text-oro',
      icon: Briefcase,
    },
    {
      label: 'Verifiche pendenti',
      value: loading ? '—' : stats?.nVerifiche ?? 0,
      colorClass: stats?.nVerifiche > 0 ? 'text-amber-400' : 'text-nebbia/30',
      icon: ShieldCheck,
    },
    {
      label: 'Ticket aperti',
      value: loading ? '—' : stats?.nTicket ?? 0,
      colorClass: stats?.nTicket > 0 ? 'text-red-400' : 'text-nebbia/30',
      icon: Headphones,
    },
    {
      label: 'Revenue totale',
      value: loading ? '—' : `€ ${(stats?.revenue ?? 0).toFixed(0)}`,
      colorClass: 'text-salvia',
      icon: CreditCard,
    },
    {
      label: 'Sentenze in banca dati',
      value: loading ? '—' : stats?.nSentenze ?? 0,
      colorClass: 'text-oro',
      icon: BookOpen,
    },
    {
      label: 'Clienti registrati',
      value: loading ? '—' : stats?.nClienti ?? 0,
      colorClass: 'text-nebbia/60',
      icon: Users,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader label="Admin" title="Dashboard" subtitle="Panoramica della piattaforma" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {STATS.map(s => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Alert verifiche pendenti */}
      {!loading && stats?.nVerifiche > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-900/10 border border-amber-500/20">
          <AlertCircle size={16} className="text-amber-400 shrink-0" />
          <p className="font-body text-sm text-amber-400">
            {stats.nVerifiche} {stats.nVerifiche === 1 ? 'avvocato in attesa' : 'avvocati in attesa'} di verifica identità
          </p>
          <Link to="/admin/utenti" className="font-body text-xs text-amber-400 border border-amber-500/30 px-3 py-1.5 hover:bg-amber-400/10 transition-colors ml-auto whitespace-nowrap">
            Gestisci →
          </Link>
        </div>
      )}

      {/* Alert ticket aperti */}
      {!loading && stats?.nTicket > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-900/10 border border-red-500/20">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="font-body text-sm text-red-400">
            {stats.nTicket} {stats.nTicket === 1 ? 'ticket aperto' : 'ticket aperti'} da gestire
          </p>
          <Link to="/admin/assistenza" className="font-body text-xs text-red-400 border border-red-500/30 px-3 py-1.5 hover:bg-red-400/10 transition-colors ml-auto whitespace-nowrap">
            Gestisci →
          </Link>
        </div>
      )}
    </div>
  )
}