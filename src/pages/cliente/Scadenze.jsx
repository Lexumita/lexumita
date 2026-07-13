// src/pages/cliente/Scadenze.jsx
//
// Portale cliente (studio commercialista): scadenze fiscali del cliente in sola
// lettura. Il cliente vede le proprie scadenze via RLS
// (scadenze_mandato.cliente_id = auth.uid()). Stato "scaduta"/"urgente" è
// calcolato lato client rispetto a oggi (stessa logica di BoxScadenzeMandato).

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared'
import { CalendarClock, AlertTriangle, Check, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TIPI_SCADENZA } from '@/lib/scadenzarioFiscale'

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

const FILTRI = [
    { key: 'aperte', label: 'Da fare' },
    { key: 'completate', label: 'Completate' },
    { key: 'tutte', label: 'Tutte' },
]

export default function ClienteScadenze() {
    const [scadenze, setScadenze] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtro, setFiltro] = useState('aperte')

    useEffect(() => {
        async function carica() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('scadenze_mandato')
                .select('id, titolo, tipo, data_scadenza, stato, note, mandato:mandato_id(titolo)')
                .eq('cliente_id', user.id)
                .order('data_scadenza', { ascending: true })
            setScadenze(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    const rows = scadenze.filter(s => {
        if (filtro === 'aperte') return s.stato !== 'completata'
        if (filtro === 'completate') return s.stato === 'completata'
        return true
    })

    const nAperte = scadenze.filter(s => s.stato !== 'completata').length
    const nScadute = scadenze.filter(s => {
        const gg = giorniAllaScadenza(s.data_scadenza)
        return s.stato !== 'completata' && gg !== null && gg < 0
    }).length

    return (
        <div className="space-y-5">
            <PageHeader label="Portale cliente" title="Le mie scadenze fiscali" />

            {/* Riepilogo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate border border-white/5 p-4">
                    <CalendarClock size={16} className="text-salvia mb-2" strokeWidth={1.5} />
                    <p className="font-display text-3xl font-semibold text-salvia mb-1">{nAperte}</p>
                    <p className="font-body text-xs text-nebbia/40">Da completare</p>
                </div>
                <div className="bg-slate border border-white/5 p-4">
                    <AlertTriangle size={16} className={`${nScadute > 0 ? 'text-red-400' : 'text-nebbia/30'} mb-2`} strokeWidth={1.5} />
                    <p className={`font-display text-3xl font-semibold ${nScadute > 0 ? 'text-red-400' : 'text-nebbia/30'} mb-1`}>{nScadute}</p>
                    <p className="font-body text-xs text-nebbia/40">Scadute</p>
                </div>
            </div>

            {/* Filtri */}
            <div className="flex gap-2">
                {FILTRI.map(({ key, label }) => (
                    <button key={key} onClick={() => setFiltro(key)}
                        className={`font-body text-sm px-4 py-2 border transition-colors ${filtro === key
                            ? 'bg-oro/10 border-oro/40 text-oro'
                            : 'bg-slate border-white/10 text-nebbia/50 hover:text-nebbia'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : rows.length === 0 ? (
                <div className="py-12 text-center">
                    <CalendarClock size={36} className="text-nebbia/15 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/30">Nessuna scadenza</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {rows.map(s => {
                        const gg = giorniAllaScadenza(s.data_scadenza)
                        const completata = s.stato === 'completata'
                        const urgente = !completata && gg !== null && gg >= 0 && gg <= 7
                        const scaduta = !completata && gg !== null && gg < 0
                        const tipoCfg = s.tipo ? TIPI_SCADENZA?.[s.tipo] : null
                        return (
                            <div key={s.id}
                                className={`border p-4 ${completata ? 'bg-slate border-white/5'
                                    : scaduta ? 'bg-red-900/10 border-red-500/20'
                                        : urgente ? 'bg-amber-900/10 border-amber-500/20'
                                            : 'bg-slate border-white/5'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {s.tipo && (
                                                <span className={`font-body text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${tipoCfg ? tipoCfg.cls : 'bg-petrolio border-white/10 text-nebbia/50'}`}>
                                                    {tipoCfg ? tipoCfg.label : s.tipo}
                                                </span>
                                            )}
                                            {s.mandato?.titolo && (
                                                <span className="font-body text-[11px] text-nebbia/35">{s.mandato.titolo}</span>
                                            )}
                                        </div>
                                        <p className={`font-body text-sm font-medium mt-1.5 ${completata ? 'text-nebbia/50 line-through' : 'text-nebbia'}`}>
                                            {s.titolo}
                                        </p>
                                        {s.note && <p className="font-body text-xs text-nebbia/40 mt-1">{s.note}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-body text-sm text-nebbia">{fmtData(s.data_scadenza)}</p>
                                        {completata ? (
                                            <span className="font-body text-xs text-oro flex items-center gap-1 justify-end mt-1">
                                                <Check size={12} /> Completata
                                            </span>
                                        ) : gg !== null && (
                                            <span className={`font-body text-xs flex items-center gap-1 justify-end mt-1 ${scaduta ? 'text-red-400' : urgente ? 'text-amber-400' : 'text-nebbia/40'}`}>
                                                <Clock size={11} />
                                                {scaduta ? `Scaduta da ${Math.abs(gg)} gg` : gg === 0 ? 'Oggi' : `Tra ${gg} gg`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
