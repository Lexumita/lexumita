// src/pages/AreaPersonale.jsx
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, BookOpen, Clock, Search, LogOut, User, TrendingUp, AlertCircle, MessageSquare, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import { useState, useEffect, useRef } from 'react'

export default function AreaPersonale() {
    const navigate = useNavigate()
    const [profile, setProfile] = useState(null)
    const [crediti, setCrediti] = useState(null)
    const [ricerche, setRicerche] = useState([])
    const [loading, setLoading] = useState(true)
    const [ricercaAperta, setRicercaAperta] = useState(null)
    const [prodottiCrediti, setProdottiCrediti] = useState([])
    const [acquistando, setAcquistando] = useState(false)
    const [erroreAcquisto, setErroreAcquisto] = useState('')
    const [ticket, setTicket] = useState(null)
    const [messaggiChat, setMessaggiChat] = useState([])
    const [testoChat, setTestoChat] = useState('')
    const [inviandoChat, setInviandoChat] = useState(false)
    const chatBottomRef = useRef(null)

    useEffect(() => {
        async function carica() {
            setLoading(true)
            if (new URLSearchParams(window.location.search).get('success') === '1') {
                window.history.replaceState({}, '', '/area-personale')
            }
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { navigate('/login'); return }

            const [{ data: prof }, { data: cred }, { data: rich }] = await Promise.all([
                supabase.from('profiles').select('nome, cognome, email, role').eq('id', user.id).single(),
                supabase.from('crediti_ai').select('crediti_totali, crediti_usati, periodo_fine')
                    .eq('user_id', user.id)
                    .gte('periodo_fine', new Date().toISOString())
                    .order('created_at', { ascending: false })
                    .limit(1).maybeSingle(),
                supabase.from('note_interne').select('id, testo, metadati, created_at')
                    .eq('autore_id', user.id)
                    .eq('tipo', 'ricerca_ai')
                    .order('created_at', { ascending: false })
                    .limit(20),
            ])

            setProfile(prof)
            setCrediti(cred)
            setRicerche(rich ?? [])
            await caricaProdotti()
            await caricaTicket(user.id)
            setLoading(false)
        }
        carica()
    }, [])

    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messaggiChat])

    async function inviaMessaggio() {
        if (!testoChat.trim() || !ticket || inviandoChat) return
        setInviandoChat(true)
        const { data } = await supabase
            .from('messaggi_ticket')
            .insert({
                ticket_id: ticket.id,
                autore_id: (await supabase.auth.getUser()).data.user.id,
                autore_tipo: 'lex_user',
                testo: testoChat.trim(),
            })
            .select()
            .single()
        if (data) setMessaggiChat(prev => [...prev, data])
        setTestoChat('')
        setInviandoChat(false)
    }

    async function caricaProdotti() {
        const { data } = await supabase
            .from('prodotti')
            .select('id, nome, prezzo, crediti_ai_mensili')
            .eq('tipo', 'crediti_ai')
            .eq('attivo', true)
            .eq('solo_lex_user', true)
            .order('prezzo')
        setProdottiCrediti(data ?? [])
    }

    async function caricaTicket(userId) {
        const { data: t } = await supabase
            .from('ticket_assistenza')
            .select('id, stato, oggetto, created_at')
            .eq('mittente_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (t) {
            setTicket(t)
            const { data: msgs } = await supabase
                .from('messaggi_ticket')
                .select('id, testo, autore_tipo, created_at')
                .eq('ticket_id', t.id)
                .order('created_at', { ascending: true })
            setMessaggiChat(msgs ?? [])
        }
    }

    async function acquistaCrediti(prodottoId) {
        setAcquistando(true)
        setErroreAcquisto('')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({
                        prodotto_id: prodottoId,
                        success_url: `${window.location.origin}/area-personale?success=1`,
                        cancel_url: `${window.location.origin}/area-personale`,
                    }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            window.location.href = json.url
        } catch (err) {
            setErroreAcquisto(err.message)
            setAcquistando(false)
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        navigate('/lex-ai')
    }

    if (loading) return (
        <div className="min-h-screen bg-petrolio flex items-center justify-center">
            <span className="animate-spin w-6 h-6 border-2 border-salvia border-t-transparent rounded-full" />
        </div>
    )

    const creditiRimasti = crediti ? crediti.crediti_totali - crediti.crediti_usati : 0
    const creditiTotali = crediti?.crediti_totali ?? 3

    return (
        <div className="min-h-screen bg-petrolio text-nebbia">

            {/* ── HEADER ── */}
            <header className="border-b border-white/5 bg-petrolio/95 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="font-display text-lg font-light tracking-[0.2em] text-oro">LEXUM</Link>
                    <div className="flex items-center gap-4">
                        <span className="font-body text-xs text-nebbia/40">{profile?.nome} {profile?.cognome}</span>
                        <button onClick={handleLogout}
                            className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors flex items-center gap-1.5">
                            <LogOut size={12} /> Esci
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

                {/* ── BENVENUTO ── */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <p className="font-body text-xs text-salvia/60 tracking-[0.2em] uppercase mb-2">Area personale</p>
                        <h1 className="font-display text-3xl font-light text-nebbia">Ciao, {profile?.nome}.</h1>
                    </div>
                    <Link to="/lex-ai"
                        className="flex items-center gap-2 px-5 py-2.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors">
                        <Sparkles size={13} /> Usa Lex AI
                    </Link>
                </div>

                {/* ── CREDITI + UPGRADE ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Crediti */}
                    <div className="bg-slate border border-salvia/20 p-5 col-span-1">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={14} className="text-salvia" />
                            <p className="font-body text-xs text-salvia/70 uppercase tracking-widest">Crediti Lex</p>
                        </div>
                        <p className="font-display text-4xl font-light text-salvia mb-1">{creditiRimasti}</p>
                        <p className="font-body text-xs text-nebbia/30 mb-3">su {creditiTotali} disponibili</p>
                        {/* Barra progresso */}
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-salvia transition-all"
                                style={{ width: `${(creditiRimasti / creditiTotali) * 100}%` }}
                            />
                        </div>
                        {crediti?.periodo_fine && (
                            <p className="font-body text-xs text-nebbia/20 mt-2">
                                Scadono il {new Date(crediti.periodo_fine).toLocaleDateString('it-IT')}
                            </p>
                        )}
                    </div>

                    {/* Upgrade avvocato */}
                    <div className="bg-slate border border-oro/20 p-5 col-span-1 md:col-span-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-oro/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl pointer-events-none" />
                        <div className="relative">
                            <p className="font-body text-xs text-oro/60 uppercase tracking-widest mb-2">Sei un avvocato?</p>
                            <p className="font-display text-lg font-light text-nebbia mb-2">
                                Accedi alle funzionalità complete di Lexum
                            </p>
                            <p className="font-body text-xs text-nebbia/40 leading-relaxed mb-4">
                                Gestionale, banca dati sentenze, strategie processuali AI, pratiche e clienti.
                                Tutto in un unico ambiente professionale.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Link to="/per-avvocati"
                                    className="flex items-center gap-2 px-5 py-2.5 bg-oro text-petrolio font-body text-xs font-medium hover:bg-oro/90 transition-colors">
                                    Scopri Lexum completo <ArrowRight size={12} />
                                </Link>
                                <button
                                    onClick={() => document.getElementById('acquista-crediti')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="flex items-center gap-2 px-5 py-2.5 border border-white/10 text-nebbia/50 font-body text-xs hover:border-white/25 transition-colors">
                                    Acquista più crediti
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── STORICO RICERCHE ── */}
                <div className="bg-slate border border-white/5">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-nebbia/30" />
                            <p className="font-body text-sm font-medium text-nebbia">Storico ricerche</p>
                            <span className="font-body text-xs text-nebbia/30 border border-white/10 px-2 py-0.5">{ricerche.length}</span>
                        </div>
                        <Link to="/lex-ai" className="font-body text-xs text-salvia/60 hover:text-salvia transition-colors flex items-center gap-1">
                            <Search size={11} /> Nuova ricerca
                        </Link>
                    </div>

                    {ricerche.length === 0 ? (
                        <div className="py-16 text-center">
                            <Sparkles size={28} className="text-nebbia/10 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/25">Nessuna ricerca ancora</p>
                            <p className="font-body text-xs text-nebbia/15 mt-1">Le tue ricerche con Lex AI appariranno qui</p>
                            <Link to="/lex-ai" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors">
                                <Sparkles size={13} /> Inizia a cercare
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {ricerche.map(r => (
                                <div key={r.id} className="p-5">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Sparkles size={11} className="text-salvia shrink-0" />
                                            <p className="font-body text-sm font-medium text-nebbia/70 truncate">
                                                {r.metadati?.domanda ?? 'Ricerca Lex AI'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <p className="font-body text-xs text-nebbia/25">
                                                {new Date(r.created_at).toLocaleDateString('it-IT')}
                                            </p>
                                            <button
                                                onClick={() => setRicercaAperta(ricercaAperta === r.id ? null : r.id)}
                                                className="font-body text-xs text-nebbia/25 hover:text-nebbia/50 transition-colors border border-white/8 px-2 py-0.5">
                                                {ricercaAperta === r.id ? 'Chiudi' : 'Espandi'}
                                            </button>
                                        </div>
                                    </div>

                                    {ricercaAperta === r.id ? (
                                        <div className="mt-3 bg-petrolio/50 border border-white/5 p-4">
                                            <div className="font-body text-xs text-nebbia/60 leading-relaxed">
                                                <ReactMarkdown
                                                    components={{
                                                        h2: ({ children }) => <h2 className="font-body text-xs font-semibold text-nebbia mt-3 mb-1">{children}</h2>,
                                                        h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/70 mt-2 mb-0.5">{children}</h3>,
                                                        strong: ({ children }) => <strong className="font-semibold text-nebbia/80">{children}</strong>,
                                                        p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                                                        ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2">{children}</ul>,
                                                        li: ({ children }) => <li className="text-nebbia/50">{children}</li>,
                                                    }}
                                                >
                                                    {r.testo}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="font-body text-xs text-nebbia/35 leading-relaxed line-clamp-2 ml-5">
                                            {r.testo}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── MESSAGGI CON IL TEAM ── */}
                <div className="bg-slate border border-white/5">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={14} className="text-nebbia/30" />
                            <p className="font-body text-sm font-medium text-nebbia">Messaggi con il team</p>
                            {ticket?.stato === 'aperto' && (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-salvia animate-pulse" />
                                    <span className="font-body text-xs text-salvia/60">Aperto</span>
                                </div>
                            )}
                        </div>
                        {ticket?.stato === 'chiuso' && (
                            <span className="font-body text-xs text-nebbia/25 border border-white/8 px-2 py-0.5">Chiuso</span>
                        )}
                    </div>

                    {!ticket ? (
                        <div className="py-10 text-center">
                            <MessageSquare size={24} className="text-nebbia/10 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/25 mb-4">Nessuna conversazione ancora</p>
                            <p className="font-body text-xs text-nebbia/20 max-w-xs mx-auto leading-relaxed">
                                Usa il pulsante "Parla con noi" in basso a destra per aprire una chat con il team Lexum.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Messaggi */}
                            <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
                                {messaggiChat.length === 0 && (
                                    <div className="bg-salvia/5 border border-salvia/15 px-4 py-3">
                                        <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                                            Ciao! Come possiamo aiutarti? Il nostro team risponde solitamente entro poche ore nei giorni feriali.
                                        </p>
                                    </div>
                                )}
                                {messaggiChat.map((m, i) => {
                                    const isMio = m.autore_tipo === 'lex_user'
                                    return (
                                        <div key={i} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] px-3 py-2.5 ${isMio
                                                ? 'bg-salvia/10 border border-salvia/20'
                                                : 'bg-petrolio/60 border border-white/8'
                                                }`}>
                                                {!isMio && (
                                                    <p className="font-body text-[10px] text-nebbia/30 mb-1">Team Lexum</p>
                                                )}
                                                <p className="font-body text-sm text-nebbia/70 leading-relaxed">{m.testo}</p>
                                                <p className={`font-body text-[10px] mt-1 ${isMio ? 'text-salvia/40 text-right' : 'text-nebbia/25'}`}>
                                                    {new Date(m.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div ref={chatBottomRef} />
                            </div>

                            {/* Input */}
                            {ticket.stato === 'aperto' && (
                                <div className="border-t border-white/5 p-4 flex gap-2">
                                    <textarea
                                        rows={2}
                                        value={testoChat}
                                        onChange={e => setTestoChat(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); inviaMessaggio() } }}
                                        placeholder="Scrivi un messaggio..."
                                        className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-salvia/40 resize-none placeholder:text-nebbia/20"
                                    />
                                    <button
                                        onClick={inviaMessaggio}
                                        disabled={!testoChat.trim() || inviandoChat}
                                        className="px-3 py-2 bg-salvia/10 border border-salvia/30 text-salvia hover:bg-salvia/20 transition-colors disabled:opacity-40 self-end"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── ACQUISTA CREDITI ── */}
                <div id="acquista-crediti" className="bg-slate border border-white/5">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
                        <Sparkles size={14} className="text-oro" />
                        <p className="font-body text-sm font-medium text-nebbia">Acquista crediti Lex AI</p>
                    </div>
                    <div className="p-5 space-y-4">
                        {prodottiCrediti.length === 0 ? (
                            <p className="font-body text-sm text-nebbia/30 text-center py-4">
                                Nessun pacchetto disponibile al momento.
                            </p>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {prodottiCrediti.map(p => (
                                        <div key={p.id} className="bg-petrolio border border-white/5 p-5 flex flex-col gap-3 hover:border-oro/20 transition-colors">
                                            <p className="font-body text-sm font-medium text-nebbia">{p.nome}</p>
                                            <div>
                                                <p className="font-display text-3xl font-light text-oro">€ {p.prezzo}</p>
                                                <p className="font-body text-xs text-nebbia/40 mt-1">
                                                    {p.crediti_ai_mensili} crediti Lex AI
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => acquistaCrediti(p.id)}
                                                disabled={acquistando}
                                                className="mt-auto flex items-center justify-center gap-2 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40"
                                            >
                                                {acquistando
                                                    ? <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
                                                    : 'Acquista'
                                                }
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {erroreAcquisto && (
                                    <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                                        <AlertCircle size={11} /> {erroreAcquisto}
                                    </p>
                                )}
                                <p className="font-body text-xs text-nebbia/20 text-center">
                                    Pagamento sicuro tramite Stripe — I crediti vengono aggiunti immediatamente dopo il pagamento
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* ── PROFILO ── */}
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <User size={14} className="text-nebbia/30" />
                        <p className="font-body text-sm font-medium text-nebbia">Profilo</p>
                    </div>
                    <div className="space-y-2">
                        {[
                            ['Nome', `${profile?.nome ?? ''} ${profile?.cognome ?? ''}`.trim()],
                            ['Email', profile?.email ?? '—'],
                            ['Tipo account', 'Lex AI — accesso gratuito'],
                        ].map(([l, v]) => (
                            <div key={l} className="flex justify-between py-2 border-b border-white/5">
                                <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                <span className="font-body text-sm text-nebbia/60">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}