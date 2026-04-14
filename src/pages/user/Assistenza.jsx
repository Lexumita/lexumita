import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageHeader, BackButton, Badge, InputField, TextareaField } from '@/components/shared'
import { Plus, Send, Search, Loader2, AlertCircle } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// LISTA TICKET
// ─────────────────────────────────────────────────────────────
export function UserAssistenza() {
    const [search, setSearch] = useState('')
    const [statoF, setStatoF] = useState('')
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function carica() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('ticket_assistenza')
                .select('id, oggetto, stato, created_at, updated_at, messaggi:messaggi_ticket(id, autore_tipo, created_at)')
                .eq('mittente_id', user.id)
                .eq('mittente_ruolo', 'user')
                .order('updated_at', { ascending: false })

            if (!error) setTickets(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    const rows = tickets.filter(t => {
        if (statoF && t.stato !== statoF) return false
        if (search && !t.oggetto?.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    return (
        <div className="space-y-5">
            <PageHeader
                label="Supporto"
                title="Assistenza"
                action={
                    <Link to="/user/assistenza/nuovo" className="btn-primary text-sm">
                        <Plus size={15} /> Nuovo ticket
                    </Link>
                }
            />

            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-44">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input
                        placeholder="Cerca ticket…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />
                </div>
                <select
                    value={statoF}
                    onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                >
                    <option value="">Tutti gli stati</option>
                    <option value="aperto">Aperto</option>
                    <option value="chiuso">Chiuso</option>
                </select>
            </div>

            <div className="bg-slate border border-white/5 overflow-x-auto">
                {loading ? (
                    <div className="py-12 flex items-center justify-center gap-2 text-nebbia/30">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="font-body text-sm">Caricamento…</span>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="py-12 text-center font-body text-sm text-nebbia/30">
                        {tickets.length === 0 ? 'Nessun ticket ancora. Apri il tuo primo ticket.' : 'Nessun ticket trovato.'}
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-4 py-3 w-6" />
                                {['Oggetto', 'Aperto il', 'Ultimo aggiornamento', 'Stato', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(t => {
                                const msgs = [...(t.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                const hasNew = t.stato === 'aperto' && msgs.length > 0 && msgs[0]?.autore_tipo !== 'user'
                                return (
                                    <tr key={t.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                        <td className="px-4 py-3">
                                            {hasNew && <span className="inline-block w-1.5 h-1.5 rounded-full bg-oro" />}
                                        </td>
                                        <td className="px-4 py-3 font-body text-sm font-medium text-nebbia">{t.oggetto}</td>
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
                                            <Link to={`/user/assistenza/${t.id}`} className="font-body text-xs text-oro hover:text-oro/70">Apri →</Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// NUOVO TICKET
// Stesso flusso dell'avvocato:
// 1. Form oggetto + descrizione
// 2. Submit → crea ticket + inserisce descrizione come primo messaggio
// 3. Schermata "Ticket inviato" con bottone "Torna all'assistenza"
// ─────────────────────────────────────────────────────────────
export function UserAssistenzaNuovo() {
    const navigate = useNavigate()
    const [form, setForm] = useState({ oggetto: '', descrizione: '' })
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')
    const [inviato, setInviato] = useState(false)

    const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

    async function handleInvia() {
        if (!form.oggetto.trim() || !form.descrizione.trim() || salvando) return
        setSalvando(true)
        setErrore('')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Utente non autenticato')

            // Trova admin come destinatario
            const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'admin')
                .limit(1)

            const adminId = admins?.[0]?.id ?? null

            // Crea il ticket
            const { data: ticket, error } = await supabase
                .from('ticket_assistenza')
                .insert({
                    mittente_id: user.id,
                    destinatario_id: adminId,
                    mittente_ruolo: 'user',
                    oggetto: form.oggetto.trim(),
                    descrizione: form.descrizione.trim(),
                    stato: 'aperto',
                    ultimo_mittente: 'user',
                })
                .select()
                .single()

            if (error) throw new Error(error.message)

            // Inserisce la descrizione come primo messaggio
            await supabase.from('messaggi_ticket').insert({
                ticket_id: ticket.id,
                autore_id: user.id,
                autore_tipo: 'user',
                testo: form.descrizione.trim(),
            })

            setInviato(true)
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvando(false)
        }
    }

    if (inviato) return (
        <div className="space-y-5 max-w-2xl">
            <BackButton to="/user/assistenza" label="Assistenza" />
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
                <button onClick={() => navigate('/user/assistenza')} className="btn-primary text-sm mx-auto">
                    Torna all'assistenza
                </button>
            </div>
        </div>
    )

    return (
        <div className="space-y-5 max-w-2xl">
            <BackButton to="/user/assistenza" label="Assistenza" />
            <PageHeader label="Supporto Lexum" title="Nuovo ticket" />
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <InputField label="Oggetto *" placeholder="Descrivi brevemente il problema..." {...f('oggetto')} />
                <TextareaField label="Descrizione *" rows={5}
                    placeholder="Descrivi il problema nel dettaglio. Più informazioni fornisci, prima possiamo aiutarti."
                    {...f('descrizione')} />

                {errore && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                        <AlertCircle size={14} /> {errore}
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={() => navigate('/user/assistenza')} className="btn-secondary text-sm flex-1">Annulla</button>
                    <button onClick={handleInvia} disabled={salvando}
                        className="btn-primary text-sm flex-1 justify-center disabled:opacity-40">
                        {salvando
                            ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                            : <><Send size={14} /> Invia ticket</>
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// DETTAGLIO TICKET
// ─────────────────────────────────────────────────────────────
export function UserAssistenzaDettaglio() {
    const { id } = useParams()
    const bottomRef = useRef(null)
    const [meId, setMeId] = useState(null)
    const [ticket, setTicket] = useState(null)
    const [messaggi, setMessaggi] = useState([])
    const [loading, setLoading] = useState(true)
    const [msg, setMsg] = useState('')
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)

            const [{ data: tk }, { data: msgs }] = await Promise.all([
                supabase
                    .from('ticket_assistenza')
                    .select('*')
                    .eq('id', id)
                    .single(),
                supabase
                    .from('messaggi_ticket')
                    .select('id, testo, autore_tipo, created_at, autore:autore_id(nome, cognome)')
                    .eq('ticket_id', id)
                    .order('created_at'),
            ])

            setTicket(tk)
            setMessaggi(msgs ?? [])
            setLoading(false)

            // Segna come letto
            if (tk) {
                await supabase
                    .from('ticket_assistenza')
                    .update({ ultimo_mittente: 'user' })
                    .eq('id', id)
                    .neq('ultimo_mittente', 'user')
            }
        }
        init()
    }, [id])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messaggi])

    async function handleInvia() {
        if (!msg.trim() || inviando || ticket?.stato === 'chiuso') return
        setInviando(true)
        setErrore('')

        try {
            const { data: newMsg, error: mErr } = await supabase
                .from('messaggi_ticket')
                .insert({
                    ticket_id: id,
                    autore_id: meId,
                    autore_tipo: 'user',
                    testo: msg.trim(),
                })
                .select('id, testo, autore_tipo, created_at, autore:autore_id(nome, cognome)')
                .single()

            if (mErr) throw new Error(mErr.message)

            await supabase
                .from('ticket_assistenza')
                .update({ ultimo_mittente: 'user', updated_at: new Date().toISOString() })
                .eq('id', id)

            setMessaggi(prev => [...prev, newMsg])
            setMsg('')
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInviando(false)
        }
    }

    if (loading) return (
        <div className="py-20 flex items-center justify-center gap-2 text-nebbia/30">
            <Loader2 size={18} className="animate-spin" />
            <span className="font-body text-sm">Caricamento…</span>
        </div>
    )

    if (!ticket) return (
        <div className="py-20 text-center space-y-4">
            <p className="font-body text-sm text-nebbia/30">Ticket non trovato.</p>
            <Link to="/user/assistenza" className="btn-secondary text-sm inline-flex">← Torna all'assistenza</Link>
        </div>
    )

    return (
        <div className="space-y-5 max-w-3xl">
            <BackButton to="/user/assistenza" label="Assistenza" />

            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="section-label mb-2">Supporto Lexum · #{ticket.id.slice(0, 8)}</p>
                    <h1 className="font-display text-3xl font-light text-nebbia">{ticket.oggetto}</h1>
                    <p className="font-body text-xs text-nebbia/30 mt-1">
                        {new Date(ticket.created_at).toLocaleDateString('it-IT')}
                    </p>
                </div>
                <Badge label={ticket.stato === 'aperto' ? 'Aperto' : 'Chiuso'} variant={ticket.stato === 'aperto' ? 'salvia' : 'gray'} />
            </div>

            {/* Messaggi */}
            <div className="bg-slate border border-white/5 p-5 space-y-4 min-h-48 max-h-[60vh] overflow-y-auto">
                <p className="section-label mb-2">Conversazione</p>
                {messaggi.map(m => {
                    const isMio = m.autore_tipo === 'user'
                    return (
                        <div key={m.id} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-3 space-y-1 ${isMio
                                ? 'bg-oro/15 border border-oro/20'
                                : 'bg-petrolio/60 border border-white/10'
                                }`}>
                                <p className={`font-body text-[10px] font-medium mb-1 ${isMio ? 'text-oro/60 text-right' : 'text-nebbia/40'}`}>
                                    {isMio ? 'Tu' : 'Admin Lexum'} · {new Date(m.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="font-body text-sm text-nebbia leading-relaxed whitespace-pre-wrap">{m.testo}</p>
                            </div>
                        </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {ticket.stato === 'aperto' ? (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <textarea
                            rows={2}
                            value={msg}
                            onChange={e => setMsg(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInvia() } }}
                            placeholder="Scrivi un messaggio… (Invio per inviare)"
                            className="flex-1 bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                        />
                        <button
                            onClick={handleInvia}
                            disabled={!msg.trim() || inviando}
                            className="btn-primary text-sm self-end px-4 py-3 shrink-0 disabled:opacity-40"
                        >
                            {inviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-petrolio/40 border border-white/5 p-4 text-center">
                    <p className="font-body text-sm text-nebbia/30">Ticket chiuso — non è possibile inviare altri messaggi</p>
                </div>
            )}
        </div>
    )
}