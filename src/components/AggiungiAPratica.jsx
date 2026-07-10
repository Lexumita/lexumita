// src/components/AggiungiAPratica.jsx
//
// Componente riusabile per assegnare una ricerca a una pratica (avvocato)
// o a un mandato (commercialista). Bifronte per ruolo.
//
// Usato in BancaDati (crea o aggiorna riga in `ricerche`) e in Ricerche
// (aggiorna solo pratica_id/mandato_id su riga esistente).
//
// - role === 'avvocato'       → modalità PRATICA  (tabella pratiche, FK pratica_id)
// - role === 'commercialista' → modalità MANDATO  (tabella mandati,  FK mandato_id)
// - altri ruoli               → null (invisibile)

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { FileText, FolderOpen, Search, X, Sparkles } from 'lucide-react'

// Config che astrae le differenze pratica/mandato. Il resto è identico.
const CONFIG = {
    avvocato: {
        tabella: 'pratiche',
        fk: 'pratica_id',
        filtroStato: 'aperta',
        label: 'Salva in pratica',
        cercaPlaceholder: 'Cerca pratica...',
        vuotoConCerca: 'Nessuna pratica trovata',
        vuotoSenzaCerca: 'Nessuna pratica aperta',
        icona: FileText,
    },
    commercialista: {
        tabella: 'mandati',
        fk: 'mandato_id',
        filtroStato: 'attivo',
        label: 'Salva in mandato',
        cercaPlaceholder: 'Cerca mandato...',
        vuotoConCerca: 'Nessun mandato trovato',
        vuotoSenzaCerca: 'Nessun mandato attivo',
        icona: FolderOpen,
    },
}

export default function AggiungiAPratica({
    ricerca,
    onRicercaSalvata,
    ricercaSalvataId,
    setRicercaSalvataId,
    variant = 'default',
}) {
    const { profile } = useAuth()
    const cfg = CONFIG[profile?.role] ?? null

    const [aperto, setAperto] = useState(false)
    const [cerca, setCerca] = useState('')
    const [items, setItems] = useState([])      // pratiche o mandati
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

    // Carica pratiche/mandati attivi quando il popover si apre
    useEffect(() => {
        if (!aperto || !cfg) return
        async function carica() {
            setLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { setErrore('Sessione scaduta. Effettua di nuovo il login.'); return }
                const { data, error } = await supabase
                    .from(cfg.tabella)
                    .select('id, titolo, cliente:cliente_id(nome, cognome, ragione_sociale, tipo_soggetto)')
                    .eq('avvocato_id', user.id)
                    .eq('stato', cfg.filtroStato)
                    .order('updated_at', { ascending: false })
                    .limit(50)
                if (error) { setErrore(error.message); setItems([]); return }
                setItems(data ?? [])
            } finally {
                setLoading(false)
            }
        }
        carica()
    }, [aperto, cfg])

    function nomeClienteDisplay(c) {
        if (!c) return null
        if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? null
        return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || null
    }

    async function salva(item) {
        setSalvando(item.id)
        setErrore(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Sessione scaduta. Effettua di nuovo il login.')

            if (ricercaSalvataId) {
                // Riga già esistente: aggiorna solo la FK (pratica_id o mandato_id)
                const { error } = await supabase
                    .from('ricerche')
                    .update({ [cfg.fk]: item.id })
                    .eq('id', ricercaSalvataId)
                if (error) throw new Error(error.message)
            } else {
                // Prima volta: crea la riga
                const { data, error } = await supabase
                    .from('ricerche')
                    .insert({
                        [cfg.fk]: item.id,
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

            setSalvatoIn(item)
            setAperto(false)
            if (onRicercaSalvata) onRicercaSalvata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(null)
        }
    }

    // Guard ruolo: solo avvocati e commercialisti vedono il bottone
    if (!cfg) return null

    const Icona = cfg.icona

    if (salvatoIn) return (
        <span className="font-body text-xs text-salvia flex items-center gap-1.5 px-3 py-2 border border-salvia/30 bg-salvia/5">
            <Sparkles size={11} /> Salvato in "{salvatoIn.titolo}"
        </span>
    )

    const buttonClass = variant === 'compact'
        ? 'flex items-center gap-1.5 px-2.5 py-1.5 border border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-oro transition-colors font-body text-xs'
        : 'flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors'

    const itemsFiltrati = cerca.trim()
        ? items.filter(p => p.titolo.toLowerCase().includes(cerca.toLowerCase()))
        : items

    return (
        <div ref={containerRef} className="relative inline-block">
            <button type="button" onClick={() => setAperto(v => !v)} className={buttonClass}>
                <Icona size={variant === 'compact' ? 11 : 13} />
                <span>{cfg.label}</span>
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
                                placeholder={cfg.cercaPlaceholder}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-8 pr-8 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <button onClick={() => setAperto(false)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-nebbia">
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
                        ) : itemsFiltrati.length === 0 ? (
                            <p className="p-4 text-center font-body text-xs text-nebbia/25">
                                {cerca ? cfg.vuotoConCerca : cfg.vuotoSenzaCerca}
                            </p>
                        ) : (
                            itemsFiltrati.map(p => {
                                const isLoading = salvando === p.id
                                const nomeCliente = nomeClienteDisplay(p.cliente)
                                return (
                                    <button key={p.id} onClick={() => salva(p)} disabled={isLoading}
                                        className="w-full text-left px-3 py-2.5 hover:bg-petrolio/50 transition-colors border-b border-white/5 last:border-0 disabled:opacity-50">
                                        <p className="font-body text-sm text-nebbia/80 truncate">{p.titolo}</p>
                                        {nomeCliente && (
                                            <p className="font-body text-xs text-nebbia/30 mt-0.5 truncate">{nomeCliente}</p>
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
