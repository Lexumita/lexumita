// src/pages/avvocato/Dashboard.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageHeader, StatCard } from '@/components/shared'
import { ArrowRight, AlertTriangle, TrendingUp, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function defaultPeriodo() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

function oraDa(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

// ─────────────────────────────────────────────────────────────
// FILTRO PERIODO
// ─────────────────────────────────────────────────────────────
function FiltroPeriodo({ from, to, onChange }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Calendar size={13} className="text-nebbia/30" />
        <span className="font-body text-xs text-nebbia/30">Periodo</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="font-body text-xs text-nebbia/30">Dal</label>
        <input type="date" value={from} onChange={e => onChange({ from: e.target.value, to })}
          className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-1.5 outline-none focus:border-oro/50" />
      </div>
      <div className="flex items-center gap-2">
        <label className="font-body text-xs text-nebbia/30">Al</label>
        <input type="date" value={to} onChange={e => onChange({ from, to: e.target.value })}
          className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-1.5 outline-none focus:border-oro/50" />
      </div>
      <button onClick={() => onChange(defaultPeriodo())}
        className="font-body text-xs text-nebbia/25 hover:text-oro transition-colors border border-white/5 px-2 py-1.5">
        Questo mese
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTI
// ─────────────────────────────────────────────────────────────
function PraticheStato({ stato }) {
  return (
    <div className="bg-slate border border-white/5 p-5">
      <p className="section-label mb-4">Pratiche</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Totale', val: stato.totale, color: 'text-nebbia/70' },
          { label: 'In corso', val: stato.in_corso, color: 'text-salvia' },
          { label: 'In udienza', val: stato.in_udienza, color: 'text-amber-400' },
          { label: 'In attesa', val: stato.in_attesa, color: 'text-nebbia/50' },
          { label: 'Chiuse', val: stato.chiuse, color: 'text-nebbia/40' },
        ].map(({ label, val, color }) => (
          <div key={label} className="text-center p-3 bg-petrolio/40 border border-white/5">
            <p className={`font-display text-2xl font-semibold ${color}`}>{val}</p>
            <p className="font-body text-xs text-nebbia/40 mt-1">{label}</p>
          </div>
        ))}
      </div>
      <Link to="/pratiche" className="font-body text-xs text-oro hover:text-oro/70 flex items-center gap-1 mt-4">
        Vai alle pratiche <ArrowRight size={12} />
      </Link>
    </div>
  )
}

function ProssimiAppuntamenti({ appuntamenti, isStudio }) {
  return (
    <div className="bg-slate border border-white/5 p-5">
      <p className="section-label mb-4">Prossimi appuntamenti</p>
      {appuntamenti.length === 0 ? (
        <p className="font-body text-sm text-nebbia/30 italic">Nessun appuntamento in programma</p>
      ) : appuntamenti.map(a => (
        <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm text-nebbia">{a.cliente?.nome} {a.cliente?.cognome}</p>
            <p className="font-body text-xs text-nebbia/40">
              {a.tipo}{isStudio && a.avvocato ? ` · Avv. ${a.avvocato.cognome}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-body text-xs text-nebbia/60">{new Date(a.data_ora_inizio).toLocaleDateString('it-IT')}</p>
            <p className="font-body text-xs text-oro">{oraDa(a.data_ora_inizio)}</p>
          </div>
        </div>
      ))}
      <Link to="/calendario" className="font-body text-xs text-oro hover:text-oro/70 flex items-center gap-1 mt-4">
        Vai al calendario <ArrowRight size={12} />
      </Link>
    </div>
  )
}

function UltimiMovimenti({ fatture, compensi, isStudio }) {
  const movimenti = [
    ...fatture.map(f => ({
      id: `f-${f.id}`, origine: 'cliente',
      nome: `${f.cliente?.nome ?? ''} ${f.cliente?.cognome ?? ''}`.trim(),
      avv: f.avvocato ? `Avv. ${f.avvocato.cognome}` : null,
      importo: parseFloat(f.importo ?? 0), data: f.data_emissione,
    })),
    ...compensi.map(c => ({
      id: `c-${c.id}`, origine: 'sentenza',
      nome: c.sentenza?.titolo ?? '—', avv: null,
      importo: parseFloat(c.quota_autore ?? 0), data: c.created_at,
    })),
  ].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 6)

  return (
    <div className="bg-slate border border-white/5 p-5">
      <p className="section-label mb-4">Ultimi movimenti</p>
      {movimenti.length === 0 ? (
        <p className="font-body text-sm text-nebbia/30 italic">Nessun movimento nel periodo</p>
      ) : movimenti.map(p => (
        <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
          <span className={`font-body text-[10px] px-2 py-0.5 border shrink-0 ${p.origine === 'sentenza'
            ? 'border-oro/25 text-oro/70 bg-oro/5'
            : 'border-salvia/25 text-salvia/70 bg-salvia/5'}`}>
            {p.origine === 'sentenza' ? 'Sentenza' : 'Cliente'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm text-nebbia truncate">{p.nome}</p>
            {isStudio && p.avv && <p className="font-body text-xs text-nebbia/30">{p.avv}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className={`font-body text-sm font-medium ${p.origine === 'sentenza' ? 'text-oro' : 'text-salvia'}`}>
              + € {p.importo.toFixed(2)}
            </p>
            <p className="font-body text-[10px] text-nebbia/30">{new Date(p.data).toLocaleDateString('it-IT')}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// HOOK — carica tutti i dati
// ids = [meId] per singolo, [meId, ...collaboratoriIds] per studio
// ─────────────────────────────────────────────────────────────
function useDashboard(meId, ids, periodo) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!meId || ids.length === 0) return

    async function carica() {
      setLoading(true)

      const from = periodo.from
      const to = periodo.to + 'T23:59:59'
      const nowIso = new Date().toISOString()
      const isStudio = ids.length > 1

      const [
        { data: pratiche },
        { data: appuntamenti },
        { data: fatture },
        { data: compensi },
        { count: nClienti },
        { data: collaboratori },
      ] = await Promise.all([

        // Pratiche
        supabase.from('pratiche')
          .select('stato')
          .in('avvocato_id', ids),

        // Appuntamenti prossimi
        supabase.from('appuntamenti')
          .select('id, data_ora_inizio, tipo, cliente:cliente_id(nome, cognome), avvocato:avvocato_id(cognome)')
          .in('avvocato_id', ids)
          .eq('stato', 'programmato')
          .gte('data_ora_inizio', nowIso)
          .order('data_ora_inizio').limit(5),

        // Fatture nel periodo
        supabase.from('fatture')
          .select('id, importo, data_emissione, cliente:cliente_id(nome, cognome), avvocato:avvocato_id(cognome)')
          .in('avvocato_id', ids)
          .gte('data_emissione', from).lte('data_emissione', to)
          .order('data_emissione', { ascending: false }).limit(5),

        // Compensi sentenze nel periodo
        supabase.from('accessi_sentenze')
          .select('id, quota_autore, created_at, sentenza:sentenza_id(titolo, autore_id)')
          .in('sentenza.autore_id', ids)
          .gte('created_at', from).lte('created_at', to)
          .order('created_at', { ascending: false }).limit(10),

        // Clienti count
        supabase.from('profiles')
          .select('id', { count: 'exact', head: true })
          .in('avvocato_id', ids)
          .eq('role', 'cliente'),

        // Collaboratori (per sezione membri)
        isStudio
          ? supabase.from('profiles').select('id, nome, cognome').in('id', ids)
          : Promise.resolve({ data: [] }),
      ])

      // Conta pratiche per stato
      const ps = pratiche ?? []
      const statoMap = { in_corso: 0, in_udienza: 0, in_attesa: 0, chiuse: 0 }
      ps.forEach(p => {
        if (p.stato === 'in_corso') statoMap.in_corso++
        else if (p.stato === 'in_udienza') statoMap.in_udienza++
        else if (p.stato === 'in_attesa') statoMap.in_attesa++
        else if (p.stato === 'chiusa') statoMap.chiuse++
      })

      const compMiei = (compensi ?? []).filter(c => ids.includes(c.sentenza?.autore_id))
      const guadagniSentenze = compMiei.reduce((a, c) => a + parseFloat(c.quota_autore ?? 0), 0)
      const guadagniClienti = (fatture ?? []).reduce((a, f) => a + parseFloat(f.importo ?? 0), 0)

      setData({
        pratiche: { ...statoMap, totale: ps.length },
        appuntamenti: appuntamenti ?? [],
        fatture: fatture ?? [],
        compensi: compMiei,
        guadagniSentenze,
        guadagniClienti,
        guadagniTotale: guadagniSentenze + guadagniClienti,
        nClienti: nClienti ?? 0,
        collaboratori: collaboratori ?? [],
      })
      setLoading(false)
    }

    carica()
  }, [meId, ids.join(','), periodo.from, periodo.to])

  return { data, loading }
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD SINGOLA
// ─────────────────────────────────────────────────────────────
function DashboardSingola({ profile, meId, showTrialFeedback, setShowTrialFeedback }) {
  const [periodo, setPeriodo] = useState(defaultPeriodo)
  const { data, loading } = useDashboard(meId, [meId], periodo)

  const pctSent = data && data.guadagniTotale > 0
    ? Math.round((data.guadagniSentenze / data.guadagniTotale) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <PageHeader label="Dashboard" title={`Buongiorno, Avv. ${profile?.cognome ?? ''}`} />
        {showTrialFeedback && (
          <div className="bg-slate border border-oro/25 p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-oro/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
            <div className="relative flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1.5">
                <p className="font-body text-sm font-medium text-oro">La tua prova gratuita è scaduta</p>
                <p className="font-body text-xs text-nebbia/50 leading-relaxed max-w-lg">
                  Come ti sei trovato con Lexum? Scegli un piano per continuare a lavorare
                  con le tue pratiche, clienti e documenti.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setShowTrialFeedback(false)}
                  className="font-body text-xs text-nebbia/30 hover:text-nebbia transition-colors"
                >
                  Dopo
                </button>
                <a
                  href="/studio?tab=acquista"
                  className="flex items-center gap-2 px-5 py-2.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors"
                >
                  Vedi i piani →
                </a>
              </div>
            </div>
          </div>
        )}
        <FiltroPeriodo from={periodo.from} to={periodo.to} onChange={setPeriodo} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Clienti attivi" value={data.nClienti} colorClass="text-oro" />
            <StatCard label="Appuntamenti nel periodo" value={data.appuntamenti.length} colorClass="text-nebbia/60" />
          </div>

          <div className="bg-slate/40 border border-white/5 p-4 space-y-3">
            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={13} /> Guadagni nel periodo
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate border border-white/5 p-4">
                <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Totale</p>
                <p className="font-display text-2xl font-semibold text-oro">€ {data.guadagniTotale.toLocaleString('it-IT')}</p>
              </div>
              <div className="bg-slate border border-white/5 p-4">
                <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Da sentenze</p>
                <p className="font-display text-2xl font-semibold text-oro">€ {data.guadagniSentenze.toLocaleString('it-IT')}</p>
                <p className="font-body text-xs text-nebbia/30 mt-1">{pctSent}% del totale</p>
              </div>
              <div className="bg-slate border border-white/5 p-4">
                <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Da clienti</p>
                <p className="font-display text-2xl font-semibold text-salvia">€ {data.guadagniClienti.toLocaleString('it-IT')}</p>
              </div>
            </div>
          </div>

          <PraticheStato stato={data.pratiche} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ProssimiAppuntamenti appuntamenti={data.appuntamenti} isStudio={false} />
            <UltimiMovimenti fatture={data.fatture} compensi={data.compensi} isStudio={false} />
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD STUDIO
// ─────────────────────────────────────────────────────────────
function DashboardStudio({ profile, meId, collaboratoriIds }) {
  const [periodo, setPeriodo] = useState(defaultPeriodo)
  const ids = [meId, ...collaboratoriIds]
  const { data, loading } = useDashboard(meId, ids, periodo)

  const pctSent = data && data.guadagniTotale > 0
    ? Math.round((data.guadagniSentenze / data.guadagniTotale) * 100) : 0

  const scadenza = profile?.abbonamento_scadenza
  const giorni = scadenza ? Math.ceil((new Date(scadenza) - new Date()) / (1000 * 60 * 60 * 24)) : null
  const inScadenza = giorni !== null && giorni <= 30 && giorni > 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <PageHeader
          label="Dashboard Studio"
          title={`Buongiorno, Avv. ${profile?.cognome ?? ''}`}
          subtitle={profile?.studio ?? ''}
        />
        <FiltroPeriodo from={periodo.from} to={periodo.to} onChange={setPeriodo} />
      </div>

      {!loading && inScadenza && (
        <div className="bg-amber-900/10 border border-amber-500/20 p-4 flex items-center gap-3">
          <AlertTriangle size={15} className="text-amber-400 shrink-0" />
          <p className="font-body text-sm text-nebbia/60 flex-1">
            Abbonamento <span className="text-amber-400">{profile?.abbonamento_tipo ?? ''}</span> in scadenza tra{' '}
            <span className="text-amber-400 font-medium">{giorni} giorni</span>.
          </p>
          <Link to="/studio" className="font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors whitespace-nowrap">
            Rinnova →
          </Link>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Clienti studio" value={data.nClienti} colorClass="text-oro" />
            <StatCard label="Appuntamenti nel periodo" value={data.appuntamenti.length} colorClass="text-nebbia/60" />
          </div>

          <div className="bg-slate/40 border border-white/5 p-4 space-y-3">
            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={13} /> Guadagni studio nel periodo
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate border border-white/5 p-4">
                <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Totale</p>
                <p className="font-display text-2xl font-semibold text-oro">€ {data.guadagniTotale.toLocaleString('it-IT')}</p>
              </div>
              <div className="bg-slate border border-white/5 p-4">
                <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Da sentenze</p>
                <p className="font-display text-2xl font-semibold text-oro">€ {data.guadagniSentenze.toLocaleString('it-IT')}</p>
                <p className="font-body text-xs text-nebbia/30 mt-1">{pctSent}% del totale</p>
              </div>
              <div className="bg-slate border border-white/5 p-4">
                <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Da clienti</p>
                <p className="font-display text-2xl font-semibold text-salvia">€ {data.guadagniClienti.toLocaleString('it-IT')}</p>
              </div>
            </div>
          </div>

          <PraticheStato stato={data.pratiche} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ProssimiAppuntamenti appuntamenti={data.appuntamenti} isStudio={true} />
            <UltimiMovimenti fatture={data.fatture} compensi={data.compensi} isStudio={true} />
          </div>

          {/* Collaboratori */}
          {data.collaboratori.length > 0 && (
            <div className="bg-slate border border-white/5 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="section-label">Collaboratori</p>
                <Link to="/studio" className="font-body text-xs text-oro hover:text-oro/70 flex items-center gap-1">
                  Gestisci <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-0">
                {data.collaboratori.map(c => (
                  <div key={c.id} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
                    <div className="w-8 h-8 bg-salvia/20 border border-salvia/30 flex items-center justify-center shrink-0">
                      <span className="font-display text-xs font-semibold text-salvia">{(c.nome ?? '?')[0]}</span>
                    </div>
                    <p className="font-body text-sm font-medium text-nebbia">{c.nome} {c.cognome}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────
export default function AvvocatoDashboard() {
  const { profile } = useAuth()
  const [showTrialFeedback, setShowTrialFeedback] = useState(false)

  useEffect(() => {
    async function checkTrial() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase
        .from('profiles')
        .select('prova_gratuita_usata, abbonamento_scadenza, piano_id, abbonamento_tipo')
        .eq('id', user.id)
        .single()

      if (
        prof?.prova_gratuita_usata &&
        prof?.abbonamento_scadenza &&
        new Date(prof.abbonamento_scadenza) < new Date() &&
        !prof?.piano_id
      ) {
        setShowTrialFeedback(true)
      }
    }
    checkTrial()
  }, [])
  const [meId, setMeId] = useState(null)
  const [isStudio, setIsStudio] = useState(false)
  const [collaboratoriIds, setCollaboratoriIds] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function carica() {
      const { data: { user } } = await supabase.auth.getUser()
      setMeId(user.id)

      const { data: p } = await supabase
        .from('profiles')
        .select('posti_acquistati')
        .eq('id', user.id)
        .single()

      const haStudio = (p?.posti_acquistati ?? 1) > 1
      setIsStudio(haStudio)

      if (haStudio) {
        const { data: collabs } = await supabase
          .from('profiles')
          .select('id')
          .eq('titolare_id', user.id)
        setCollaboratoriIds((collabs ?? []).map(c => c.id))
      }

      setLoaded(true)
    }
    carica()
  }, [])

  if (!loaded || !meId) return (
    <div className="flex items-center justify-center py-40">
      <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
    </div>
  )

  if (isStudio) return <DashboardStudio profile={profile} meId={meId} collaboratoriIds={collaboratoriIds} />
  return <DashboardSingola profile={profile} meId={meId} showTrialFeedback={showTrialFeedback} setShowTrialFeedback={setShowTrialFeedback} />
}