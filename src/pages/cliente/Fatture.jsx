// src/pages/cliente/Fatture.jsx

import { useState, useEffect } from 'react'
import { PageHeader, Badge } from '@/components/shared'
import { CreditCard } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const STATO_CFG = {
    in_attesa: { label: 'Da pagare', variant: 'warning' },
    pagata: { label: 'Pagata', variant: 'salvia' },
    scaduta: { label: 'Scaduta', variant: 'red' },
    annullata: { label: 'Annullata', variant: 'gray' },
}

export default function ClienteFatture() {
    const [fatture, setFatture] = useState([])
    const [loading, setLoading] = useState(true)
    const [statoF, setStatoF] = useState('')

    useEffect(() => {
        async function carica() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('fatture')
                .select('id, numero, descrizione, importo, stato, data_emissione, data_scadenza, data_pagamento, pratica:pratica_id(titolo)')
                .eq('cliente_id', user.id)
                .order('data_emissione', { ascending: false })
            setFatture(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    const rows = fatture.filter(f => !statoF || f.stato === statoF)
    const totaleAperto = fatture.filter(f => f.stato === 'in_attesa').reduce((a, f) => a + parseFloat(f.importo ?? 0), 0)

    return (
        <div className="space-y-5">
            <PageHeader label="Portale cliente" title="Fatture" />

            {totaleAperto > 0 && (
                <div className="bg-amber-900/10 border border-amber-500/20 p-4 flex items-center gap-3">
                    <CreditCard size={16} className="text-amber-400 shrink-0" />
                    <div>
                        <p className="font-body text-sm font-medium text-amber-400">
                            Totale da pagare: € {totaleAperto.toFixed(2)}
                        </p>
                        <p className="font-body text-xs text-amber-400/60 mt-0.5">
                            Contatta il tuo avvocato per le modalità di pagamento.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex gap-3">
                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">Tutte</option>
                    <option value="in_attesa">Da pagare</option>
                    <option value="pagata">Pagate</option>
                    <option value="scaduta">Scadute</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    {rows.length === 0 ? (
                        <div className="py-12 text-center">
                            <CreditCard size={36} className="text-nebbia/15 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/30">Nessuna fattura trovata</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {['Numero', 'Descrizione', 'Importo', 'Emissione', 'Scadenza', 'Stato'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(f => {
                                    const st = STATO_CFG[f.stato] ?? STATO_CFG.in_attesa
                                    return (
                                        <tr key={f.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                            <td className="px-4 py-3 font-body text-xs text-nebbia/50">{f.numero ?? '—'}</td>
                                            <td className="px-4 py-3 font-body text-sm text-nebbia max-w-xs truncate">
                                                {f.pratica?.titolo ?? f.descrizione ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 font-display text-sm font-semibold text-oro">
                                                € {parseFloat(f.importo).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">
                                                {f.data_emissione ? new Date(f.data_emissione).toLocaleDateString('it-IT') : '—'}
                                            </td>
                                            <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">
                                                {f.data_scadenza ? new Date(f.data_scadenza).toLocaleDateString('it-IT') : '—'}
                                            </td>
                                            <td className="px-4 py-3"><Badge label={st.label} variant={st.variant} /></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    )
}