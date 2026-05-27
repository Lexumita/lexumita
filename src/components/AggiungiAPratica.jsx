// src/components/AggiungiAPratica.jsx
//
// Componente riusabile per assegnare una ricerca a una pratica.
// Usato in BancaDati (crea o aggiorna riga in `ricerche`) e in Ricerche
// (aggiorna solo pratica_id su riga esistente).
//
// Visibile solo ad avvocati: guard interno su profile.role.

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { FileText, Search, X, Sparkles } from 'lucide-react'

export default function AggiungiAPratica({
    ricerca,
    onRicercaSalvata,
    ricercaSalvataId,
    setRicercaSalvataId,
    variant = 'default',
}) {
    const { profile } = useAuth()
    const [aperto, setAperto] = useState(false)
    const [cerca, setCerca] = useState('')
    const [pratiche, setPratiche] = useState([])
    const [loading, setLoading] = useState(false)
    const [salvando, setSalvando] = useState(null)
    const [salvatoIn, setSalvatoIn] = useState(null)
    const [errore, setErrore] = useState(null)
    const containerRef = useRef(null)

    // Chiudi al click fuori
    useEffect(() => {
        if (!aperto) return
        function handleClick(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setAperto(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [aperto])

    // Carica pratiche aperte dell'avvocato quando il popover si apre
    useEffect(() => {
        if (!aperto) return
        async function carica() {
            setLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                const { data } = await supabase
                    .from('pratiche')
                    .select('id, titolo, cliente:cliente_id(nome, cognome)')
                    .eq('avvocato_id', user.id)
                    .eq('stato', 'aperta')
                    .order('updated_at', { ascending: false })
                    .limit(50)
                setPratiche(data ?? [])
            } finally {
                setLoading(false)
            }
        }
        carica()
    }, [aperto])

    async function salva(pratica) {
        setSalvando(pratica.id)
        setErrore(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (ricercaSalvataId) {
                // Riga già esistente: aggiorna solo pratica_id
                const { error } = await supabase
                    .from('ricerche')
                    .update({ pratica_id: pratica.id })
                    .eq('id', ricercaSalvataId)
                if (error) throw new Error(error.message)
            } else {
                // Prima volta: crea la riga
                const { data, error } = await supabase
                    .from('ricerche')
                    .insert({
                        pratica_id: pratica.id,
                        user_id: user.id,
                        autore_id: user.id,
                        tipo: ricerca.tipo,
                        titolo: ricerca.domanda,
                        contenuto: ricerca.tipo === 'ricerca_ai' ? ricerca.risposta : ricerca.testo,
                        metadati: {
                            sentenze: ricerca.sentenze ?? false,
                            codice: ricerca.codice ?? null,
                            ts: new Date().toISOString(),
                        }
                    })
                    .select('id')
                    .single()
                if (error) throw new Error(error.message)
                if (setRicercaSalvataId) setRicercaSalvataId(data.id)
            }

            setSalvatoIn(pratica)
            setAperto(false)
            if (onRicercaSalvata) onRicercaSalvata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(null)
        }
    }

    // Guard ruolo: solo avvocati vedono il bottone
    if (profile?.role !== 'avvocato') return null

    if (salvatoIn) return (
        <span className="font-body text-xs text-salvia flex items-center gap-1.5 px-3 py-2 border border-salvia/30 bg-salvia/5">
            <Sparkles size={11} /> Salvato in "{salvatoIn.titolo}"
        </span>
    )

    const buttonClass = variant === 'compact'
        ? 'flex items-center gap-1.5 px-2.5 py-1.5 border border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-oro transition-colors font-body text-xs'
        : 'flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors'

    const pratichefiltrate = cerca.trim()
        ? pratiche.filter(p => p.titolo.toLowerCase().includes(cerca.toLowerCase()))
        : pratiche

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                type="button"
                onClick={() => setAperto(v => !v)}
                className={buttonClass}
            >
                <FileText size={variant === 'compact' ? 11 : 13} />
                <span>Salva in pratica</span>
            </button>

            {aperto && (
                <div className="absolute z-50 bottom-full mb-2 w-80 bg-slate border border-white/10 shadow-2xl">
                    <div className="p-3 border-b border-white/5">
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                            <input
                                autoFocus
                                value={cerca}
                                onChange={e => setCerca(e.target.value)}
                                placeholder="Cerca pratica..."
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-8 pr-8 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <button
                                onClick={() => setAperto(false)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-nebbia"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 flex items-center justify-center gap-2 text-nebbia/30">
                                <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                                <span className="font-body text-xs">Caricamento...</span>
                            </div>
                        ) : pratichefiltrate.length === 0 ? (
                            <p className="p-4 text-center font-body text-xs text-nebbia/25">
                                {cerca ? 'Nessuna pratica trovata' : 'Nessuna pratica aperta'}
                            </p>
                        ) : (
                            pratichefiltrate.map(p => {
                                const isLoading = salvando === p.id
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => salva(p)}
                                        disabled={isLoading}
                                        className="w-full text-left px-3 py-2.5 hover:bg-petrolio/50 transition-colors border-b border-white/5 last:border-0 disabled:opacity-50"
                                    >
                                        <p className="font-body text-sm text-nebbia/80 truncate">{p.titolo}</p>
                                        {p.cliente && (
                                            <p className="font-body text-xs text-nebbia/30 mt-0.5 truncate">
                                                {p.cliente.nome} {p.cliente.cognome}
                                            </p>
                                        )}
                                        {isLoading && (
                                            <span className="font-body text-xs text-oro mt-1 flex items-center gap-1">
                                                <span className="animate-spin w-2.5 h-2.5 border border-oro border-t-transparent rounded-full" />
                                                Salvataggio...
                                            </span>
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </div>

                    {errore && (
                        <div className="p-2 bg-red-900/15 border-t border-red-500/20">
                            <p className="font-body text-xs text-red-400">{errore}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}