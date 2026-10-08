// src/components/shared/RisposteRecuperate.jsx
//
// Popup «Mentre eri via, Lex ha finito» (risposte recuperate, 09-10-2026).
// Se la pagina si chiude mentre Lex scrive, il server salva lo stesso quello che
// Lex ha finito: la risposta in Ricerche (etichetta «Risposte recuperate»), il
// documento come file Word nell'Archivio. Poi scrive una riga in `notifiche`
// con tipo 'lex_risposta_recuperata' o 'lex_documento_recuperato', con titolo,
// descrizione e link già pronti.
//
// Montato una volta in ogni layout con accesso. Legge le notifiche non lette di
// quei due tipi all'apertura, quando la finestra torna in primo piano e ogni
// 60 secondi mentre la scheda è visibile.
//   «Apri»      segna letta quella notifica e apre il suo link;
//   «Ho capito» (anche Esc o un clic fuori) segna lette tutte quelle mostrate.
// Nella stessa scheda una notifica già mostrata non torna più.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, MessageSquareText, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { EVENTO_NOTIFICHE } from '@/hooks/useNotifiche'

const TIPI = ['lex_risposta_recuperata', 'lex_documento_recuperato']
const MASSIMO = 5
const OGNI_MS = 60 * 1000
const PAUSA_MINIMA_MS = 3000     // focus e visibilitychange arrivano spesso insieme
const ATTESA_APRI_MS = 2500      // «Apri» aspetta il segno «letta», ma non all'infinito
const ID_TITOLO = 'risposte-recuperate-titolo'

// Notifiche già mostrate in questa scheda. Sta fuori dal componente perché,
// cambiando pagina, il layout (e con lui il popup) può essere rimontato.
const giaMostrate = new Set()

const attendi = (ms) => new Promise(r => setTimeout(r, ms))
const dentroArea = (percorso) => percorso === '/area' || percorso.startsWith('/area/')

// Il server scrive '/area/...' per i privati e '/...' per gli altri. Il link si
// adatta all'area in cui l'utente è adesso: dentro /area il prefisso si aggiunge
// se manca, per un professionista si toglie.
function adattaLink(link, pathname, area) {
    if (typeof link !== 'string' || !link.startsWith('/') || link.startsWith('//')) return null
    if (area === 'privato' || dentroArea(pathname)) return dentroArea(link) ? link : `/area${link}`
    if (area === 'professionista' && link.startsWith('/area/')) return link.slice('/area'.length)
    return link
}

async function segnaLette(ids, userId) {
    if (!ids.length || !userId) return
    try {
        const { error } = await supabase
            .from('notifiche')
            .update({ letto_at: new Date().toISOString() })
            .in('id', ids)
            .eq('user_id', userId)
            .is('letto_at', null)
        if (error) throw error
        // La campanella non riceve aggiornamenti in tempo reale: le si chiede di rileggere.
        window.dispatchEvent(new Event(EVENTO_NOTIFICHE))
    } catch (e) {
        console.error('RisposteRecuperate segnaLette:', e?.message ?? e)
    }
}

// area: 'privato' (UserLayout), 'professionista' (layout degli studi), niente per gli altri.
export default function RisposteRecuperate({ area }) {
    const { user } = useAuth()
    const userId = user?.id ?? null
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const [voci, setVoci] = useState([])
    const dialogRef = useRef(null)
    const montato = useRef(false)
    const inCorso = useRef(false)
    const ultima = useRef(0)
    const aprendo = useRef(false)
    const fuocoPrima = useRef(null)

    const aperto = voci.length > 0

    useEffect(() => {
        montato.current = true
        return () => { montato.current = false }
    }, [])

    // ─── Lettura: non lette dei due tipi, le più recenti per prime ───
    const controlla = useCallback(async () => {
        if (!userId || inCorso.current) return
        if (Date.now() - ultima.current < PAUSA_MINIMA_MS) return
        inCorso.current = true
        ultima.current = Date.now()
        try {
            const { data, error } = await supabase
                .from('notifiche')
                .select('id, tipo, titolo, descrizione, link, created_at')
                .eq('user_id', userId)
                .in('tipo', TIPI)
                .is('letto_at', null)
                .order('created_at', { ascending: false })
                .limit(MASSIMO)
            if (error) throw error
            if (!montato.current) return
            const nuove = (data ?? []).filter(n => !giaMostrate.has(n.id))
            if (nuove.length === 0) return
            nuove.forEach(n => giaMostrate.add(n.id))
            setVoci(prev => [...nuove, ...prev])
        } catch (e) {
            console.error('RisposteRecuperate lettura:', e?.message ?? e)
        } finally {
            inCorso.current = false
        }
    }, [userId])

    // All'apertura, al ritorno in primo piano e ogni 60 secondi a scheda visibile
    useEffect(() => {
        if (!userId) return
        controlla()
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') controlla()
        }, OGNI_MS)
        const allaRipresa = () => {
            if (document.visibilityState === 'visible') controlla()
        }
        window.addEventListener('focus', allaRipresa)
        document.addEventListener('visibilitychange', allaRipresa)
        return () => {
            clearInterval(timer)
            window.removeEventListener('focus', allaRipresa)
            document.removeEventListener('visibilitychange', allaRipresa)
        }
    }, [userId, controlla])

    // ─── «Ho capito», Esc, clic fuori: lette tutte quelle mostrate ───
    const chiudi = useCallback(() => {
        const ids = voci.map(n => n.id)
        setVoci([])
        segnaLette(ids, userId)
    }, [voci, userId])

    // ─── «Apri»: letta solo questa, poi si va al suo link ───
    async function apri(n, link) {
        if (aprendo.current) return
        aprendo.current = true
        fuocoPrima.current = null          // si cambia pagina: il fuoco non torna indietro
        setVoci([])
        await Promise.race([segnaLette([n.id], userId), attendi(ATTESA_APRI_MS)])
        aprendo.current = false
        navigate(link)
    }

    // Fuoco dentro la finestra all'apertura; alla chiusura torna dov'era
    useEffect(() => {
        if (!aperto) return
        fuocoPrima.current = document.activeElement
        dialogRef.current?.focus()
        return () => {
            const prima = fuocoPrima.current
            fuocoPrima.current = null
            if (prima instanceof HTMLElement && prima.isConnected) prima.focus({ preventScroll: true })
        }
    }, [aperto])

    // Esc chiude (solo questa finestra); Tab resta dentro la finestra
    useEffect(() => {
        if (!aperto) return
        function onKey(e) {
            if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                chiudi()
                return
            }
            const finestra = dialogRef.current
            if (e.key !== 'Tab' || !finestra) return
            const comandi = [...finestra.querySelectorAll('button:not([disabled]), a[href]')]
            if (comandi.length === 0) return
            const primo = comandi[0]
            const ultimo = comandi[comandi.length - 1]
            const attivo = document.activeElement
            if (!finestra.contains(attivo)) {
                e.preventDefault()
                primo.focus()
            } else if (e.shiftKey && (attivo === primo || attivo === finestra)) {
                e.preventDefault()
                ultimo.focus()
            } else if (!e.shiftKey && attivo === ultimo) {
                e.preventDefault()
                primo.focus()
            }
        }
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [aperto, chiudi])

    if (!aperto) return null

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm"
            onClick={chiudi}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={ID_TITOLO}
                tabIndex={-1}
                className="bg-slate border border-oro/30 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl outline-none"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5 shrink-0">
                    <Sparkles size={14} className="text-oro shrink-0" aria-hidden="true" />
                    <h2 id={ID_TITOLO} className="font-body text-sm font-medium text-nebbia">
                        Mentre eri via, Lex ha finito
                    </h2>
                </div>

                <ul className="flex-1 overflow-y-auto divide-y divide-white/5">
                    {voci.map(n => {
                        const Icona = n.tipo === 'lex_documento_recuperato' ? FileText : MessageSquareText
                        const link = adattaLink(n.link, pathname, area)
                        const idVoce = `risposta-recuperata-${n.id}`
                        return (
                            <li key={n.id} className="flex items-start gap-3 px-5 py-4">
                                <Icona size={15} className="text-oro mt-0.5 shrink-0" aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <p id={idVoce} className="font-body text-sm font-semibold text-nebbia">{n.titolo}</p>
                                    {n.descrizione && (
                                        <p className="font-body text-xs text-nebbia/60 mt-1 leading-relaxed break-words">{n.descrizione}</p>
                                    )}
                                    {link && (
                                        <button
                                            type="button"
                                            onClick={() => apri(n, link)}
                                            aria-describedby={idVoce}
                                            className="mt-3 inline-flex items-center gap-1.5 min-h-[40px] px-4 bg-oro/15 border border-oro/40 text-oro font-body text-xs hover:bg-oro/25 transition-colors"
                                        >
                                            Apri <ArrowRight size={12} aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>

                <div className="flex justify-end px-5 py-4 border-t border-white/5 shrink-0">
                    <button
                        type="button"
                        onClick={chiudi}
                        className="min-h-[40px] px-5 border border-white/10 text-nebbia/70 font-body text-sm hover:text-nebbia hover:border-white/25 transition-colors"
                    >
                        Ho capito
                    </button>
                </div>
            </div>
        </div>
    )
}
