import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Tag, Check, Plus, X, Loader2, Search } from 'lucide-react'

const PALETTE = [
    '#C9A45C', // oro
    '#7FA39A', // salvia
    '#8B7BB8', // viola
    '#D49B6F', // pesca
    '#6FA3D4', // azzurro
    '#D47F7F', // rosa
    '#8FB979', // verde
    '#B57FD4', // lilla
]

function coloreCasuale() {
    return PALETTE[Math.floor(Math.random() * PALETTE.length)]
}

/**
 * Componente riusabile per assegnare un elemento (ricerca AI, norma, sentenza, prassi)
 * a una o più etichette dell'utente.
 *
 * Props:
 * - elemento: { tipo: 'ricerca_ai'|'norma'|'sentenza'|'prassi', id: UUID }
 *             Per tipo='ricerca_ai': se id manca, viene creato un nuovo record in ricerche_ai
 *             usando i campi `domanda` e `risposta` passati come prop.
 * - domanda, risposta, metadati: usati solo se tipo='ricerca_ai' senza id (per creare il record)
 * - variant: 'default' | 'compact' (stile pulsante)
 * - onCambio: callback opzionale dopo assegnazione/rimozione
 */
export default function AggiungiAEtichetta({
    elemento,
    domanda,
    risposta,
    metadati = {},
    variant = 'default',
    onCambio,
    ricercaIdEsterno = null,
    onRicercaCreata = null,
}) {
    const [aperto, setAperto] = useState(false)
    const [etichette, setEtichette] = useState([])
    const [assegnate, setAssegnate] = useState(new Set()) // set di etichetta_id
    const [cerca, setCerca] = useState('')
    const [loading, setLoading] = useState(false)
    const [salvando, setSalvando] = useState(null) // id dell'etichetta in fase di salvataggio
    const [creando, setCreando] = useState(false)
    const [errore, setErrore] = useState('')
    const [elementoId, setElementoId] = useState(elemento?.id ?? ricercaIdEsterno ?? null)

    // Sincronizza se il sibling SalvaInPratica crea la riga prima di noi
    useEffect(() => {
        if (ricercaIdEsterno && ricercaIdEsterno !== elementoId) {
            setElementoId(ricercaIdEsterno)
        }
    }, [ricercaIdEsterno])

    const containerRef = useRef(null)
    const buttonRef = useRef(null)
    const inputRef = useRef(null)
    const [posizione, setPosizione] = useState({ top: 0, left: 0 })

    // Calcola posizione popover quando si apre
    useEffect(() => {
        if (!aperto || !buttonRef.current) return
        function calcolaPosizione() {
            const rect = buttonRef.current.getBoundingClientRect()
            const popWidth = 288 // w-72 = 18rem = 288px
            // Allinea il popover sotto al bottone, ancorato a destra
            let left = rect.right - popWidth
            // Se uscirebbe a sinistra, ancora a sinistra del bottone
            if (left < 8) left = rect.left
            // Se anche così uscirebbe a destra, fissa al bordo destro - 8px
            if (left + popWidth > window.innerWidth - 8) {
                left = window.innerWidth - popWidth - 8
            }
            setPosizione({
                top: rect.bottom + 8,
                left,
            })
        }
        calcolaPosizione()
        window.addEventListener('resize', calcolaPosizione)
        window.addEventListener('scroll', calcolaPosizione, true)
        return () => {
            window.removeEventListener('resize', calcolaPosizione)
            window.removeEventListener('scroll', calcolaPosizione, true)
        }
    }, [aperto])

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

    // Focus automatico sull'input quando si apre
    useEffect(() => {
        if (aperto) inputRef.current?.focus()
    }, [aperto])

    // Carica etichette dell'utente + assegnazioni esistenti per questo elemento
    useEffect(() => {
        if (!aperto) return
        async function carica() {
            setLoading(true)
            setErrore('')
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) throw new Error('Non autenticato')

                // Carica tutte le etichette dell'utente
                const { data: tags } = await supabase
                    .from('etichette')
                    .select('id, nome, colore')
                    .eq('user_id', user.id)
                    .order('nome')

                setEtichette(tags ?? [])

                // Se l'elemento ha già un id, carica le assegnazioni esistenti
                if (elementoId) {
                    const { data: ass } = await supabase
                        .from('elementi_etichette')
                        .select('etichetta_id')
                        .eq('tipo', elemento.tipo)
                        .eq('elemento_id', elementoId)
                    setAssegnate(new Set((ass ?? []).map(a => a.etichetta_id)))
                }
            } catch (err) {
                setErrore(err.message)
            } finally {
                setLoading(false)
            }
        }
        carica()
    }, [aperto, elementoId, elemento?.tipo])

    // Crea il record ricerche_ai al volo se serve
    async function creaRicercaAiSeServe() {
        if (elementoId) return elementoId
        if (elemento.tipo !== 'ricerca_ai') {
            throw new Error('elemento.id mancante per tipo ' + elemento.tipo)
        }
        if (!domanda || !risposta) {
            throw new Error('domanda e risposta richieste per creare ricerca_ai')
        }
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
            .from('ricerche')
            .insert({
                user_id: user.id,
                autore_id: user.id,
                tipo: 'ricerca_ai',
                pratica_id: null,
                titolo: domanda,
                contenuto: risposta,
                metadati,
            })
            .select('id')
            .single()
        if (error) throw new Error(error.message)
        setElementoId(data.id)
        if (onRicercaCreata) onRicercaCreata(data.id)
        return data.id
    }

    // Toggle assegnazione di una etichetta
    async function toggle(etichettaId) {
        setSalvando(etichettaId)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Non autenticato')

            const id = await creaRicercaAiSeServe()

            if (assegnate.has(etichettaId)) {
                // Rimuovi
                const { error } = await supabase
                    .from('elementi_etichette')
                    .delete()
                    .eq('etichetta_id', etichettaId)
                    .eq('tipo', elemento.tipo)
                    .eq('elemento_id', id)
                if (error) throw new Error(error.message)
                setAssegnate(prev => {
                    const s = new Set(prev)
                    s.delete(etichettaId)
                    return s
                })
            } else {
                // Aggiungi
                const { error } = await supabase
                    .from('elementi_etichette')
                    .insert({
                        etichetta_id: etichettaId,
                        user_id: user.id,
                        tipo: elemento.tipo,
                        elemento_id: id,
                    })
                if (error) throw new Error(error.message)
                setAssegnate(prev => new Set(prev).add(etichettaId))
            }
            onCambio?.()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvando(null)
        }
    }

    // Crea nuova etichetta + assegna
    async function creaEAssegna(nome) {
        setCreando(true)
        setErrore('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Non autenticato')

            const { data: nuova, error: errCrea } = await supabase
                .from('etichette')
                .insert({
                    user_id: user.id,
                    nome: nome.trim(),
                    colore: coloreCasuale(),
                })
                .select('id, nome, colore')
                .single()
            if (errCrea) throw new Error(errCrea.message)

            // Aggiungi alla lista locale
            setEtichette(prev => [...prev, nuova].sort((a, b) => a.nome.localeCompare(b.nome)))

            // Assegna l'elemento alla nuova etichetta
            const id = await creaRicercaAiSeServe()
            const { error: errAssegna } = await supabase
                .from('elementi_etichette')
                .insert({
                    etichetta_id: nuova.id,
                    user_id: user.id,
                    tipo: elemento.tipo,
                    elemento_id: id,
                })
            if (errAssegna) throw new Error(errAssegna.message)

            setAssegnate(prev => new Set(prev).add(nuova.id))
            setCerca('')
            onCambio?.()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setCreando(false)
        }
    }

    // Filtra etichette per testo digitato
    const etichetteFiltrate = etichette.filter(t =>
        t.nome.toLowerCase().includes(cerca.toLowerCase())
    )
    const matchEsatto = etichette.some(t => t.nome.toLowerCase() === cerca.trim().toLowerCase())
    const mostraCrea = cerca.trim().length > 0 && !matchEsatto

    // Stile pulsante in base alla variante
    // 'default' usa stile uguale a btn-secondary (padding + border) per allinearsi visivamente a "Aggiungi a pratica"
    const buttonClass = variant === 'compact'
        ? 'flex items-center gap-1.5 px-2.5 py-1.5 border border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-oro transition-colors font-body text-xs'
        : 'btn-secondary text-sm flex items-center gap-2'

    const numAssegnate = assegnate.size

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setAperto(v => !v)}
                className={buttonClass}
            >
                <Tag size={variant === 'compact' ? 11 : 13} />
                <span>
                    {numAssegnate === 0
                        ? 'Aggiungi a etichetta'
                        : `${numAssegnate} ${numAssegnate === 1 ? 'etichetta' : 'etichette'}`
                    }
                </span>
            </button>

            {aperto && (
                <div
                    className="fixed z-[100] w-72 bg-slate border border-white/10 shadow-2xl"
                    style={{ top: posizione.top, left: posizione.left }}
                >
                    {/* Search bar */}
                    <div className="p-3 border-b border-white/5">
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                            <input
                                ref={inputRef}
                                value={cerca}
                                onChange={e => setCerca(e.target.value)}
                                placeholder="Cerca o crea etichetta..."
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

                    {/* Lista etichette */}
                    <div className="max-h-64 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 flex items-center justify-center gap-2 text-nebbia/30">
                                <Loader2 size={14} className="animate-spin" />
                                <span className="font-body text-xs">Caricamento...</span>
                            </div>
                        ) : (
                            <>
                                {etichetteFiltrate.length === 0 && !mostraCrea && (
                                    <p className="p-4 text-center font-body text-xs text-nebbia/25">
                                        Nessuna etichetta. Digita un nome per crearne una.
                                    </p>
                                )}

                                {etichetteFiltrate.map(t => {
                                    const isAssegnata = assegnate.has(t.id)
                                    const isLoading = salvando === t.id
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => toggle(t.id)}
                                            disabled={isLoading}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-petrolio/50 transition-colors text-left disabled:opacity-50"
                                        >
                                            <div
                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: t.colore || '#7FA39A' }}
                                            />
                                            <span className="flex-1 font-body text-sm text-nebbia/70 truncate">{t.nome}</span>
                                            {isLoading ? (
                                                <Loader2 size={12} className="animate-spin text-oro shrink-0" />
                                            ) : isAssegnata ? (
                                                <Check size={12} className="text-salvia shrink-0" />
                                            ) : null}
                                        </button>
                                    )
                                })}

                                {mostraCrea && (
                                    <button
                                        onClick={() => creaEAssegna(cerca)}
                                        disabled={creando}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-oro/10 transition-colors text-left border-t border-white/5 disabled:opacity-50"
                                    >
                                        {creando ? (
                                            <Loader2 size={12} className="animate-spin text-oro shrink-0" />
                                        ) : (
                                            <Plus size={12} className="text-oro shrink-0" />
                                        )}
                                        <span className="flex-1 font-body text-sm text-oro truncate">
                                            Crea "{cerca.trim()}"
                                        </span>
                                    </button>
                                )}
                            </>
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