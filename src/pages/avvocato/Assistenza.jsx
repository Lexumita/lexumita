// src/pages/avvocato/Assistenza.jsx

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { PageHeader, BackButton, Badge, InputField, TextareaField } from '@/components/shared'
import { Plus, Send, Search, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// LISTA TICKET
// ─────────────────────────────────────────────────────────────
export function AvvocatoAssistenza() {
    const [tab, setTab] = useState('clienti')
    const [meId, setMeId] = useState(null)
    const [ids, setIds] = useState([])           // [meId, ...collaboratoriIds]
    const [ticketClienti, setTicketClienti] = useState([])
    const [ticketLexum, setTicketLexum] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statoF, setStatoF] = useState('')

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)

            const { data: profilo } = await supabase
                .from('profiles').select('posti_acquistati').eq('id', user.id).single()

            let allIds = [user.id]
            if ((profilo?.posti_acquistati ?? 1) > 1) {
                const { data: collabs } = await supabase
                    .from('profiles').select('id').eq('titolare_id', user.id)
                allIds = [user.id, ...(collabs ?? []).map(c => c.id)]
            }
            setIds(allIds)
        }
        init()
    }, [])

    const carica = useCallback(async () => {
        if (!meId || ids.length === 0) return
        setLoading(true)

        // Ticket clienti → dove sono destinatario (io o uno dei miei collaboratori)
        const qClienti = supabase
            .from('ticket_assistenza')
            .select('id, oggetto, stato, created_at, updated_at, mittente_ruolo, mittente:mittente_id(nome, cognome), messaggi:messaggi_ticket(id, autore_tipo, created_at)')
            .in('destinatario_id', ids)
            .eq('mittente_ruolo', 'cliente')
            .order('updated_at', { ascending: false })

        // Ticket Lexum → dove sono mittente verso admin
        const qLexum = supabase
            .from('ticket_assistenza')
            .select('id, oggetto, stato, created_at, updated_at, messaggi:messaggi_ticket(id, autore_tipo, created_at)')
            .eq('mittente_id', meId)
            .eq('mittente_ruolo', 'avvocato')
            .order('updated_at', { ascending: false })

        const [{ data: cl }, { data: lx }] = await Promise.all([qClienti, qLexum])
        setTicketClienti(cl ?? [])
        setTicketLexum(lx ?? [])
        setLoading(false)
    }, [meId, ids])

    useEffect(() => { carica() }, [carica])

    const isLexum = tab === 'lexum'
    const source = isLexum ? ticketLexum : ticketClienti

    const rows = source.filter(t => {
        if (statoF && t.stato !== statoF) return false
        if (search) {
            const mittente = t.mittente ? `${t.mittente.nome} ${t.mittente.cognome}` : ''
            if (!`${t.oggetto} ${mittente}`.toLowerCase().includes(search.toLowerCase())) return false
        }
        return true
    })

    const getUltimoAutore = (t) => {
        const msgs = [...(t.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return msgs[0]?.autore_tipo ?? null
    }
    const nApertiClienti = ticketClienti.filter(t => t.stato === 'aperto' && getUltimoAutore(t) === 'cliente').length
    const nApertiLexum = ticketLexum.filter(t => t.stato === 'aperto' && getUltimoAutore(t) === 'admin').length

    return (
        <div className="space-y-5">
            <PageHeader label="Supporto" title="Assistenza"
                action={isLexum
                    ? <Link to="/assistenza/nuovo" className="btn-primary text-sm flex items-center gap-2">
                        <Plus size={15} /> Nuovo ticket
                    </Link>
                    : null}
            />

            <div className="flex gap-0 border-b border-white/8">
                {[
                    { id: 'clienti', label: 'Clienti', badge: nApertiClienti },
                    { id: 'lexum', label: 'Supporto Lexum', badge: nApertiLexum },
                ].map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); setStatoF('') }}
                        className={`flex items-center gap-2 px-5 py-3 font-body text-sm border-b-2 transition-colors ${tab === t.id ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'}`}>
                        {t.label}
                        {t.badge > 0 && (
                            <span className="w-4 h-4 rounded-full bg-oro/20 text-oro text-[10px] flex items-center justify-center font-medium">
                                {t.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-44">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input placeholder="Cerca oggetto, mittente..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                </div>
                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">Tutti gli stati</option>
                    <option value="aperto">Aperto</option>
                    <option value="chiuso">Chiuso</option>
                </select>
                {(search || statoF) && (
                    <button onClick={() => { setSearch(''); setStatoF('') }}
                        className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors px-3 py-2.5 border border-white/5 hover:border-red-500/30">
                        Reset
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    {rows.length === 0 ? (
                        <div className="py-12 text-center font-body text-sm text-nebbia/30">
                            {source.length === 0 ? 'Nessun ticket' : 'Nessun risultato'}
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 w-6" />
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Titolo</th>
                                    {!isLexum && <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Cliente</th>}
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Aperto il</th>
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Aggiornato</th>
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Stato</th>
                                    <th className="px-4 py-3 w-16" />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(t => {
                                    const ultimoAutore = getUltimoAutore(t)
                                    const nonLetto = t.stato === 'aperto' && (isLexum ? ultimoAutore === 'admin' : ultimoAutore === 'cliente')
                                    return (
                                        <tr key={t.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                            <td className="px-4 py-3">
                                                {nonLetto && <span className="inline-block w-1.5 h-1.5 rounded-full bg-oro" />}
                                            </td>
                                            <td className="px-4 py-3 font-body text-sm font-medium text-nebbia">{t.oggetto}</td>
                                            {!isLexum && (
                                                <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                                                    {t.mittente ? `${t.mittente.nome} ${t.mittente.cognome}` : '—'}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">
                                                {new Date(t.created_at).toLocaleDateString('it-IT')}
                                            </td>
                                            <td className="px-4 py-3 font-body text-xs text-nebbia/30 whitespace-nowrap">
                                                {new Date(t.updated_at).toLocaleDateString('it-IT')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge label={t.stato === 'aperto' ? 'Aperto' : 'Chiuso'} variant={t.stato === 'aperto' ? 'salvia' : 'gray'} />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link to={`/assistenza/${t.id}`} className="font-body text-xs text-oro hover:text-oro/70">Apri →</Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// NUOVO TICKET → Lexum
// ─────────────────────────────────────────────────────────────
export function AvvocatoAssistenzaNuovo() {
    const navigate = useNavigate()
    const [form, setForm] = useState({ oggetto: '', descrizione: '' })
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')
    const [inviato, setInviato] = useState(false)
    const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

    async function handleInvia() {
        setErrore('')
        if (!form.oggetto.trim()) return setErrore("L'oggetto è obbligatorio")
        if (!form.descrizione.trim()) return setErrore('La descrizione è obbligatoria')
        setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: admin } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single()

            const { data: ticket, error } = await supabase.from('ticket_assistenza').insert({
                mittente_id: user.id,
                destinatario_id: admin?.id ?? null,
                oggetto: form.oggetto.trim(),
                descrizione: form.descrizione.trim(),
                mittente_ruolo: 'avvocato',
                stato: 'aperto',
                ultimo_mittente: 'avvocato',
            }).select().single()

            if (error) throw new Error(error.message)

            await supabase.from('messaggi_ticket').insert({
                ticket_id: ticket.id,
                autore_id: user.id,
                autore_tipo: 'avvocato',
                testo: form.descrizione.trim(),
            })

            setInviato(true)
        } catch (err) { setErrore(err.message) }
        finally { setSalvando(false) }
    }

    if (inviato) return (
        <div className="space-y-5 max-w-2xl">
            <BackButton to="/assistenza" label="Assistenza" />
            <div className="bg-slate border border-salvia/20 p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-salvia/15 border border-salvia/30 flex items-center justify-center mx-auto">
                    <Send size={20} className="text-salvia" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-nebbia">Ticket inviato</h2>
                <p className="font-body text-sm text-nebbia/60 leading-relaxed max-w-md mx-auto">
                    Abbiamo ricevuto la tua richiesta e ti risponderemo nel più breve tempo possibile.
                </p>
                <div className="bg-petrolio/60 border border-white/5 p-4 text-left">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Oggetto</p>
                    <p className="font-body text-sm text-nebbia">{form.oggetto}</p>
                </div>
                <button onClick={() => navigate('/assistenza')} className="btn-primary text-sm mx-auto">
                    Torna all'assistenza
                </button>
            </div>
        </div>
    )

    return (
        <div className="space-y-5 max-w-2xl">
            <BackButton to="/assistenza" label="Assistenza" />
            <PageHeader label="Supporto Lexum" title="Nuovo ticket" />
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <InputField label="Oggetto *" placeholder="Descrivi brevemente il problema..." {...f('oggetto')} />
                <TextareaField label="Descrizione *" rows={5}
                    placeholder="Descrivi il problema nel dettaglio. Più informazioni fornisci, prima possiamo aiutarti." {...f('descrizione')} />
                {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>}
                <div className="flex gap-3">
                    <button onClick={() => navigate('/assistenza')} className="btn-secondary text-sm flex-1">Annulla</button>
                    <button onClick={handleInvia} disabled={salvando} className="btn-primary text-sm flex-1 justify-center disabled:opacity-40">
                        {salvando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Send size={14} /> Invia ticket</>}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// DETTAGLIO TICKET
// ─────────────────────────────────────────────────────────────
export function AvvocatoAssistenzaDettaglio() {
    const { id } = useParams()
    const bottomRef = useRef(null)
    const [meId, setMeId] = useState(null)
    const [ticket, setTicket] = useState(null)
    const [messaggi, setMessaggi] = useState([])
    const [loading, setLoading] = useState(true)
    const [isLexum, setIsLexum] = useState(false)
    const [msg, setMsg] = useState('')
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)
            const [{ data: tk }, { data: msgs }] = await Promise.all([
                supabase.from('ticket_assistenza')
                    .select('*, mittente:mittente_id(nome, cognome), destinatario:destinatario_id(nome, cognome)')
                    .eq('id', id).single(),
                supabase.from('messaggi_ticket')
                    .select('id, testo, autore_tipo, created_at, autore:autore_id(nome, cognome)')
                    .eq('ticket_id', id).order('created_at'),
            ])
            setTicket(tk)
            setMessaggi(msgs ?? [])
            setIsLexum(tk?.mittente_ruolo === 'avvocato' || tk?.mittente_ruolo === 'user')
            setLoading(false)
        }
        init()
    }, [id])

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messaggi])

    async function handleInvia() {
        if (!msg.trim() || !meId || !ticket) return
        setInviando(true); setErrore('')
        try {
            const { data: nuovoMsg, error } = await supabase.from('messaggi_ticket')
                .insert({ ticket_id: ticket.id, autore_id: meId, autore_tipo: 'avvocato', testo: msg.trim() })
                .select('id, testo, autore_tipo, created_at, autore:autore_id(nome, cognome)').single()
            if (error) throw new Error(error.message)
            await supabase.from('ticket_assistenza').update({ ultimo_mittente: 'avvocato' }).eq('id', ticket.id)
            setMessaggi(prev => [...prev, nuovoMsg]); setMsg('')
        } catch (err) { setErrore(err.message) }
        finally { setInviando(false) }
    }

    async function chiudiTicket() {
        await supabase.from('ticket_assistenza').update({ stato: 'chiuso' }).eq('id', ticket.id)
        setTicket(t => ({ ...t, stato: 'chiuso' }))
    }

    async function riapriTicket() {
        await supabase.from('ticket_assistenza').update({ stato: 'aperto' }).eq('id', ticket.id)
        setTicket(t => ({ ...t, stato: 'aperto' }))
    }

    if (loading) return <div className="flex justify-center py-40"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
    if (!ticket) return <div className="space-y-5"><BackButton to="/assistenza" label="Assistenza" /><p className="font-body text-sm text-nebbia/40">Ticket non trovato.</p></div>

    const mittente = ticket.mittente ? `${ticket.mittente.nome} ${ticket.mittente.cognome}` : 'Sconosciuto'

    return (
        <div className="space-y-5 max-w-3xl">
            <BackButton to="/assistenza" label="Assistenza" />

            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="section-label mb-2">{isLexum ? 'Supporto Lexum' : 'Messaggio cliente'} · #{ticket.id.slice(0, 8)}</p>
                    <h1 className="font-display text-3xl font-light text-nebbia">{ticket.oggetto}</h1>
                    <p className="font-body text-xs text-nebbia/30 mt-1">{mittente} · {new Date(ticket.created_at).toLocaleDateString('it-IT')}</p>
                </div>
                <Badge label={ticket.stato === 'aperto' ? 'Aperto' : 'Chiuso'} variant={ticket.stato === 'aperto' ? 'salvia' : 'gray'} />
            </div>

            <div className="bg-slate border border-white/5 p-5 space-y-4 min-h-48 max-h-[500px] overflow-y-auto">
                <p className="section-label mb-2">Conversazione</p>
                {messaggi.length === 0 ? (
                    <p className="font-body text-sm text-nebbia/30 italic">Nessun messaggio</p>
                ) : messaggi.map(m => {
                    const isMio = m.autore_tipo === 'avvocato'
                    const nomeAutore = m.autore ? `${m.autore.nome} ${m.autore.cognome}` : m.autore_tipo
                    return (
                        <div key={m.id} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-3 space-y-1 ${isMio ? 'bg-oro/15 border border-oro/20' : 'bg-petrolio/60 border border-white/8'}`}>
                                <p className={`font-body text-[10px] font-medium ${isMio ? 'text-oro/60' : 'text-nebbia/40'}`}>{nomeAutore}</p>
                                <p className="font-body text-sm text-nebbia leading-relaxed">{m.testo}</p>
                                <p className="font-body text-[10px] text-nebbia/25">
                                    {new Date(m.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>

            {ticket.stato === 'aperto' ? (
                <div className="space-y-2">
                    {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>}
                    <div className="flex gap-3">
                        <textarea rows={2} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Scrivi un messaggio..."
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInvia() } }}
                            className="flex-1 bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
                        <button onClick={handleInvia} disabled={inviando || !msg.trim()} className="btn-primary text-sm self-end px-4 py-3 disabled:opacity-40">
                            {inviando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <Send size={15} />}
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="font-body text-[10px] text-nebbia/20">Invio con Enter · A capo con Shift+Enter</p>
                        <button onClick={chiudiTicket} className="font-body text-xs text-nebbia/30 hover:text-salvia transition-colors">Chiudi ticket</button>
                    </div>
                </div>
            ) : (
                <div className="bg-petrolio/40 border border-white/5 p-4 flex items-center justify-between">
                    <p className="font-body text-sm text-nebbia/30">Ticket chiuso</p>
                    <button onClick={riapriTicket} className="font-body text-xs text-oro hover:text-oro/70">Riapri</button>
                </div>
            )}
        </div>
    )
}