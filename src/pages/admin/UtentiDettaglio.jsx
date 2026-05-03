// src/pages/admin/UtentiDettaglio.jsx

import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { BackButton, Badge, StatCard } from '@/components/shared'
import {
  ShieldOff, Lock, Clock, FileText,
  FolderOpen, User,
  CheckCircle, XCircle, AlertCircle, ArrowRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
const ROLE_BADGE = {
  admin: { label: 'Admin', variant: 'red' },
  avvocato: { label: 'Avvocato', variant: 'oro' },
  cliente: { label: 'Cliente', variant: 'salvia' },
  user: { label: 'User', variant: 'gray' },
}

const STATI_PRATICA = {
  in_corso: { label: 'In corso', variant: 'salvia' },
  in_udienza: { label: 'In udienza', variant: 'warning' },
  in_attesa: { label: 'In attesa', variant: 'gray' },
  chiusa: { label: 'Chiusa', variant: 'gray' },
}

// ─────────────────────────────────────────────────────────────
// SEZIONE AVVOCATO
// ─────────────────────────────────────────────────────────────
function SezioneAvvocato({ utente }) {
  const [tab, setTab] = useState('panoramica')
  const [clienti, setClienti] = useState([])
  const [pratiche, setPratiche] = useState([])
  const [collaboratori, setCollaboratori] = useState([])

  // Dati piano direttamente dall'utente (profiles)
  const scadenza = utente.abbonamento_scadenza
  const isScad = scadenza && new Date(scadenza) < new Date()
  const hasPiano = !!utente.piano_id
  const postiTot = utente.posti_acquistati ?? 1
  const postiUsati = utente.posti_usati ?? 1

  useEffect(() => {
    async function carica() {
      const [{ data: cl }, { data: pr }, { data: collabs }] = await Promise.all([
        supabase.from('profiles').select('id, nome, cognome').eq('avvocato_id', utente.id).eq('role', 'cliente'),
        supabase.from('pratiche').select('id, titolo, tipo, stato, created_at').eq('avvocato_id', utente.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('profiles').select('id, nome, cognome').eq('titolare_id', utente.id),
      ])
      setClienti(cl ?? [])
      setPratiche(pr ?? [])
      setCollaboratori(collabs ?? [])
    }
    carica()
  }, [utente.id])

  const TABS = [
    { id: 'panoramica', label: 'Panoramica', icon: User },
    { id: 'clienti', label: 'Clienti', icon: FolderOpen },
    { id: 'pratiche', label: 'Pratiche', icon: FileText },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Clienti" value={clienti.length} colorClass="text-oro" />
        <StatCard label="Pratiche" value={pratiche.length} colorClass="text-salvia" />
        <StatCard label="Collaboratori" value={collaboratori.length} colorClass="text-nebbia/60" />
      </div>

      {/* Piano attivo */}
      {hasPiano && (
        <div className={`border p-4 flex items-center justify-between gap-4 ${isScad ? 'bg-red-900/10 border-red-500/20' : 'bg-slate border-white/5'}`}>
          <div>
            <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Piano attivo</p>
            <p className="font-body text-sm font-medium text-nebbia">{utente.abbonamento_tipo ?? '—'}</p>
            {scadenza && (
              <p className={`font-body text-xs mt-0.5 ${isScad ? 'text-red-400' : 'text-nebbia/40'}`}>
                {isScad ? 'Scaduto' : `Scade il ${new Date(scadenza).toLocaleDateString('it-IT')}`}
              </p>
            )}
          </div>
          <p className="font-body text-xs text-nebbia/40">Accessi: {postiUsati} / {postiTot}</p>
        </div>
      )}

      <div className="flex gap-0 border-b border-white/8 overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} onClick={() => setTab(tid)}
            className={`flex items-center gap-2 px-4 py-3 font-body text-sm whitespace-nowrap border-b-2 transition-colors ${tab === tid ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'}`}>
            <Icon size={13} strokeWidth={1.5} /> {label}
          </button>
        ))}
      </div>

      {tab === 'panoramica' && (
        <div className="bg-slate border border-white/5 p-5 space-y-3">
          {[
            ['Studio', utente.studio ?? '—'],
            ['Piano', utente.abbonamento_tipo ?? '—'],
            ['Tipo account', utente.tipo_account ?? '—'],
            ['Accessi', `${postiUsati} / ${postiTot}`],
            ['Banca dati', utente.include_banca_dati ? 'Inclusa' : 'Non inclusa'],
            ['Monetizzazione', utente.include_monetizzazione ? 'Inclusa' : 'Non inclusa'],
            ['Registrato il', new Date(utente.created_at).toLocaleDateString('it-IT')],
            ['Verifica', utente.verification_status === 'approved' ? 'Verificato' : utente.verification_status ?? '—'],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between border-b border-white/5 pb-2">
              <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
              <span className="font-body text-sm text-nebbia">{v}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'clienti' && (
        <div className="space-y-2">
          {clienti.length === 0
            ? <p className="font-body text-sm text-nebbia/30 text-center py-8">Nessun cliente</p>
            : clienti.map(c => (
              <Link key={c.id} to={`/admin/utenti/${c.id}`}
                className="flex items-center justify-between bg-slate border border-white/5 hover:border-oro/20 p-4 transition-all">
                <p className="font-body text-sm text-nebbia">{c.nome} {c.cognome}</p>
                <ArrowRight size={14} className="text-nebbia/20" />
              </Link>
            ))
          }
        </div>
      )}

      {tab === 'pratiche' && (
        <div className="bg-slate border border-white/5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Pratica', 'Tipo', 'Stato', 'Creata il'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pratiche.length === 0
                ? <tr><td colSpan={4} className="px-4 py-8 text-center font-body text-sm text-nebbia/30">Nessuna pratica</td></tr>
                : pratiche.map(p => {
                  const sc = STATI_PRATICA[p.stato] ?? STATI_PRATICA.in_corso
                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                      <td className="px-4 py-3 font-body text-sm font-medium text-nebbia truncate max-w-xs">{p.titolo}</td>
                      <td className="px-4 py-3 font-body text-xs text-nebbia/40">{p.tipo ?? '—'}</td>
                      <td className="px-4 py-3"><Badge label={sc.label} variant={sc.variant} /></td>
                      <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('it-IT')}</td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// SEZIONE CLIENTE
// ─────────────────────────────────────────────────────────────
function SezioneCliente({ utente }) {
  const [tab, setTab] = useState('panoramica')
  const [pratiche, setPratiche] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carica() }, [utente.id])

  async function carica() {
    setLoading(true)
    const { data: pr } = await supabase
      .from('pratiche')
      .select('id, titolo, tipo, stato, created_at, prossima_udienza')
      .eq('cliente_id', utente.id)
      .order('created_at', { ascending: false })
    setPratiche(pr ?? [])
    setLoading(false)
  }

  const TABS = [
    { id: 'panoramica', label: 'Panoramica', icon: User },
    { id: 'pratiche', label: 'Pratiche', icon: FolderOpen },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-0 border-b border-white/8 overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} onClick={() => setTab(tid)}
            className={`flex items-center gap-2 px-4 py-3 font-body text-sm whitespace-nowrap border-b-2 transition-colors ${tab === tid ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'}`}>
            <Icon size={13} strokeWidth={1.5} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
      ) : (
        <>
          {tab === 'panoramica' && (
            <div className="space-y-4">
              <div className="bg-slate border border-white/5 p-5 space-y-3">
                {[
                  ['Email', utente.email],
                  ['Telefono', utente.telefono ?? '—'],
                  ['Codice fiscale', utente.cf ?? '—'],
                  ['Indirizzo', utente.indirizzo ?? '—'],
                  ['Registrato il', new Date(utente.created_at).toLocaleDateString('it-IT')],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                    <span className="font-body text-sm text-nebbia">{v}</span>
                  </div>
                ))}
              </div>
              <StatCard label="Pratiche aperte" value={pratiche.length} colorClass="text-oro" />
              <div className="flex items-center gap-2 p-3 bg-amber-900/10 border border-amber-500/20">
                <Lock size={13} className="text-amber-400 shrink-0" />
                <p className="font-body text-xs text-amber-400">
                  Documenti, comunicazioni, note interne e pagamenti del cliente non sono accessibili dall'admin per tutela del segreto professionale.
                </p>
              </div>
            </div>
          )}

          {tab === 'pratiche' && (
            <div className="bg-slate border border-white/5 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Pratica', 'Tipo', 'Stato', 'Pross. udienza', 'Creata il'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pratiche.length === 0
                    ? <tr><td colSpan={5} className="px-4 py-8 text-center font-body text-sm text-nebbia/30">Nessuna pratica</td></tr>
                    : pratiche.map(p => {
                      const sc = STATI_PRATICA[p.stato] ?? STATI_PRATICA.in_corso
                      return (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                          <td className="px-4 py-3 font-body text-sm font-medium text-nebbia truncate max-w-xs">{p.titolo}</td>
                          <td className="px-4 py-3 font-body text-xs text-nebbia/40">{p.tipo ?? '—'}</td>
                          <td className="px-4 py-3"><Badge label={sc.label} variant={sc.variant} /></td>
                          <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{p.prossima_udienza ? new Date(p.prossima_udienza).toLocaleDateString('it-IT') : '—'}</td>
                          <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('it-IT')}</td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            </div>
          )}

          {tab === 'documenti' && (
            documenti.length === 0
              ? <p className="font-body text-sm text-nebbia/30 text-center py-8">Nessun documento</p>
              : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        {['Nome file', 'Dimensione', 'Visibile', 'Caricato il', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {documenti.map(doc => (
                        <tr key={doc.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText size={13} className="text-oro/60 shrink-0" />
                              <span className="font-body text-sm text-nebbia truncate max-w-xs">{doc.nome}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-body text-xs text-nebbia/40">{formatSize(doc.dimensione)}</td>
                          <td className="px-4 py-3">
                            <span className={`font-body text-xs px-2 py-0.5 border ${doc.visibile_cliente ? 'border-salvia/25 text-salvia bg-salvia/5' : 'border-white/10 text-nebbia/30'}`}>
                              {doc.visibile_cliente ? 'Sì' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{new Date(doc.created_at).toLocaleDateString('it-IT')}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => scaricaDoc(doc)} className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors">
                              <Download size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          )}

          {tab === 'comunicazioni' && (
            <div className="space-y-3">
              <div className="bg-petrolio/40 border border-white/5 px-4 py-3">
                <p className="font-body text-xs text-nebbia/40">Messaggi tra avvocato e cliente. Sola lettura.</p>
              </div>
              {ticketAperto ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setTicketAperto(null); setMessaggiChat([]) }} className="text-nebbia/40 hover:text-nebbia transition-colors">
                      <ArrowRight size={16} className="rotate-180" />
                    </button>
                    <p className="font-body text-sm font-medium text-nebbia">{ticketAperto.oggetto}</p>
                    <Badge label={ticketAperto.stato === 'aperto' ? 'Aperto' : 'Chiuso'} variant={ticketAperto.stato === 'aperto' ? 'salvia' : 'gray'} />
                  </div>
                  <div className="bg-slate border border-white/5 overflow-y-auto p-5 space-y-3" style={{ maxHeight: 420 }}>
                    {messaggiChat.length === 0
                      ? <p className="font-body text-sm text-nebbia/30 text-center py-8">Nessun messaggio</p>
                      : messaggiChat.map(msg => {
                        const isMio = msg.autore_tipo === 'avvocato'
                        return (
                          <div key={msg.id} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-sm px-4 py-2.5 ${isMio ? 'bg-oro/15 border border-oro/20' : 'bg-petrolio border border-white/10'}`}>
                              <p className={`font-body text-[10px] font-medium mb-1 ${isMio ? 'text-oro/60 text-right' : 'text-nebbia/40'}`}>
                                {msg.autore?.nome} {msg.autore?.cognome} · {msg.autore_tipo}
                              </p>
                              <p className="font-body text-sm text-nebbia leading-relaxed">{msg.testo}</p>
                              <p className={`font-body text-[10px] text-nebbia/25 mt-1 ${isMio ? 'text-right' : ''}`}>
                                {new Date(msg.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    }
                    <div ref={bottomRef} />
                  </div>
                </div>
              ) : (
                tickets.length === 0
                  ? <p className="font-body text-sm text-nebbia/30 text-center py-8">Nessuna comunicazione</p>
                  : (
                    <div className="space-y-2">
                      {tickets.map(t => (
                        <button key={t.id} onClick={() => apriChat(t)} className="w-full text-left bg-slate border border-white/5 hover:border-oro/20 p-4 transition-all">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-body text-sm font-medium text-nebbia truncate">{t.oggetto}</p>
                              <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                {`${t.mittente?.nome ?? ''} ${t.mittente?.cognome ?? ''}`.trim()} · {new Date(t.created_at).toLocaleDateString('it-IT')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge label={t.stato === 'aperto' ? 'Aperto' : 'Chiuso'} variant={t.stato === 'aperto' ? 'salvia' : 'gray'} />
                              <ArrowRight size={14} className="text-nebbia/20" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
              )}
            </div>
          )}

          {tab === 'note_interne' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-amber-900/10 border border-amber-500/20">
                <Lock size={13} className="text-amber-400 shrink-0" />
                <p className="font-body text-xs text-amber-400">Note interne scritte dall'avvocato su questo cliente. Sola lettura.</p>
              </div>
              {note.length === 0
                ? <p className="font-body text-sm text-nebbia/30 text-center py-8">Nessuna nota</p>
                : note.map(n => (
                  <div key={n.id} className="bg-slate border border-white/5 p-4">
                    <p className="font-body text-sm text-nebbia/70 leading-relaxed">{n.testo}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock size={10} className="text-nebbia/25" />
                      <span className="font-body text-xs text-nebbia/30">{n.autore?.nome} {n.autore?.cognome} · {new Date(n.created_at).toLocaleString('it-IT')}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {tab === 'pagamenti' && (
            <div className="space-y-4">
              {fatture.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate border border-white/5 p-4">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Da incassare</p>
                    <p className="font-display text-2xl font-semibold text-oro">€ {totaleAperto.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate border border-white/5 p-4">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Incassato</p>
                    <p className="font-display text-2xl font-semibold text-salvia">€ {totalePagato.toFixed(2)}</p>
                  </div>
                </div>
              )}
              {fatture.length === 0
                ? <p className="font-body text-sm text-nebbia/30 text-center py-8">Nessuna fattura</p>
                : (
                  <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          {['Numero', 'Importo', 'Descrizione', 'Emessa il', 'Stato'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fatture.map(fatt => {
                          const sc = STATI_FATTURA[fatt.stato] ?? STATI_FATTURA.in_attesa
                          return (
                            <tr key={fatt.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                              <td className="px-4 py-3 font-body text-xs text-nebbia/60 font-medium">{fatt.numero}</td>
                              <td className="px-4 py-3 font-body text-sm font-semibold text-oro">€ {parseFloat(fatt.importo).toFixed(2)}</td>
                              <td className="px-4 py-3 font-body text-xs text-nebbia/50 max-w-xs truncate">{fatt.descrizione ?? '—'}</td>
                              <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{new Date(fatt.data_emissione).toLocaleDateString('it-IT')}</td>
                              <td className="px-4 py-3"><Badge label={sc.label} variant={sc.variant} /></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SEZIONE USER
// ─────────────────────────────────────────────────────────────
// Helper inline per renderizzare campo: "Etichetta — valore" o "—"
function CampoRiga({ label, value }) {
  const display = value === null || value === undefined || value === '' ? '—' : value
  return (
    <div className="flex justify-between items-start gap-3 border-b border-white/5 pb-2">
      <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest shrink-0">{label}</span>
      <span className="font-body text-sm text-nebbia text-right break-words">{display}</span>
    </div>
  )
}

function SezioneUser({ utente, onDecision }) {
  const [motivazione, setMotivazione] = useState('')
  const [elaborando, setElaborando] = useState(false)
  const [errore, setErrore] = useState('')
  const [decisione, setDecisione] = useState(utente.verification_status)
  const [docs, setDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [emailStatus, setEmailStatus] = useState(null)

  // Carica documenti di verifica + stato email
  useEffect(() => {
    async function caricaDati() {
      setLoadingDocs(true)
      const [{ data: docsData }, { data: emailData }] = await Promise.all([
        supabase.storage.from('verification-docs').list(utente.id),
        supabase.rpc('admin_get_email_status', { p_user_id: utente.id }),
      ])
      setDocs(docsData ?? [])
      setEmailStatus(Array.isArray(emailData) ? emailData[0] : emailData)
      setLoadingDocs(false)
    }
    caricaDati()
  }, [utente.id])

  async function apriDoc(name) {
    const { data } = await supabase.storage
      .from('verification-docs')
      .createSignedUrl(`${utente.id}/${name}`, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleDecisione(tipo) {
    if (tipo === 'rejected' && !motivazione.trim()) return setErrore('La motivazione è obbligatoria per il rifiuto')
    setErrore(''); setElaborando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fnName = tipo === 'approved' ? 'approve-verifica' : 'reject-verifica'
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ user_id: utente.id, motivazione }),
        }
      )
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setDecisione(tipo); onDecision(tipo)
    } catch (err) { setErrore(err.message) } finally { setElaborando(false) }
  }

  const isPersonaGiuridica = utente.tipo_soggetto === 'persona_giuridica'
  const haDatiAvvocato = utente.foro || utente.numero_albo || utente.pec || utente.data_iscrizione_albo
  const haDatiResidenza = utente.indirizzo || utente.comune || utente.cap || utente.provincia
  const haNoteAdmin = utente.note_admin || utente.verification_note
  const labelDocs = { identita: 'Documento identità', albo: 'Iscrizione Albo', laurea: 'Laurea' }

  return (
    <div className="space-y-4">
      {/* Status verifica */}
      <div className={`border p-4 flex items-center gap-3 ${decisione === 'approved' ? 'bg-salvia/5 border-salvia/20' :
        decisione === 'rejected' ? 'bg-red-900/10 border-red-500/20' :
          decisione === 'pending' ? 'bg-amber-900/10 border-amber-500/20' :
            'bg-slate border-white/5'
        }`}>
        <div className={`w-2 h-2 rounded-full shrink-0 ${decisione === 'approved' ? 'bg-salvia' :
          decisione === 'rejected' ? 'bg-red-400' :
            decisione === 'pending' ? 'bg-amber-400' :
              'bg-nebbia/20'
          }`} />
        <p className={`font-body text-sm flex-1 ${decisione === 'approved' ? 'text-salvia' :
          decisione === 'rejected' ? 'text-red-400' :
            decisione === 'pending' ? 'text-amber-400' :
              'text-nebbia/60'
          }`}>
          {decisione === 'approved' ? 'Verifica approvata — l\'utente può accedere come avvocato' :
            decisione === 'rejected' ? 'Verifica rifiutata' :
              decisione === 'pending' ? 'Verifica identità in attesa di revisione' :
                'Nessuna richiesta di verifica'}
        </p>
        {utente.prova_gratuita_usata && (
          <span className="font-body text-xs px-2 py-0.5 bg-white/5 border border-white/10 text-nebbia/50">
            Trial usato
          </span>
        )}
      </div>

      {/* Anagrafica */}
      <div className="bg-slate border border-white/5 p-5 space-y-3">
        <p className="section-label mb-3">Anagrafica</p>
        <CampoRiga label="Nome completo" value={`${utente.nome ?? ''} ${utente.cognome ?? ''}`.trim() || null} />
        <div className="flex justify-between items-start gap-3 border-b border-white/5 pb-2">
          <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest shrink-0">Email</span>
          <div className="flex items-center gap-2 text-right">
            <span className="font-body text-sm text-nebbia break-all">{utente.email ?? '—'}</span>
            {emailStatus && (
              emailStatus.email_confirmed ? (
                <span className="font-body text-[10px] px-1.5 py-0.5 bg-salvia/10 border border-salvia/30 text-salvia uppercase tracking-wider whitespace-nowrap shrink-0">
                  ✓ Verificata
                </span>
              ) : (
                <span className="font-body text-[10px] px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/30 text-amber-400 uppercase tracking-wider whitespace-nowrap shrink-0">
                  Non verificata
                </span>
              )
            )}
          </div>
        </div>
        <CampoRiga label="Telefono" value={utente.telefono} />
        <CampoRiga label="Codice fiscale" value={utente.cf} />
        <CampoRiga label="Data di nascita" value={utente.data_nascita ? new Date(utente.data_nascita).toLocaleDateString('it-IT') : null} />
        <CampoRiga label="Luogo di nascita" value={utente.luogo_nascita} />
      </div>

      {/* Residenza/Indirizzo */}
      {haDatiResidenza && (
        <div className="bg-slate border border-white/5 p-5 space-y-3">
          <p className="section-label mb-3">Residenza</p>
          <CampoRiga label="Indirizzo" value={utente.indirizzo} />
          <CampoRiga label="Comune" value={utente.comune} />
          <CampoRiga label="Provincia" value={utente.provincia} />
          <CampoRiga label="CAP" value={utente.cap} />
        </div>
      )}

      {/* Dati professionali (se compilati) */}
      {(haDatiAvvocato || utente.specializzazioni?.length > 0 || utente.studio || utente.partita_iva) && (
        <div className="bg-slate border border-white/5 p-5 space-y-3">
          <p className="section-label mb-3">Dati professionali</p>
          <CampoRiga label="Studio" value={utente.studio} />
          <CampoRiga label="Foro" value={utente.foro} />
          <CampoRiga label="Numero Albo" value={utente.numero_albo} />
          <CampoRiga label="Iscritto dal" value={utente.data_iscrizione_albo ? new Date(utente.data_iscrizione_albo).toLocaleDateString('it-IT') : null} />
          <CampoRiga label="PEC" value={utente.pec} />
          <CampoRiga label="Partita IVA" value={utente.partita_iva} />
          {utente.specializzazioni?.length > 0 && (
            <div className="flex justify-between items-start gap-3 border-b border-white/5 pb-2">
              <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest shrink-0">Specializzazioni</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {utente.specializzazioni.map(s => (
                  <span key={s} className="font-body text-xs px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/70">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Persona giuridica (se applicabile) */}
      {isPersonaGiuridica && (
        <div className="bg-slate border border-white/5 p-5 space-y-3">
          <p className="section-label mb-3">Persona giuridica</p>
          <CampoRiga label="Ragione sociale" value={utente.ragione_sociale} />
          <CampoRiga label="Sede legale" value={utente.sede_legale} />
          <CampoRiga label="Legale rappresentante" value={utente.rappr_nome || utente.rappr_cognome ? `${utente.rappr_nome ?? ''} ${utente.rappr_cognome ?? ''}`.trim() : null} />
          <CampoRiga label="CF rappresentante" value={utente.rappr_cf} />
          <CampoRiga label="Carica" value={utente.rappr_carica} />
        </div>
      )}

      {/* Account */}
      <div className="bg-slate border border-white/5 p-5 space-y-3">
        <p className="section-label mb-3">Account</p>
        <CampoRiga label="Ruolo" value={utente.role} />
        <CampoRiga label="Tipo account" value={utente.tipo_account} />
        <CampoRiga label="Tipo soggetto" value={utente.tipo_soggetto} />
        <CampoRiga label="Visibile pubblicamente" value={utente.visibile_pubblicamente ? 'Sì' : 'No'} />
        <CampoRiga label="Stripe customer ID" value={utente.stripe_customer_id} />
        <CampoRiga label="Registrato il" value={new Date(utente.created_at).toLocaleString('it-IT')} />
        <CampoRiga label="Ultimo aggiornamento" value={utente.updated_at ? new Date(utente.updated_at).toLocaleString('it-IT') : null} />
        <CampoRiga label="Email verificata il" value={emailStatus?.email_confirmed_at ? new Date(emailStatus.email_confirmed_at).toLocaleString('it-IT') : null} />
        <CampoRiga label="Ultimo accesso" value={emailStatus?.last_sign_in_at ? new Date(emailStatus.last_sign_in_at).toLocaleString('it-IT') : null} />
      </div>

      {/* Note admin (se presenti) */}
      {haNoteAdmin && (
        <div className="bg-amber-900/5 border border-amber-500/15 p-5 space-y-3">
          <p className="section-label mb-2 flex items-center gap-2">
            <Lock size={11} className="text-amber-400" />
            Note interne admin
          </p>
          {utente.note_admin && (
            <div>
              <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Note admin</p>
              <p className="font-body text-sm text-nebbia/70 leading-relaxed whitespace-pre-line">{utente.note_admin}</p>
            </div>
          )}
          {utente.verification_note && (
            <div>
              <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Note verifica</p>
              <p className="font-body text-sm text-nebbia/70 leading-relaxed whitespace-pre-line">{utente.verification_note}</p>
            </div>
          )}
          {utente.note_iniziali && (
            <div>
              <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Note iniziali</p>
              <p className="font-body text-sm text-nebbia/70 leading-relaxed whitespace-pre-line">{utente.note_iniziali}</p>
            </div>
          )}
        </div>
      )}

      {/* Documenti di verifica */}
      <div className="bg-slate border border-white/5 p-5">
        <p className="section-label mb-4">Documenti di verifica</p>
        {loadingDocs ? (
          <div className="flex items-center justify-center py-4">
            <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex items-center gap-2 p-3 border border-white/5">
            <FileText size={13} className="text-nebbia/30" />
            <span className="font-body text-xs text-nebbia/40">Nessun documento caricato.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(d => {
              const tipo = d.name.split('.')[0]
              return (
                <button key={d.name} onClick={() => apriDoc(d.name)}
                  className="w-full flex items-center gap-3 p-3 bg-petrolio border border-white/5 hover:border-oro/20 transition-colors text-left">
                  <FileText size={13} className="text-oro/50 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-nebbia/70">{labelDocs[tipo] ?? d.name}</p>
                    <p className="font-body text-[10px] text-nebbia/30 mt-0.5">{formatSize(d.metadata?.size)}</p>
                  </div>
                  <span className="font-body text-xs text-oro/60">Apri →</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Decisione (solo se in pending) */}
      {decisione === 'pending' && (
        <div className="bg-slate border border-oro/20 p-5 space-y-4">
          <p className="section-label">Decisione verifica</p>
          <textarea rows={3} value={motivazione} onChange={e => setMotivazione(e.target.value)}
            placeholder="Motivazione (obbligatoria in caso di rifiuto)..."
            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
          {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>}
          <div className="flex gap-3">
            <button onClick={() => handleDecisione('approved')} disabled={elaborando}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40">
              {elaborando ? <span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> : <><CheckCircle size={14} /> Approva</>}
            </button>
            <button onClick={() => handleDecisione('rejected')} disabled={elaborando}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-900/10 border border-red-500/30 text-red-400 font-body text-sm hover:bg-red-900/20 transition-colors disabled:opacity-40">
              {elaborando ? <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" /> : <><XCircle size={14} /> Rifiuta</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PAGINA PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function AdminUtentiDettaglio() {
  const { id } = useParams()
  const [utente, setUtente] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carica() {
      setLoading(true)
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
      setUtente(data)
      setLoading(false)
    }
    carica()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
    </div>
  )

  if (!utente) return (
    <div className="space-y-5">
      <BackButton to="/admin/utenti" label="Tutti gli utenti" />
      <p className="font-body text-sm text-nebbia/40">Utente non trovato.</p>
    </div>
  )

  const rb = ROLE_BADGE[utente.role] ?? ROLE_BADGE.user

  return (
    <div className="space-y-5">
      <BackButton to="/admin/utenti" label="Tutti gli utenti" />

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="section-label mb-2">Scheda utente</p>
          <h1 className="font-display text-4xl font-light text-nebbia">{utente.nome} {utente.cognome}</h1>
          {utente.studio && <p className="font-body text-sm text-nebbia/40 mt-0.5">{utente.studio}</p>}
          <p className="font-body text-sm text-nebbia/40 mt-1">{utente.email}</p>
          {utente.telefono && <p className="font-body text-xs text-nebbia/30 mt-0.5">{utente.telefono}</p>}
          <p className="font-body text-xs text-nebbia/25 mt-2">Registrato il {new Date(utente.created_at).toLocaleDateString('it-IT')}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Badge label={rb.label} variant={rb.variant} />
          <button
            onClick={() => { if (confirm(`Sospendere l'account di ${utente.nome} ${utente.cognome}?`)) alert('Funzione disponibile prossimamente') }}
            className="font-body text-xs text-red-400/60 hover:text-red-400 transition-colors border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 flex items-center gap-1.5">
            <ShieldOff size={12} /> Sospendi account
          </button>
        </div>
      </div>

      {utente.role === 'avvocato' && <SezioneAvvocato utente={utente} />}
      {utente.role === 'cliente' && <SezioneCliente utente={utente} />}
      {utente.role === 'user' && (
        <SezioneUser utente={utente} onDecision={(tipo) => setUtente(prev => ({
          ...prev, verification_status: tipo,
          role: tipo === 'approved' ? 'avvocato' : prev.role,
        }))} />
      )}
      {utente.role === 'admin' && (
        <div className="bg-slate border border-white/5 p-5">
          <p className="font-body text-sm text-nebbia/40">Account amministratore.</p>
        </div>
      )}
    </div>
  )
}