// src/pages/admin/Metriche.jsx
//
// 19-10-2026: pannello metriche dell'admin. Per ora due sezioni:
//   - Blog e sito: visite della vetrina (contatore nostro, lib/visite.js), articoli più letti,
//     pagine più viste, da dove arrivano le persone;
//   - Il percorso dei nuovi iscritti: iscritti → email confermata → prima domanda a Lex → acquisto.
// I numeri li calcola il database (admin_metriche_sito, admin_percorso_iscritti), solo per
// gli admin con la verifica in due passaggi.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, StatCard } from '@/components/shared'
import { Eye, LogIn, Newspaper, CalendarClock, UserPlus, MailCheck, MessageSquare, ShoppingBag, Timer } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const PERIODI = [
  { giorni: 7, label: '7 giorni' },
  { giorni: 30, label: '30 giorni' },
  { giorni: 90, label: '90 giorni' },
  { giorni: null, label: 'Da sempre' },
]

const CANALI = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  whatsapp: 'WhatsApp',
  google: 'Google',
  'altri motori': 'Altri motori di ricerca',
  email: 'Mail',
  diretto: 'Diretto (link senza origine o indirizzo scritto)',
}

const RUOLI = {
  user: 'Privati',
  avvocato: 'Avvocati',
  commercialista: 'Commercialisti',
  cliente: 'Clienti degli studi',
  fiduciario: 'Fiduciari',
  progettista: 'Progettisti',
}

const fmt = (n) => (n ?? 0).toLocaleString('it-IT')
const perc = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—')
const dataBreve = (d) => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
const dataLunga = (d) => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

function durata(ore) {
  if (ore == null) return '—'
  if (ore < 1) return `${Math.max(1, Math.round(ore * 60))} min`
  if (ore < 48) return `${ore.toLocaleString('it-IT', { maximumFractionDigits: 1 })} ore`
  return `${Math.round(ore / 24)} giorni`
}

function confronto(ora, prima) {
  if (prima == null) return null
  if (!prima) return ora ? 'periodo prima: 0' : null
  const d = Math.round(((ora - prima) / prima) * 100)
  return `${d >= 0 ? '+' : ''}${d}% sul periodo prima`
}

/* Grafico a barre per giorno; con «chiave2» la parte di quella serie è più chiara */
function BarreGiorni({ dati, chiave, chiave2, etichetta, etichetta2 }) {
  if (!dati?.length) return <p className="font-body text-sm text-nebbia/30">Ancora nessun dato.</p>
  const max = Math.max(1, ...dati.map(d => d[chiave] ?? 0))
  return (
    <div>
      <div className="flex items-end gap-[2px] h-36">
        {dati.map(d => {
          const v = d[chiave] ?? 0
          const v2 = chiave2 ? (d[chiave2] ?? 0) : 0
          return (
            <div key={d.giorno} className="flex-1 h-full flex flex-col justify-end group relative"
              title={`${dataBreve(d.giorno)}: ${fmt(v)} ${etichetta}${chiave2 ? `, di cui ${fmt(v2)} ${etichetta2}` : ''}`}>
              <div className="w-full bg-oro/50 group-hover:bg-oro transition-colors flex flex-col justify-end"
                style={{ height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0 }}>
                {chiave2 && v2 > 0 && <div className="w-full bg-salvia/80" style={{ height: `${(v2 / v) * 100}%` }} />}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-1 font-body text-[10px] text-nebbia/30">
        <span>{dataBreve(dati[0].giorno)}</span>
        {chiave2 && (
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-oro/50" />{etichetta}</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-salvia/80" />{etichetta2}</span>
          </span>
        )}
        <span>{dataBreve(dati[dati.length - 1].giorno)}</span>
      </div>
    </div>
  )
}

/* Barre orizzontali (canali, pagine) */
function BarreOrizzontali({ righe, totale }) {
  if (!righe.length) return <p className="font-body text-sm text-nebbia/30">Ancora nessun dato.</p>
  const max = Math.max(1, ...righe.map(r => r.valore))
  return (
    <div className="space-y-2">
      {righe.map(r => (
        <div key={r.chiave}>
          <div className="flex justify-between gap-3 font-body text-xs mb-0.5">
            <span className="text-nebbia/70 truncate">{r.etichetta}</span>
            <span className="text-nebbia/50 shrink-0">{fmt(r.valore)}{totale ? ` · ${perc(r.valore, totale)}` : ''}</span>
          </div>
          <div className="h-1.5 bg-white/5"><div className="h-full bg-oro/60" style={{ width: `${(r.valore / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

function Riquadro({ titolo, children, nota }) {
  return (
    <div className="bg-slate border border-white/5 p-5">
      <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mb-4">{titolo}</p>
      {children}
      {nota && <p className="font-body text-[11px] text-nebbia/30 mt-3">{nota}</p>}
    </div>
  )
}

function Imbuto({ tappe }) {
  const passi = [
    { chiave: 'iscritti', label: 'Iscritti', icon: UserPlus },
    { chiave: 'email_confermata', label: 'Email confermata', icon: MailCheck },
    { chiave: 'prima_domanda', label: 'Prima domanda a Lex', icon: MessageSquare },
    { chiave: 'acquisto', label: 'Acquisto', icon: ShoppingBag },
  ]
  const base = tappe?.iscritti ?? 0
  return (
    <div className="space-y-3">
      {passi.map((p, i) => {
        const v = tappe?.[p.chiave] ?? 0
        const prima = i ? (tappe?.[passi[i - 1].chiave] ?? 0) : null
        const Icon = p.icon
        return (
          <div key={p.chiave}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="flex items-center gap-2 font-body text-sm text-nebbia/80"><Icon size={14} className="text-oro/70" />{p.label}</span>
              <span className="font-body text-sm text-nebbia">
                <span className="font-semibold">{fmt(v)}</span>
                <span className="text-nebbia/40"> · {perc(v, base)} degli iscritti</span>
                {i > 0 && <span className="text-nebbia/30"> · {perc(v, prima)} della tappa prima</span>}
              </span>
            </div>
            <div className="h-3 bg-white/5"><div className="h-full bg-oro/70" style={{ width: base ? `${(v / base) * 100}%` : 0 }} /></div>
          </div>
        )
      })}
    </div>
  )
}

const Spunta = ({ si }) => <span className={si ? 'text-salvia' : 'text-nebbia/20'}>{si ? '✓' : '·'}</span>

export default function AdminMetriche() {
  const [giorni, setGiorni] = useState(30)
  const [sito, setSito] = useState(null)
  const [iscritti, setIscritti] = useState(null)
  const [errore, setErrore] = useState('')
  const [carico, setCarico] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarico(true); setErrore('')
    Promise.all([
      supabase.rpc('admin_metriche_sito', { p_giorni: giorni }),
      supabase.rpc('admin_percorso_iscritti', { p_giorni: giorni }),
    ]).then(([s, i]) => {
      if (!vivo) return
      if (s.error || i.error) setErrore((s.error || i.error).message)
      setSito(s.data ?? null)
      setIscritti(i.data ?? null)
      setCarico(false)
    })
    return () => { vivo = false }
  }, [giorni])

  const canali = (sito?.provenienze ?? []).map(p => ({ chiave: p.provenienza, etichetta: CANALI[p.provenienza] ?? p.provenienza, valore: p.ingressi }))
  const pagine = (sito?.pagine ?? []).map(p => ({ chiave: p.percorso, etichetta: p.percorso, valore: p.visite }))
  const contatoreDal = sito?.primo_giorno_contato
  const contatoreRecente = contatoreDal && sito?.dal && new Date(contatoreDal) > new Date(sito.dal)

  return (
    <div className="space-y-8">
      <PageHeader label="Admin" title="Metriche" subtitle="Blog e sito, e il percorso dei nuovi iscritti" />

      <div className="flex flex-wrap gap-2">
        {PERIODI.map(p => (
          <button key={p.label} onClick={() => setGiorni(p.giorni)}
            className={`px-4 py-2 font-body text-sm border transition-colors ${giorni === p.giorni
              ? 'border-oro text-oro bg-oro/10' : 'border-white/10 text-nebbia/50 hover:text-nebbia hover:border-white/20'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {errore && <p className="font-body text-sm text-red-400">{errore}</p>}
      {carico && !sito && (
        <div className="flex justify-center py-20"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
      )}

      {sito && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-light text-nebbia">Blog e sito</h2>
          {(!contatoreDal || contatoreRecente) && (
            <p className="font-body text-xs text-nebbia/40">
              {contatoreDal
                ? `Il contatore delle visite è partito il ${dataLunga(contatoreDal)}: le visite di prima si vedono solo su Vercel → Analytics.`
                : 'Il contatore delle visite parte con la prossima pubblicazione del sito: fino ad allora le visite si vedono solo su Vercel → Analytics.'}
            </p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Visite" value={fmt(sito.visite)} sub={confronto(sito.visite, sito.visite_periodo_prima)} icon={Eye} />
            <StatCard label="Ingressi da fuori" value={fmt(sito.ingressi)} sub="persone arrivate da un altro sito o da un link" icon={LogIn} />
            <StatCard label="Visite agli articoli" value={fmt(sito.visite_articoli)} icon={Newspaper} />
            <StatCard label="Articoli programmati" value={fmt(sito.articoli_programmati)} sub="in uscita nei prossimi giorni" icon={CalendarClock} />
          </div>

          <Riquadro titolo="Visite al giorno">
            <BarreGiorni dati={sito.per_giorno} chiave="visite" chiave2="articoli" etichetta="visite" etichetta2="agli articoli" />
          </Riquadro>

          <div className="grid lg:grid-cols-2 gap-4">
            <Riquadro titolo="Da dove arrivano" nota="Conta la prima pagina di ogni visita. I link con utm_source (per esempio nelle mail) compaiono col loro nome.">
              <BarreOrizzontali righe={canali} totale={sito.ingressi} />
            </Riquadro>
            <Riquadro titolo="Pagine più viste">
              <BarreOrizzontali righe={pagine} totale={sito.visite} />
            </Riquadro>
          </div>

          <Riquadro titolo="Articoli">
            {(sito.articoli ?? []).length === 0 ? (
              <p className="font-body text-sm text-nebbia/30">Nessun articolo pubblicato.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="text-left text-[10px] tracking-widest uppercase text-nebbia/30 border-b border-white/5">
                      <th className="py-2 pr-3 font-medium">Articolo</th>
                      <th className="py-2 px-3 font-medium whitespace-nowrap">Pubblicato</th>
                      <th className="py-2 px-3 font-medium text-right whitespace-nowrap">Visite nel periodo</th>
                      <th className="py-2 px-3 font-medium text-right whitespace-nowrap">Da Instagram</th>
                      <th className="py-2 pl-3 font-medium text-right">Totali</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sito.articoli.map(a => (
                      <tr key={a.slug} className="border-b border-white/5 last:border-0">
                        <td className="py-2 pr-3">
                          <a href={`/novita/${a.slug}`} target="_blank" rel="noreferrer" className="text-nebbia/80 hover:text-oro">{a.titolo}</a>
                          {a.categoria && <span className="block font-body text-[10px] text-nebbia/30">{a.categoria}</span>}
                        </td>
                        <td className="py-2 px-3 text-nebbia/40 whitespace-nowrap">{a.pubblicato_il ? dataBreve(a.pubblicato_il) : '—'}</td>
                        <td className="py-2 px-3 text-right text-nebbia">{fmt(a.visite)}</td>
                        <td className="py-2 px-3 text-right text-nebbia/50">{fmt(a.da_instagram)}</td>
                        <td className="py-2 pl-3 text-right text-nebbia/50">{fmt(a.visite_totali)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Riquadro>
        </section>
      )}

      {iscritti && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-light text-nebbia">Il percorso dei nuovi iscritti</h2>
          <p className="font-body text-xs text-nebbia/40">
            Chi si è iscritto nel periodo scelto e fin dove è arrivato. Sono esclusi admin e commerciali.
          </p>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Riquadro titolo="Dall'iscrizione all'acquisto">
                <Imbuto tappe={iscritti.tappe} />
              </Riquadro>
            </div>
            <StatCard label="Tempo alla prima domanda" value={durata(iscritti.ore_alla_prima_domanda)}
              sub="metà degli iscritti la fa entro questo tempo" icon={Timer} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Riquadro titolo="Iscritti al giorno">
              <BarreGiorni dati={iscritti.per_giorno} chiave="iscritti" etichetta="iscritti" />
            </Riquadro>
            <Riquadro titolo="Per tipo di utente">
              {(iscritti.per_ruolo ?? []).length === 0 ? (
                <p className="font-body text-sm text-nebbia/30">Nessun iscritto nel periodo.</p>
              ) : (
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="text-left text-[10px] tracking-widest uppercase text-nebbia/30 border-b border-white/5">
                      <th className="py-2 pr-2 font-medium">Tipo</th>
                      <th className="py-2 px-2 font-medium text-right">Iscritti</th>
                      <th className="py-2 px-2 font-medium text-right">Email ok</th>
                      <th className="py-2 px-2 font-medium text-right">Domanda</th>
                      <th className="py-2 pl-2 font-medium text-right">Acquisto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iscritti.per_ruolo.map(r => (
                      <tr key={r.ruolo} className="border-b border-white/5 last:border-0">
                        <td className="py-2 pr-2 text-nebbia/80">{RUOLI[r.ruolo] ?? r.ruolo}</td>
                        <td className="py-2 px-2 text-right text-nebbia">{fmt(r.iscritti)}</td>
                        <td className="py-2 px-2 text-right text-nebbia/60">{fmt(r.email_confermata)}</td>
                        <td className="py-2 px-2 text-right text-nebbia/60">{fmt(r.prima_domanda)}</td>
                        <td className="py-2 pl-2 text-right text-nebbia/60">{fmt(r.acquisto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Riquadro>
          </div>

          <Riquadro titolo="Ultimi iscritti" nota="Le ultime 30 iscrizioni del periodo. Il nome apre la scheda dell'utente.">
            {(iscritti.ultimi ?? []).length === 0 ? (
              <p className="font-body text-sm text-nebbia/30">Nessun iscritto nel periodo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="text-left text-[10px] tracking-widest uppercase text-nebbia/30 border-b border-white/5">
                      <th className="py-2 pr-3 font-medium">Quando</th>
                      <th className="py-2 px-3 font-medium">Chi</th>
                      <th className="py-2 px-3 font-medium">Tipo</th>
                      <th className="py-2 px-3 font-medium text-center">Email</th>
                      <th className="py-2 px-3 font-medium text-center">Domanda</th>
                      <th className="py-2 pl-3 font-medium text-center">Acquisto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iscritti.ultimi.map(u => (
                      <tr key={u.id} className="border-b border-white/5 last:border-0">
                        <td className="py-2 pr-3 text-nebbia/40 whitespace-nowrap">{dataBreve(u.quando)}</td>
                        <td className="py-2 px-3">
                          <Link to={`/admin/utenti/${u.id}`} className="text-nebbia/80 hover:text-oro">{u.nome || u.email}</Link>
                          {u.nome && <span className="block text-[11px] text-nebbia/30">{u.email}</span>}
                        </td>
                        <td className="py-2 px-3 text-nebbia/50">{RUOLI[u.ruolo] ?? u.ruolo}</td>
                        <td className="py-2 px-3 text-center"><Spunta si={u.email_confermata} /></td>
                        <td className="py-2 px-3 text-center"><Spunta si={u.prima_domanda} /></td>
                        <td className="py-2 pl-3 text-center"><Spunta si={u.acquisto} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Riquadro>
        </section>
      )}
    </div>
  )
}
