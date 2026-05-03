// src/components/ChatWidget.jsx
//
// Widget flottante per visitatori non loggati.
// Scopo: invitare a registrarsi per parlare col team Lexum.
// Per gli utenti loggati c'è la sezione Assistenza dedicata,
// quindi qui il widget si nasconde su tutte le rotte autenticate
// e su quelle di onboarding (registrazione/login).

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, X, ArrowRight, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ROUTE_PROTETTE = [
    // Aree autenticate
    '/dashboard', '/clienti', '/pratiche', '/calendario',
    '/sentenze', '/pagamenti', '/assistenza', '/profilo',
    '/studio', '/archivio', '/normativa', '/banca-dati',
    '/portale', '/verifica', '/user/', '/admin/',
    '/area-personale',
    // Onboarding (la CTA del widget porta qui, sarebbe ricorsivo mostrarla)
    '/registrati', '/registrati-lex', '/login',
]

export default function ChatWidget() {
    const location = useLocation()
    const [aperto, setAperto] = useState(false)
    const [utente, setUtente] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUtente(session?.user ?? null)
            setLoading(false)
        })
    }, [])

    // ── DEBUG TEMPORANEO ──
    // Nascondi su route protette/onboarding o se l'utente è già loggato
    const suRoutaProtetta = ROUTE_PROTETTE.some(r => location.pathname.startsWith(r))
    if (suRoutaProtetta) return null
    if (loading) return null
    if (utente) return null

    return (
        <>
            {/* ── PANNELLO CTA ── */}
            {aperto && (
                <div className="fixed bottom-20 right-5 w-80 sm:w-96 bg-slate border border-white/10 shadow-2xl shadow-petrolio/50 z-50 overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-petrolio/80">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-salvia animate-pulse" />
                            <span className="font-body text-sm font-medium text-nebbia">Supporto Lexum</span>
                        </div>
                        <button
                            onClick={() => setAperto(false)}
                            className="text-nebbia/30 hover:text-nebbia transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Corpo CTA */}
                    <div className="p-6 space-y-5">
                        <div className="text-center space-y-3">
                            <div className="w-12 h-12 flex items-center justify-center border border-salvia/25 bg-salvia/5 mx-auto">
                                <MessageSquare size={18} className="text-salvia" />
                            </div>
                            <p className="font-display text-base font-light text-nebbia">
                                Parla con il team Lexum
                            </p>
                            <p className="font-body text-xs text-nebbia/45 leading-relaxed">
                                Vuoi richiedere una Demo Gratuita o hai altre domande?
                                Registrati e apri una chat con noi — risponde una persona, non un bot.
                            </p>
                        </div>

                        {/* Bonus registrazione */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-oro/5 border border-oro/20">
                            <Sparkles size={12} className="text-oro shrink-0" />
                            <p className="font-body text-xs text-oro/80 leading-relaxed">
                                Registrandoti ricevi <span className="font-medium">3 ricerche gratuite</span> con Lex AI
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Link
                                to="/registrati"
                                onClick={() => setAperto(false)}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors"
                            >
                                Registrati e fai la tua domanda <ArrowRight size={13} />
                            </Link>
                            <Link
                                to="/login"
                                onClick={() => setAperto(false)}
                                className="block text-center font-body text-xs text-nebbia/40 hover:text-nebbia/70 transition-colors pt-1"
                            >
                                Hai già un account? Accedi
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* ── FLOATING BUTTON ── */}
            <button
                onClick={() => setAperto(!aperto)}
                className="fixed bottom-5 right-5 flex items-center gap-2 px-4 py-3 bg-salvia text-petrolio font-body text-sm font-medium shadow-lg shadow-salvia/20 hover:bg-salvia/90 transition-all hover:scale-[1.02] z-50"
            >
                {aperto
                    ? <><X size={15} /> Chiudi</>
                    : <><MessageSquare size={15} /> Parla con noi</>
                }
            </button>
        </>
    )
}