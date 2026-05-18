// src/components/avvocato/NuovoTerminePratica.jsx
//
// Modal per aggiungere un termine processuale a una pratica.
// Flow:
//   1. Selezione tipo termine (raggruppato per materia)
//   2. Inserimento data evento (la label cambia in base al tipo)
//   3. Anteprima calcolo live tramite RPC calcola_termine
//   4. Note opzionali
//   5. Salva: insert in termini_processuali (trigger DB crea evento calendario)

import { useState, useEffect } from 'react'
import { X, Calendar, AlertTriangle, Loader2, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const MATERIA_LABEL = {
    civile: 'Civile',
    penale: 'Penale',
    amministrativo: 'Amministrativo',
    tributario: 'Tributario',
}

// Tipi che si calcolano "a ritroso" dalla data evento (es. dall'udienza)
const TIPI_A_RITROSO = [
    'comparsa_costituzione',
    'atto_citazione_termine',
    'memoria_183_n1',
    'memoria_183_n2',
    'memoria_183_n3',
]

function fmtDataLunga(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('it-IT', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })
}

export default function NuovoTerminePratica({ praticaId, onClose, onSaved }) {
    const [tipi, setTipi] = useState([])
    const [tipoSelected, setTipoSelected] = useState('')
    const [dataEvento, setDataEvento] = useState(new Date().toISOString().slice(0, 10))
    const [eventoDescrizione, setEventoDescrizione] = useState('')
    const [noteAvvocato, setNoteAvvocato] = useState('')
    const [anteprima, setAnteprima] = useState(null)
    const [calcolando, setCalcolando] = useState(false)
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState(null)

    // Chiudi con ESC
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape' && !salvando) onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose, salvando])

    // Carica tipi termini
    useEffect(() => {
        supabase
            .from('tipi_termini')
            .select('*')
            .eq('attivo', true)
            .order('ordine')
            .then(({ data, error }) => {
                if (error) {
                    console.error('Errore caricamento tipi_termini:', error.message)
                    setErrore('Impossibile caricare i tipi di termine')
                } else {
                    setTipi(data ?? [])
                }
            })
    }, [])

    // Calcola anteprima
    useEffect(() => {
        if (!tipoSelected || !dataEvento) {
            setAnteprima(null)
            return
        }

        let cancelled = false
        setCalcolando(true)
        setErrore(null)

        const aRitroso = TIPI_A_RITROSO.includes(tipoSelected)

        supabase
            .rpc('calcola_termine', {
                p_codice_tipo: tipoSelected,
                p_data_evento: dataEvento,
                p_a_ritroso: aRitroso,
            })
            .then(({ data, error }) => {
                if (cancelled) return
                if (error) {
                    setErrore(error.message)
                    setAnteprima(null)
                } else {
                    setAnteprima(Array.isArray(data) ? data[0] : data)
                }
                setCalcolando(false)
            })

        return () => { cancelled = true }
    }, [tipoSelected, dataEvento])

    const tipoCorrente = tipi.find(t => t.codice === tipoSelected)
    const aRitroso = TIPI_A_RITROSO.includes(tipoSelected)

    // Raggruppa tipi per materia
    const tipiPerMateria = tipi.reduce((acc, t) => {
        const m = t.materia ?? 'altro'
        if (!acc[m]) acc[m] = []
        acc[m].push(t)
        return acc
    }, {})

    // Salva
    async function salva() {
        if (!tipoSelected || !dataEvento || !anteprima) return
        setSalvando(true)
        setErrore(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setErrore('Sessione scaduta. Effettua nuovamente il login.')
            setSalvando(false)
            return
        }

        const { error } = await supabase
            .from('termini_processuali')
            .insert({
                pratica_id: praticaId,
                tipo_codice: tipoSelected,
                tipo_label: tipoCorrente.label,
                data_evento: dataEvento,
                evento_descrizione: eventoDescrizione.trim() || null,
                a_ritroso: aRitroso,
                data_scadenza: anteprima.data_scadenza,
                data_scadenza_grezza: anteprima.data_scadenza_grezza,
                giorni_sospensione: anteprima.giorni_sospensione,
                note_calcolo: anteprima.note,
                note_avvocato: noteAvvocato.trim() || null,
                stato: 'in_corso',
                autore_id: user.id,
            })

        setSalvando(false)
        if (error) {
            setErrore(error.message)
            return
        }
        onSaved()
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm overflow-y-auto"
            onClick={() => { if (!salvando) onClose() }}
        >
            <div
                className="bg-slate border border-white/10 w-full max-w-2xl my-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div>
                        <p className="font-display text-lg text-nebbia">Aggiungi termine processuale</p>
                        <p className="font-body text-xs text-nebbia/40 mt-0.5">
                            La scadenza viene calcolata automaticamente in base al tipo di termine
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={salvando}
                        className="p-1 hover:bg-white/5 transition-colors disabled:opacity-40"
                    >
                        <X size={18} className="text-nebbia/60" />
                    </button>
                </div>

                <div className="p-6 space-y-5">

                    {/* Tipo termine */}
                    <div>
                        <label className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 block">
                            Tipo di termine *
                        </label>
                        <select
                            value={tipoSelected}
                            onChange={e => setTipoSelected(e.target.value)}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50"
                        >
                            <option value="">Seleziona un tipo di termine...</option>
                            {Object.entries(tipiPerMateria).map(([materia, list]) => (
                                <optgroup key={materia} label={MATERIA_LABEL[materia] ?? materia}>
                                    {list.map(t => (
                                        <option key={t.codice} value={t.codice}>{t.label}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        {tipoCorrente?.descrizione && (
                            <p className="font-body text-xs text-nebbia/40 mt-2 italic flex items-start gap-1.5">
                                <Info size={11} className="mt-0.5 shrink-0" />
                                <span>{tipoCorrente.descrizione}</span>
                            </p>
                        )}
                    </div>

                    {/* Data evento */}
                    {tipoCorrente && (
                        <div>
                            <label className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 block">
                                {tipoCorrente.da_evento_label} *
                            </label>
                            <input
                                type="date"
                                value={dataEvento}
                                onChange={e => setDataEvento(e.target.value)}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50"
                            />
                            <p className="font-body text-xs text-nebbia/40 mt-2">
                                {aRitroso
                                    ? `Il termine viene calcolato a ritroso (${tipoCorrente.giorni} giorni prima)`
                                    : `Il termine viene calcolato in avanti (${tipoCorrente.giorni} giorni dopo)`
                                }
                                {tipoCorrente.sospensione_feriale
                                    ? ' - con sospensione feriale 1-31 agosto'
                                    : ' - senza sospensione feriale'
                                }
                            </p>
                        </div>
                    )}

                    {/* Descrizione evento (opzionale) */}
                    {tipoCorrente && (
                        <div>
                            <label className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 block">
                                Descrizione evento (opzionale)
                            </label>
                            <input
                                type="text"
                                value={eventoDescrizione}
                                onChange={e => setEventoDescrizione(e.target.value)}
                                placeholder={`es. ${tipoCorrente.da_evento_label} del ${new Date(dataEvento).toLocaleDateString('it-IT')}`}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <p className="font-body text-xs text-nebbia/30 mt-1.5">
                                Annotazione di servizio per ricordarti il contesto dell'evento
                            </p>
                        </div>
                    )}

                    {/* Anteprima calcolo */}
                    {tipoSelected && (
                        <div className="bg-petrolio/50 border border-oro/20 p-4">
                            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-3">
                                Anteprima calcolo
                            </p>
                            {calcolando ? (
                                <div className="flex items-center gap-2 text-nebbia/50">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span className="font-body text-sm">Calcolo in corso...</span>
                                </div>
                            ) : anteprima ? (
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Calendar size={18} className="text-oro mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-display text-xl font-semibold text-oro capitalize">
                                                {fmtDataLunga(anteprima.data_scadenza)}
                                            </p>
                                            <p className="font-body text-xs text-nebbia/50 mt-0.5">Scadenza calcolata</p>
                                        </div>
                                    </div>
                                    {anteprima.note && (
                                        <div className="flex items-start gap-3 pt-2 border-t border-white/5">
                                            <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                            <p className="font-body text-xs text-amber-400/90">{anteprima.note}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="font-body text-sm text-nebbia/40">Seleziona un tipo e una data per vedere il calcolo</p>
                            )}
                        </div>
                    )}

                    {/* Note avvocato */}
                    {tipoCorrente && (
                        <div>
                            <label className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 block">
                                Note (opzionale)
                            </label>
                            <textarea
                                value={noteAvvocato}
                                onChange={e => setNoteAvvocato(e.target.value)}
                                rows={2}
                                placeholder="Promemoria, riferimenti, strategia..."
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                            />
                        </div>
                    )}

                    {/* Info trigger calendario */}
                    {tipoCorrente && anteprima && (
                        <div className="flex items-start gap-2 text-nebbia/40">
                            <Info size={11} className="mt-0.5 shrink-0" />
                            <p className="font-body text-xs">
                                Salvando, il termine verra' aggiunto anche al calendario come scadenza
                            </p>
                        </div>
                    )}

                    {/* Errore */}
                    {errore && (
                        <div className="bg-red-500/10 border border-red-500/30 p-3">
                            <p className="font-body text-sm text-red-400">{errore}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
                    <button
                        onClick={onClose}
                        disabled={salvando}
                        className="font-body text-sm text-nebbia/60 hover:text-nebbia px-4 py-2 transition-colors disabled:opacity-40"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={salva}
                        disabled={!tipoSelected || !dataEvento || !anteprima || salvando || calcolando}
                        className="flex items-center gap-2 px-5 py-2 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {salvando ? (
                            <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                        ) : (
                            'Aggiungi termine'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}