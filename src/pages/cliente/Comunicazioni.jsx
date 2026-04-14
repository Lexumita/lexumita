import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { PageHeader, BackButton, Badge } from '@/components/shared'
import { Plus, Send, Search, MessageSquare, Loader2, AlertCircle } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// LISTA COMUNICAZIONI
// ticket dove mittente_id = me (cliente) OPPURE destinatario_id = me
// pallino = ultimo messaggio è dell'avvocato (non del cliente)
// ─────────────────────────────────────────────────────────────
export function ClienteComunicazioni() {
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
                .select(`
                    id, oggetto, stato, created_at, updated_at,
                    mittente_ruolo,
                    mittente:mittente_id(nome, cognome),
                    destinatario:destinatario_id(nome, cognome),
                    messaggi:messaggi_ticket(id, autore_tipo, testo, created_at)
                `)
                .or(`mittente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
                .in('mittente_ruolo', ['cliente', 'avvocato'])
                .order('updated_at', { ascending: false })

            if (!error) setTickets(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    const getUltimoMsg = (t) => {
        const msgs = [...(t.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return msgs[0] ?? null
    }

    const totaleNonLetti = tickets.filter(t => {
        if (t.stato !== 'aperto') return false
        const ultimo = getUltimoMsg(t)
        return ultimo && ultimo.autore_tipo !== 'cliente'
    }).length

    const rows = tickets.filter(t => {
        if (statoF && t.stato !== statoF) return false
        if (search && !t.oggetto?.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    return (
        <div className="space-y-5">
            <PageHeader
                label="Portale cliente"
                title="Messaggi"
                action={
                    <Link to="/portale/comunicazioni/nuovo" className="btn-primary text-sm">
                        <Plus size={15} /> Nuovo messaggio
                    </Link>
                }
            />

            {totaleNonLetti > 0 && (
                <div className="bg-oro/5 border border-oro/20 p-3 flex items-center gap-2">
                    <MessageSquare size={14} className="text-oro shrink-0" />
                    <p className="font-body text-sm text-oro">
                        Hai {totaleNonLetti} {totaleNonLetti === 1 ? 'messaggio non letto' : 'messaggi non letti'}
                    </p>
                </div>
            )}

            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input
                        placeholder="Cerca conversazione..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />
                </div>
                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">Tutti</option>
                    <option value="aperto">Aperti</option>
                    <option value="chiuso">Chiusi</option>
                </select>
            </div>

            {loading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-nebbia/30">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="font-body text-sm">Caricamento…</span>
                </div>
            ) : (
                <div className="space-y-2">
                    {rows.length === 0 ? (
                        <div className="py-12 text-center">
                            <MessageSquare size={36} className="text-nebbia/15 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/30">Nessuna conversazione trovata</p>
                        </div>
                    ) : rows.map(t => {
                        const ultimoMsg = getUltimoMsg(t)
                        const nonLetto = t.stato === 'aperto' && ultimoMsg && ultimoMsg.autore_tipo !== 'cliente'
                        const controparte = t.mittente_ruolo === 'cliente'
                            ? `${t.destinatario?.nome ?? ''} ${t.destinatario?.cognome ?? ''}`.trim()
                            : `${t.mittente?.nome ?? ''} ${t.mittente?.cognome ?? ''}`.trim()

                        return (
                            <Link
                                key={t.id}
                                to={`/portale/comunicazioni/${t.id}`}
                                className={`flex items-center justify-between p-4 border transition-all hover:border-oro/20 ${nonLetto ? 'bg-oro/5 border-oro/15' : 'bg-slate border-white/5'}`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {nonLetto
                                        ? <span className="w-2 h-2 rounded-full bg-oro shrink-0" />
                                        : <span className="w-2 h-2 shrink-0" />
                                    }
                                    <div className="min-w-0">
                                        <p className={`font-body text-sm truncate ${nonLetto ? 'font-semibold text-nebbia' : 'font-medium text-nebbia'}`}>
                                            {t.oggetto}
                                        </p>
                                        {ultimoMsg && (
                                            <p className="font-body text-xs text-nebbia/40 truncate mt-0.5">
                                                {ultimoMsg.testo}
                                            </p>
                                        )}
                                        <p className="font-body text-xs text-nebbia/25 mt-0.5">{controparte}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-4 space-y-1">
                                    <p className="font-body text-xs text-nebbia/30">
                                        {new Date(t.updated_at).toLocaleDateString('it-IT')}
                                    </p>
                                    <Badge label={t.stato === 'aperto' ? 'Aperto' : 'Chiuso'} variant={t.stato === 'aperto' ? 'salvia' : 'gray'} />
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// DETTAGLIO COMUNICAZIONE
// ─────────────────────────────────────────────────────────────
export function ClienteComunicazioniDettaglio() {
    const { id } = useParams()
    const { profile } = useAuth()
    const bottomRef = useRef(null)
    const [ticket, setTicket] = useState(null)
    const [messaggi, setMessaggi] = useState([])
    const [loading, setLoading] = useState(true)
    const [msg, setMsg] = useState('')
    const [inviando, setInviando] = useState(false)
    const [errore, setErrore] = useState('')
    const [meId, setMeId] = useState(null)

    useEffect(() => {
        async function init() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)

            const [{ data: tk }, { data: msgs }] = await Promise.all([
                supabase
                    .from('ticket_assistenza')
                    .select('id, oggetto, stato, created_at, mittente_id, destinatario_id, mittente:mittente_id(nome, cognome), destinatario:destinatario_id(nome, cognome)')
                    .eq('id', id)
                    .single(),
                supabase
                    .from('messaggi_ticket')
                    .select('id, testo, autore_tipo, created_at, autore:autore_id(nome, cognome)')
                    .eq('ticket_id', id)
                    .order('created_at', { ascending: true }),
            ])

            setTicket(tk)
            setMessaggi(msgs ?? [])
            setLoading(false)
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
                    autore_tipo: 'cliente',
                    testo: msg.trim(),
                })
                .select('id, testo, autore_tipo, created_at, autore:autore_id(nome, cognome)')
                .single()

            if (mErr) throw new Error(mErr.message)

            await supabase
                .from('ticket_assistenza')
                .update({ updated_at: new Date().toISOString() })
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
            <p className="font-body text-sm text-nebbia/30">Conversazione non trovata.</p>
            <Link to="/portale/comunicazioni" className="btn-secondary text-sm inline-flex">← Torna ai messaggi</Link>
        </div>
    )

    const controparte = ticket.mittente_id === meId
        ? `${ticket.destinatario?.nome ?? ''} ${ticket.destinatario?.cognome ?? ''}`.trim()
        : `${ticket.mittente?.nome ?? ''} ${ticket.mittente?.cognome ?? ''}`.trim()

    return (
        <div className="space-y-5 max-w-3xl">
            <BackButton to="/portale/comunicazioni" label="Messaggi" />

            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="section-label mb-1">Con {controparte || 'Avvocato'}</p>
                    <h1 className="font-display text-3xl font-light text-nebbia">{ticket.oggetto}</h1>
                    <p className="font-body text-xs text-nebbia/30 mt-1">
                        Aperto il {new Date(ticket.created_at).toLocaleDateString('it-IT')}
                    </p>
                </div>
                <Badge label={ticket.stato === 'aperto' ? 'Aperto' : 'Chiuso'} variant={ticket.stato === 'aperto' ? 'salvia' : 'gray'} />
            </div>

            {/* Messaggi */}
            <div className="bg-slate border border-white/5 p-5 space-y-4 min-h-64 max-h-[500px] overflow-y-auto">
                {messaggi.length === 0 ? (
                    <p className="font-body text-sm text-nebbia/30 text-center py-6">Nessun messaggio ancora.</p>
                ) : messaggi.map(m => {
                    const isMio = m.autore_tipo === 'cliente'
                    const nomeAutore = m.autore ? `${m.autore.nome} ${m.autore.cognome}` : m.autore_tipo
                    return (
                        <div key={m.id} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] space-y-1 p-3 ${isMio
                                ? 'bg-oro/15 border border-oro/20'
                                : 'bg-petrolio/60 border border-white/8'
                                }`}>
                                <p className={`font-body text-[10px] font-medium ${isMio ? 'text-oro/60' : 'text-nebbia/40'}`}>
                                    {nomeAutore}
                                </p>
                                <p className="font-body text-sm text-nebbia leading-relaxed whitespace-pre-wrap">{m.testo}</p>
                                <p className="font-body text-[10px] text-nebbia/25">
                                    {new Date(m.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>

            {ticket.stato === 'aperto' ? (
                <div className="space-y-2">
                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}
                    <div className="flex gap-3">
                        <textarea
                            rows={2}
                            value={msg}
                            onChange={e => setMsg(e.target.value)}
                            placeholder="Scrivi un messaggio…"
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInvia() } }}
                            className="flex-1 bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                        />
                        <button
                            onClick={handleInvia}
                            disabled={!msg.trim() || inviando}
                            className="btn-primary self-end px-4 py-3 disabled:opacity-40"
                        >
                            {inviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        </button>
                    </div>
                    <p className="font-body text-[10px] text-nebbia/20">Invio con Enter · A capo con Shift+Enter</p>
                </div>
            ) : (
                <div className="bg-petrolio/40 border border-white/5 p-4 text-center">
                    <p className="font-body text-sm text-nebbia/30">Questa conversazione è chiusa</p>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// NUOVO MESSAGGIO
// Il cliente apre un ticket verso il proprio avvocato
// ─────────────────────────────────────────────────────────────
export function ClienteComunicazioniNuovo() {
    const navigate = useNavigate()
    const { profile } = useAuth()
    const [form, setForm] = useState({ oggetto: '', descrizione: '' })
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')
    const [inviato, setInviato] = useState(false)

    async function handleInvia() {
        if (!form.oggetto.trim() || !form.descrizione.trim() || salvando) return
        setSalvando(true)
        setErrore('')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Utente non autenticato')

            // L'avvocato del cliente è in profiles.avvocato_id
            const { data: profilo } = await supabase
                .from('profiles')
                .select('avvocato_id')
                .eq('id', user.id)
                .single()

            if (!profilo?.avvocato_id) throw new Error('Nessun avvocato associato al tuo account.')

            const { data: ticket, error: tErr } = await supabase
                .from('ticket_assistenza')
                .insert({
                    mittente_id: user.id,
                    destinatario_id: profilo.avvocato_id,
                    mittente_ruolo: 'cliente',
                    oggetto: form.oggetto.trim(),
                    descrizione: form.descrizione.trim(),
                    stato: 'aperto',
                    ultimo_mittente: 'cliente',
                })
                .select('id')
                .single()

            if (tErr) throw new Error(tErr.message)

            // Inserisce la descrizione come primo messaggio
            await supabase.from('messaggi_ticket').insert({
                ticket_id: ticket.id,
                autore_id: user.id,
                autore_tipo: 'cliente',
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
        <div className="max-w-2xl">
            <BackButton to="/portale/comunicazioni" label="Messaggi" />
            <div className="bg-slate border border-salvia/20 p-8 text-center space-y-4 mt-5">
                <div className="w-12 h-12 bg-salvia/15 border border-salvia/30 flex items-center justify-center mx-auto">
                    <Send size={20} className="text-salvia" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-nebbia">Messaggio inviato</h2>
                <p className="font-body text-sm text-nebbia/60 leading-relaxed max-w-md mx-auto">
                    Il tuo avvocato riceverà una notifica e ti risponderà al più presto.
                </p>
                <div className="bg-petrolio/60 border border-white/5 p-4 text-left">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Oggetto</p>
                    <p className="font-body text-sm text-nebbia">{form.oggetto}</p>
                </div>
                <button onClick={() => navigate('/portale/comunicazioni')} className="btn-primary text-sm mx-auto">
                    Torna ai messaggi
                </button>
            </div>
        </div>
    )

    return (
        <div className="space-y-5 max-w-2xl">
            <BackButton to="/portale/comunicazioni" label="Messaggi" />
            <PageHeader label="Portale cliente" title="Nuovo messaggio" />
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <div>
                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Oggetto *</label>
                    <input
                        value={form.oggetto}
                        onChange={e => setForm(p => ({ ...p, oggetto: e.target.value }))}
                        placeholder="Di cosa si tratta?"
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />
                </div>
                <div>
                    <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Messaggio *</label>
                    <textarea
                        rows={5}
                        value={form.descrizione}
                        onChange={e => setForm(p => ({ ...p, descrizione: e.target.value }))}
                        placeholder="Scrivi il tuo messaggio…"
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                    />
                </div>

                {errore && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                        <AlertCircle size={14} /> {errore}
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={() => navigate('/portale/comunicazioni')} className="btn-secondary text-sm flex-1">Annulla</button>
                    <button
                        onClick={handleInvia}
                        disabled={!form.oggetto.trim() || !form.descrizione.trim() || salvando}
                        className="btn-primary text-sm flex-1 justify-center disabled:opacity-40"
                    >
                        {salvando
                            ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                            : <><Send size={14} /> Invia</>
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}