// src/components/ChatWidget.jsx
import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, X, Send, ArrowRight, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ADMIN_ID = '007b9362-a2f2-46b4-8e66-8fa0ac56b936'

const ROUTE_PROTETTE = [
    '/dashboard', '/clienti', '/pratiche', '/calendario',
    '/sentenze', '/pagamenti', '/assistenza', '/profilo',
    '/studio', '/archivio', '/normativa', '/banca-dati',
    '/portale', '/verifica', '/user/', '/admin/',
    '/area-personale'
]

export default function ChatWidget() {
    const location = useLocation()
    const [aperto, setAperto] = useState(false)
    const [utente, setUtente] = useState(null)
    const [profilo, setProfilo] = useState(null)
    const [loading, setLoading] = useState(true)
    const [ticket, setTicket] = useState(null)
    const [messaggi, setMessaggi] = useState([])
    const [testo, setTesto] = useState('')
    const [inviando, setInviando] = useState(false)
    const [nonLetti, setNonLetti] = useState(0)
    const bottomRef = useRef(null)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const user = session?.user ?? null
            setUtente(user)
            if (user) {
                supabase.from('profiles')
                    .select('nome, cognome, role')
                    .eq('id', user.id)
                    .single()
                    .then(({ data }) => setProfilo(data))
            }
            setLoading(false)
        })
    }, [])

    useEffect(() => {
        if (!aperto || !utente) return
        caricaOCreaTicket()
    }, [aperto, utente])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messaggi])

    useEffect(() => {
        if (!ticket) return
        const channel = supabase
            .channel(`ticket-${ticket.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messaggi_ticket',
                filter: `ticket_id=eq.${ticket.id}`,
            }, (payload) => {
                setMessaggi(prev => [...prev, payload.new])
                if (!aperto) setNonLetti(p => p + 1)
            })
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [ticket, aperto])

    async function caricaOCreaTicket() {
        const { data: esistente } = await supabase
            .from('ticket_assistenza')
            .select('id, stato, oggetto')
            .eq('mittente_id', utente.id)
            .eq('destinatario_id', ADMIN_ID)
            .eq('stato', 'aperto')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (esistente) {
            setTicket(esistente)
            const { data: msgs } = await supabase
                .from('messaggi_ticket')
                .select('*')
                .eq('ticket_id', esistente.id)
                .order('created_at', { ascending: true })
            setMessaggi(msgs ?? [])
            setNonLetti(0)
        } else {
            const ruolo = profilo?.role ?? 'lex_user'
            const { data: nuovo } = await supabase
                .from('ticket_assistenza')
                .insert({
                    mittente_id: utente.id,
                    destinatario_id: ADMIN_ID,
                    oggetto: `Chat supporto — ${profilo?.nome ?? ''} ${profilo?.cognome ?? ''}`.trim(),
                    mittente_ruolo: ruolo,
                    stato: 'aperto',
                })
                .select()
                .single()
            setTicket(nuovo)
            setMessaggi([])
        }
    }

    async function invia() {
        if (!testo.trim() || !ticket || inviando) return
        setInviando(true)
        const ruolo = profilo?.role ?? 'lex_user'
        const { data } = await supabase
            .from('messaggi_ticket')
            .insert({
                ticket_id: ticket.id,
                autore_id: utente.id,
                autore_tipo: ruolo,
                testo: testo.trim(),
            })
            .select()
            .single()
        if (data) setMessaggi(prev => [...prev, data])
        setTesto('')
        setInviando(false)
    }

    // Nascondi su route protette
    const suRoutaProtetta = ROUTE_PROTETTE.some(r => location.pathname.startsWith(r))
    if (suRoutaProtetta) return null
    if (loading) return null
    if (!profilo && utente) return null
    if (profilo?.role === 'avvocato') return null
    if (profilo?.role === 'admin') return null
    if (profilo?.role === 'cliente') return null
    if (profilo?.role === 'user') return null

    return (
        <>
            {/* ── FINESTRA CHAT ── */}
            {aperto && (
                <div className="fixed bottom-20 right-5 w-80 sm:w-96 bg-slate border border-white/10 shadow-2xl shadow-petrolio/50 z-50 flex flex-col overflow-hidden"
                    style={{ maxHeight: '520px' }}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-petrolio/80">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-salvia animate-pulse" />
                            <span className="font-body text-sm font-medium text-nebbia">Supporto Lexum</span>
                        </div>
                        <button onClick={() => setAperto(false)} className="text-nebbia/30 hover:text-nebbia transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Corpo */}
                    {!utente ? (
                        <div className="p-6 space-y-5">
                            <div className="text-center space-y-3">
                                <div className="w-12 h-12 flex items-center justify-center border border-salvia/25 bg-salvia/5 mx-auto">
                                    <MessageSquare size={18} className="text-salvia" />
                                </div>
                                <p className="font-display text-base font-light text-nebbia">Parla con il team Lexum</p>
                                <p className="font-body text-xs text-nebbia/45 leading-relaxed">
                                    Hai domande sulla piattaforma, sui piani o su Lex AI?
                                    Registrati e apri una chat diretta con noi — risponde una persona, non un bot.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Link to="/registrati-lex" onClick={() => setAperto(false)}
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors">
                                    <Sparkles size={13} /> Registrati con Lex AI
                                </Link>
                                <Link to="/registrati" onClick={() => setAperto(false)}
                                    className="flex items-center justify-center gap-2 w-full py-3 border border-white/10 text-nebbia/50 font-body text-sm hover:border-white/25 transition-colors">
                                    Sono un avvocato <ArrowRight size={13} />
                                </Link>
                                <Link to="/login" onClick={() => setAperto(false)}
                                    className="block text-center font-body text-xs text-nebbia/25 hover:text-nebbia/50 transition-colors pt-1">
                                    Hai già un account? Accedi
                                </Link>
                            </div>
                        </div>

                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: '320px' }}>
                                {messaggi.length === 0 && (
                                    <div className="bg-salvia/5 border border-salvia/15 px-4 py-3">
                                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                                            Ciao {profilo?.nome}! 👋 Come possiamo aiutarti?
                                            Il nostro team risponde di solito entro poche ore nei giorni feriali.
                                        </p>
                                    </div>
                                )}
                                {messaggi.map((m, i) => {
                                    const isMio = m.autore_id === utente.id
                                    return (
                                        <div key={i} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] px-3 py-2 ${isMio
                                                ? 'bg-salvia/10 border border-salvia/20'
                                                : 'bg-petrolio/50 border border-white/8'
                                                }`}>
                                                <p className="font-body text-sm text-nebbia/70 leading-relaxed">{m.testo}</p>
                                                <p className={`font-body text-[10px] mt-1 ${isMio ? 'text-salvia/40 text-right' : 'text-nebbia/25'}`}>
                                                    {new Date(m.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={bottomRef} />
                            </div>

                            <div className="border-t border-white/5 p-3 flex gap-2">
                                <textarea
                                    rows={2}
                                    value={testo}
                                    onChange={e => setTesto(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia() } }}
                                    placeholder="Scrivi un messaggio..."
                                    className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-salvia/40 resize-none placeholder:text-nebbia/20"
                                />
                                <button
                                    onClick={invia}
                                    disabled={!testo.trim() || inviando}
                                    className="px-3 py-2 bg-salvia/10 border border-salvia/30 text-salvia hover:bg-salvia/20 transition-colors disabled:opacity-40 self-end"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── FLOATING BUTTON ── */}
            <button
                onClick={() => { setAperto(!aperto); setNonLetti(0) }}
                className="fixed bottom-5 right-5 flex items-center gap-2 px-4 py-3 bg-salvia text-petrolio font-body text-sm font-medium shadow-lg shadow-salvia/20 hover:bg-salvia/90 transition-all hover:scale-[1.02] z-50"
            >
                {aperto
                    ? <><X size={15} /> Chiudi</>
                    : <><MessageSquare size={15} /> Parla con noi</>
                }
                {!aperto && nonLetti > 0 && (
                    <span className="w-5 h-5 bg-oro text-petrolio font-body text-[10px] font-bold rounded-full flex items-center justify-center">
                        {nonLetti}
                    </span>
                )}
            </button>
        </>
    )
}