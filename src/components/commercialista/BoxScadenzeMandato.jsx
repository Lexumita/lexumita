// src/components/commercialista/BoxScadenzeMandato.jsx
//
// Box scadenze dentro il dettaglio mandato (port dal fiduciario CH).
// In più rispetto a CH: pulsante "Genera scadenzario" che precarica le
// scadenze fiscali standard dell'anno di riferimento in base al regime
// contabile del cliente (F24, LIPE, acconti, dichiarativi).
//
// Props:
//   mandatoId  (string)       - mandato corrente
//   clienteId  (string|null)  - cliente del mandato
//   studioId   (string|null)  - studio
//   anno       (number|null)  - anno_riferimento del mandato (abilita il generatore)
//   regime     (string|null)  - regime_contabile del cliente (guida lo scadenzario)

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
    CalendarClock, Plus, Loader2, Check, RotateCcw, Trash2,
    AlertTriangle, Calendar, Clock, Sparkles,
} from 'lucide-react'
import NuovaScadenzaMandato from './NuovaScadenzaMandato'
import { generaScadenzeFiscali, TIPI_SCADENZA } from '@/lib/scadenzarioFiscale'

function fmtData(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function giorniAllaScadenza(iso) {
    if (!iso) return null
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    const target = new Date(iso); target.setHours(0, 0, 0, 0)
    return Math.round((target - oggi) / (1000 * 60 * 60 * 24))
}

const STATO_CONFIG = {
    aperta: { label: 'Aperta', classe: 'bg-salvia/10 border-salvia/30 text-salvia' },
    completata: { label: 'Completata', classe: 'bg-oro/10 border-oro/30 text-oro' },
}

export default function BoxScadenzeMandato({ mandatoId, clienteId = null, studioId = null, anno = null, regime = null, refreshTrigger = 0 }) {
    const [scadenze, setScadenze] = useState([])
    const [loading, setLoading] = useState(true)
    const [mostraModal, setMostraModal] = useState(false)
    const [azione, setAzione] = useState(null)     // id in lavorazione
    const [generando, setGenerando] = useState(false)
    const [erroreGen, setErroreGen] = useState(null)

    useEffect(() => {
        if (mandatoId) carica()
    }, [mandatoId, refreshTrigger])

    async function carica() {
        setLoading(true)
        const { data } = await supabase
            .from('scadenze_mandato')
            .select('*')
            .eq('mandato_id', mandatoId)
            .order('data_scadenza', { ascending: true })
        setScadenze(data ?? [])
        setLoading(false)
    }

    // ── Generatore scadenzario fiscale ──
    async function generaScadenzario() {
        setErroreGen(null)
        if (!anno) return
        const regimeLabel = regime === 'forfettario' ? 'forfettario'
            : regime === 'semplificato' ? 'semplificato'
                : 'ordinario'
        const conferma = scadenze.length > 0
            ? `Il mandato ha già ${scadenze.length} scadenze. Vuoi comunque aggiungere lo scadenzario fiscale ${anno} (regime ${regimeLabel})? Le scadenze standard verranno aggiunte a quelle esistenti.`
            : `Genero lo scadenzario fiscale ${anno} per regime ${regimeLabel}? Potrai poi modificare o eliminare le singole scadenze.`
        if (!confirm(conferma)) return

        setGenerando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Sessione scaduta.')

            const generate = generaScadenzeFiscali(anno, regime)
            const righe = generate.map(s => ({
                mandato_id: mandatoId,
                cliente_id: clienteId,
                avvocato_id: user.id,
                studio_id: studioId,
                titolo: s.titolo,
                tipo: s.tipo,
                data_scadenza: s.data_scadenza,
                stato: 'aperta',
                note: s.note,
                creato_da: user.id,
            }))

            const { error } = await supabase.from('scadenze_mandato').insert(righe)
            if (error) throw new Error(error.message)
            await carica()
        } catch (e) {
            setErroreGen(e.message)
        } finally {
            setGenerando(false)
        }
    }

    async function completa(s) {
        setAzione(s.id)
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('scadenze_mandato').update({
            stato: 'completata',
            data_completamento: new Date().toISOString().slice(0, 10),
            aggiornato_da: user.id,
            updated_at: new Date().toISOString(),
        }).eq('id', s.id)
        await carica()
        setAzione(null)
    }

    async function riapri(s) {
        setAzione(s.id)
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('scadenze_mandato').update({
            stato: 'aperta',
            data_completamento: null,
            aggiornato_da: user.id,
            updated_at: new Date().toISOString(),
        }).eq('id', s.id)
        await carica()
        setAzione(null)
    }

    async function elimina(s) {
        if (!confirm(`Eliminare la scadenza "${s.titolo}"?`)) return
        setAzione(s.id)
        await supabase.from('scadenze_mandato').delete().eq('id', s.id)
        await carica()
        setAzione(null)
    }

    return (
        <div className="bg-slate border border-white/5 flex flex-col h-[440px]">
            {/* Header box */}
            <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 shrink-0 flex-wrap">
                <div className="flex items-center gap-2">
                    <CalendarClock size={15} className="text-oro/60" />
                    <h2 className="font-display text-lg text-nebbia">Scadenze</h2>
                    {scadenze.length > 0 && <span className="font-body text-xs text-nebbia/30">({scadenze.length})</span>}
                </div>
                <div className="flex items-center gap-2">
                    {anno && (
                        <button
                            onClick={generaScadenzario}
                            disabled={generando}
                            title={`Precarica le scadenze fiscali ${anno}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-xs hover:bg-salvia/20 transition-colors disabled:opacity-40"
                        >
                            {generando ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            Scadenzario {anno}
                        </button>
                    )}
                    <button
                        onClick={() => setMostraModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors"
                    >
                        <Plus size={12} /> Nuova
                    </button>
                </div>
            </div>

            {erroreGen && (
                <div className="mx-6 mb-2 shrink-0 flex items-center gap-2 text-red-400 text-xs font-body p-2 bg-red-900/10 border border-red-500/20">
                    <AlertTriangle size={12} /> {erroreGen}
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div className="flex-1 flex justify-center items-center">
                    <Loader2 size={18} className="animate-spin text-oro" />
                </div>
            ) : scadenze.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
                    <p className="font-body text-xs text-nebbia/30 italic">Nessuna scadenza per questo mandato.</p>
                    {anno && (
                        <p className="font-body text-xs text-nebbia/25">
                            Usa «Scadenzario {anno}» per precaricare le scadenze fiscali standard.
                        </p>
                    )}
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
                    {scadenze.map(s => {
                        const cfg = STATO_CONFIG[s.stato] ?? STATO_CONFIG.aperta
                        const tipoCfg = s.tipo ? TIPI_SCADENZA[s.tipo] : null
                        const gg = giorniAllaScadenza(s.data_scadenza)
                        const completata = s.stato === 'completata'
                        const urgente = !completata && gg !== null && gg >= 0 && gg <= 7
                        const scaduta = !completata && gg !== null && gg < 0
                        const inAzione = azione === s.id

                        return (
                            <div key={s.id}
                                className={`border p-3 transition-colors ${completata
                                    ? 'bg-petrolio/20 border-white/5 opacity-60'
                                    : scaduta ? 'bg-red-900/10 border-red-500/20'
                                        : urgente ? 'bg-amber-900/10 border-amber-500/20'
                                            : 'bg-petrolio/40 border-white/5'}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`font-body text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${cfg.classe}`}>
                                                {cfg.label}
                                            </span>
                                            {s.tipo && (
                                                <span className={`font-body text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${tipoCfg ? tipoCfg.cls : 'bg-petrolio border-white/10 text-nebbia/50'}`}>
                                                    {tipoCfg ? tipoCfg.label : s.tipo}
                                                </span>
                                            )}
                                        </div>
                                        <p className={`font-body text-sm font-medium mt-1.5 ${completata ? 'text-nebbia/50 line-through' : 'text-nebbia'}`}>
                                            {s.titolo}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                                <Calendar size={10} /> {fmtData(s.data_scadenza)}
                                            </span>
                                            {!completata && gg !== null && (
                                                <span className={`font-body text-xs flex items-center gap-1 ${scaduta ? 'text-red-400' : urgente ? 'text-amber-400' : 'text-nebbia/40'}`}>
                                                    {scaduta
                                                        ? <><AlertTriangle size={10} /> scaduta da {Math.abs(gg)} gg</>
                                                        : gg === 0
                                                            ? <><Clock size={10} /> oggi</>
                                                            : <><Clock size={10} /> tra {gg} gg</>}
                                                </span>
                                            )}
                                            {completata && s.data_completamento && (
                                                <span className="font-body text-xs text-oro/60 flex items-center gap-1">
                                                    <Check size={10} /> completata il {fmtData(s.data_completamento)}
                                                </span>
                                            )}
                                        </div>
                                        {s.note && <p className="font-body text-xs text-nebbia/40 mt-1.5 whitespace-pre-wrap">{s.note}</p>}
                                    </div>

                                    {/* Azioni */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        {inAzione ? (
                                            <Loader2 size={13} className="animate-spin text-oro" />
                                        ) : (
                                            <>
                                                {completata ? (
                                                    <button onClick={() => riapri(s)} title="Riapri"
                                                        className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-salvia transition-colors">
                                                        <RotateCcw size={13} />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => completa(s)} title="Segna completata"
                                                        className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-oro transition-colors">
                                                        <Check size={14} />
                                                    </button>
                                                )}
                                                <button onClick={() => elimina(s)} title="Elimina"
                                                    className="w-7 h-7 flex items-center justify-center text-nebbia/25 hover:text-red-400 transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal nuova scadenza */}
            {mostraModal && (
                <NuovaScadenzaMandato
                    mandatoId={mandatoId}
                    clienteId={clienteId}
                    studioId={studioId}
                    onClose={() => setMostraModal(false)}
                    onSaved={() => { setMostraModal(false); carica() }}
                />
            )}
        </div>
    )
}
