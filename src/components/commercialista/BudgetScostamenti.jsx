// src/components/commercialista/BudgetScostamenti.jsx
//
// Budget & scostamenti del conto economico. Il "budget" sono i movimenti
// PREVISTI (espansi per ricorrenza nell'anno). Lo scostamento confronta,
// per categoria, l'EFFETTIVO con il PREVISTO. Port diretto da CH (zero
// dipendenze cross-fase), adattato IT (EUR).
//
// Props:
//   clienteId  (string)       - cliente-azienda
//   mandatoId  (string|null)  - movimenti del mandato; altrimenti del cliente
//   anno       (number|null)  - anno iniziale

import { useState, useEffect } from 'react'
import { Target, TrendingUp, TrendingDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtEUR, espandiPrevisto } from '@/lib/cassa'

export default function BudgetScostamenti({ clienteId, mandatoId = null, anno = null, refreshTrigger = 0 }) {
    const annoCorr = new Date().getFullYear()
    const [annoSel, setAnnoSel] = useState(anno ?? annoCorr)
    const [movimenti, setMovimenti] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { carica() }, [clienteId, mandatoId, refreshTrigger])

    async function carica() {
        setLoading(true)
        let q = supabase.from('movimenti').select('*')
        q = mandatoId ? q.eq('mandato_id', mandatoId) : q.eq('cliente_id', clienteId)
        const { data } = await q
        setMovimenti(data ?? [])
        setLoading(false)
    }

    const daExcl = new Date(annoSel - 1, 11, 31)
    const annoEnd = new Date(annoSel, 11, 31)

    // Righe budget per tipo: { categoria, previsto, effettivo, scost }
    function righe(tipo) {
        const map = new Map()
        const get = (cat) => {
            const key = (cat ?? '').trim().toLowerCase() || '—'
            if (!map.has(key)) map.set(key, { categoria: (cat ?? '').trim() || 'Senza categoria', previsto: 0, effettivo: 0 })
            return map.get(key)
        }
        for (const m of movimenti) {
            if (m.tipo !== tipo) continue
            const stato = m.stato ?? 'effettivo'
            if (stato === 'previsto') {
                const tot = espandiPrevisto(m, daExcl, annoEnd).reduce((t, o) => t + o.importo, 0)
                if (tot) get(m.categoria).previsto += tot
            } else if (new Date(m.data).getFullYear() === annoSel) {
                get(m.categoria).effettivo += (Number(m.importo) || 0)
            }
        }
        return [...map.values()]
            .map(r => ({ ...r, scost: r.effettivo - r.previsto }))
            .sort((a, b) => (b.previsto + b.effettivo) - (a.previsto + a.effettivo))
    }

    const righeEntrate = righe('entrata')
    const righeUscite = righe('uscita')
    const haPrevisti = [...righeEntrate, ...righeUscite].some(r => r.previsto > 0)

    // Anni disponibili
    const anniSet = new Set([annoCorr + 1, annoCorr, annoCorr - 1, annoCorr - 2, annoSel])
    if (anno) anniSet.add(anno)
    movimenti.forEach(m => { if (m.data) anniSet.add(new Date(m.data).getFullYear()) })
    const anniDisponibili = [...anniSet].sort((a, b) => b - a)

    return (
        <div className="bg-slate border border-white/5 p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Target size={15} className="text-oro/60" />
                    <h2 className="font-display text-lg text-nebbia">Budget e scostamenti</h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Anno</span>
                    <select value={annoSel} onChange={e => setAnnoSel(Number(e.target.value))}
                        className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-2.5 py-1.5 outline-none focus:border-oro/50">
                        {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : !haPrevisti ? (
                <div className="bg-petrolio/40 border border-white/5 p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                    <Target size={26} className="text-nebbia/15 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/40">Nessun budget per il {annoSel}</p>
                    <p className="font-body text-xs text-nebbia/25 mt-1">
                        Registra movimenti <span className="text-nebbia/40">previsti</span> per confrontarli con l'effettivo.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-5">
                    <SezioneBudget titolo="Entrate" tipo="entrata" righe={righeEntrate} />
                    <SezioneBudget titolo="Uscite" tipo="uscita" righe={righeUscite} />
                </div>
            )}
        </div>
    )
}

function scostClass(tipo, scost) {
    if (scost === 0) return 'text-nebbia/40'
    const buono = tipo === 'entrata' ? scost > 0 : scost < 0
    return buono ? 'text-salvia' : 'text-red-400'
}

function SezioneBudget({ titolo, tipo, righe }) {
    const eEntrata = tipo === 'entrata'
    const totPrev = righe.reduce((t, r) => t + r.previsto, 0)
    const totEff = righe.reduce((t, r) => t + r.effettivo, 0)
    const totScost = totEff - totPrev

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                {eEntrata ? <TrendingUp size={14} className="text-salvia" /> : <TrendingDown size={14} className="text-oro" />}
                <p className="section-label !m-0">{titolo}</p>
            </div>

            {righe.length === 0 ? (
                <div className="bg-petrolio/40 border border-white/5 p-6 text-center font-body text-xs text-nebbia/30">
                    {eEntrata ? 'Nessuna entrata' : 'Nessuna uscita'}
                </div>
            ) : (
                <div className="border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Categoria', 'Previsto', 'Effettivo', 'Scostamento'].map((h, i) => (
                                    <th key={h} className={`px-3 py-2 font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {righe.map((r, i) => {
                                const pct = r.previsto ? Math.round((r.scost / r.previsto) * 100) : null
                                return (
                                    <tr key={i} className="border-b border-white/5 last:border-0">
                                        <td className="px-3 py-2 font-body text-xs text-nebbia/70">{r.categoria}</td>
                                        <td className="px-3 py-2 text-right font-body text-xs text-nebbia/50">{r.previsto ? `€ ${fmtEUR(r.previsto)}` : '—'}</td>
                                        <td className="px-3 py-2 text-right font-body text-xs text-nebbia">{r.effettivo ? `€ ${fmtEUR(r.effettivo)}` : '—'}</td>
                                        <td className={`px-3 py-2 text-right font-body text-xs ${scostClass(tipo, r.scost)}`}>
                                            {r.scost === 0 ? '—' : `${r.scost > 0 ? '+' : '−'}€ ${fmtEUR(Math.abs(r.scost))}`}
                                            {pct !== null && r.scost !== 0 && <span className="text-nebbia/25"> ({pct > 0 ? '+' : ''}{pct}%)</span>}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-white/10 bg-petrolio/40">
                                <td className="px-3 py-2 font-body text-[11px] text-nebbia/50 uppercase tracking-widest">Totale</td>
                                <td className="px-3 py-2 text-right font-display text-sm text-nebbia/70">€ {fmtEUR(totPrev)}</td>
                                <td className="px-3 py-2 text-right font-display text-sm text-nebbia">€ {fmtEUR(totEff)}</td>
                                <td className={`px-3 py-2 text-right font-display text-sm ${scostClass(tipo, totScost)}`}>
                                    {totScost === 0 ? '—' : `${totScost > 0 ? '+' : '−'}€ ${fmtEUR(Math.abs(totScost))}`}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    )
}
