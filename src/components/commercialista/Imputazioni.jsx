// src/components/commercialista/Imputazioni.jsx
//
// Partita doppia — imputazioni automatiche. Per ogni categoria di movimento
// (effettivo) definisci conto contropartita + conto cassa/banca + aliquota IVA.
// Con l'imputazione, i nuovi movimenti effettivi generano la scrittura da soli;
// il bottone "Contabilizza" processa quelli già esistenti non ancora a mastro.
//
// Props: clienteId (string), conti (array piano_conti)

import { useState, useEffect } from 'react'
import { Tags, Loader2, Check, AlertCircle, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { contabilizzaMovimento } from '@/lib/generaScrittura'
import { ALIQUOTE_IVA } from '@/lib/pianoContiItaliano'

export default function Imputazioni({ clienteId, conti }) {
    const [categorie, setCategorie] = useState([])
    const [mappings, setMappings] = useState({})       // `${tipo}|${categoria}` -> mapping
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')
    const [salvati, setSalvati] = useState({})
    const [contabilizzando, setContabilizzando] = useState(false)
    const [esito, setEsito] = useState('')

    useEffect(() => { carica() }, [clienteId])

    async function carica() {
        setLoading(true); setErrore('')
        const [{ data: mov }, { data: maps }] = await Promise.all([
            supabase.from('movimenti').select('tipo, categoria').eq('cliente_id', clienteId).eq('stato', 'effettivo').not('categoria', 'is', null),
            supabase.from('mapping_categorie').select('*').eq('cliente_id', clienteId),
        ])
        const set = new Map()
        for (const m of (mov ?? [])) {
            const cat = (m.categoria ?? '').trim(); if (!cat) continue
            set.set(`${m.tipo}|${cat}`, { tipo: m.tipo, categoria: cat })
        }
        const mp = {}
        for (const x of (maps ?? [])) mp[`${x.tipo}|${x.categoria}`] = x
        setCategorie([...set.values()].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.categoria.localeCompare(b.categoria)))
        setMappings(mp)
        setLoading(false)
    }

    const contiRicavo = conti.filter(c => c.classe === 3 && c.attivo)
    const contiCosto = conti.filter(c => c.classe >= 4 && c.classe <= 8 && c.attivo)
    const contiCassa = conti.filter(c => c.classe === 1 && c.attivo)

    const setLocal = (key, campo, val) => setMappings(m => ({ ...m, [key]: { ...(m[key] ?? {}), [campo]: val } }))

    async function salva(tipo, categoria) {
        const key = `${tipo}|${categoria}`
        const m = mappings[key] ?? {}
        if (!m.conto_id || !m.conto_cassa_id) { setErrore(`Scegli conto e contropartita per "${categoria}".`); return }
        setErrore('')
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profilo } = await supabase.from('profiles').select('studio_id').eq('id', user.id).single()
        const { error } = await supabase.from('mapping_categorie').upsert({
            cliente_id: clienteId, tipo, categoria,
            conto_id: m.conto_id, conto_cassa_id: m.conto_cassa_id, aliquota_iva: Number(m.aliquota_iva) || 0,
            avvocato_id: user.id, studio_id: profilo?.studio_id ?? null, creato_da: user.id, aggiornato_da: user.id,
        }, { onConflict: 'cliente_id,tipo,categoria' })
        if (error) { setErrore(error.message); return }
        setSalvati(s => ({ ...s, [key]: true }))
        setTimeout(() => setSalvati(s => ({ ...s, [key]: false })), 1500)
    }

    async function contabilizza() {
        setContabilizzando(true); setEsito(''); setErrore('')
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profilo } = await supabase.from('profiles').select('studio_id').eq('id', user.id).single()
        const [{ data: mov }, { data: regCollegate }, { data: maps }, { data: contiIva }] = await Promise.all([
            supabase.from('movimenti').select('id, cliente_id, mandato_id, data, descrizione, documento_id, tipo, importo, categoria').eq('cliente_id', clienteId).eq('stato', 'effettivo').not('categoria', 'is', null),
            supabase.from('registrazioni').select('movimento_id').eq('cliente_id', clienteId).not('movimento_id', 'is', null),
            supabase.from('mapping_categorie').select('*').eq('cliente_id', clienteId),
            supabase.from('piano_conti').select('id, numero').eq('cliente_id', clienteId).in('numero', ['1170', '2200']),
        ])
        const giaFatte = new Set((regCollegate ?? []).map(r => r.movimento_id))
        const mapByKey = {}; (maps ?? []).forEach(x => { mapByKey[`${x.tipo}|${x.categoria}`] = x })
        const byNum = {}; (contiIva ?? []).forEach(c => { byNum[c.numero] = c })
        let ok = 0, skip = 0
        for (const mv of (mov ?? [])) {
            if (giaFatte.has(mv.id)) continue
            const mapping = mapByKey[`${mv.tipo}|${(mv.categoria ?? '').trim()}`]
            if (!mapping) { skip++; continue }
            const res = await contabilizzaMovimento(supabase, mv, mapping, byNum, user, profilo?.studio_id ?? null)
            if (res.errore) skip++; else ok++
        }
        setContabilizzando(false)
        setEsito(`${ok} movimenti contabilizzati` + (skip ? `, ${skip} saltati (senza imputazione)` : '') + '.')
    }

    const selCls = "w-full bg-petrolio border border-white/10 text-nebbia font-body text-xs px-2 py-1.5 outline-none focus:border-oro/50"

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="font-body text-xs text-nebbia/40">Collega ogni categoria di movimento al conto contabile e all'aliquota IVA: le scritture in partita doppia verranno generate in automatico.</p>
                <button onClick={contabilizza} disabled={contabilizzando}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40">
                    {contabilizzando ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Contabilizza non registrati
                </button>
            </div>

            {esito && <div className="flex items-center gap-2 text-salvia text-xs font-body p-3 bg-salvia/5 border border-salvia/20"><Check size={14} /> {esito}</div>}
            {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-10"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
            ) : categorie.length === 0 ? (
                <div className="bg-petrolio/40 border border-white/5 p-8 text-center">
                    <Tags size={26} className="text-nebbia/15 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/40">Nessuna categoria da imputare</p>
                    <p className="font-body text-xs text-nebbia/25 mt-1">Registra movimenti effettivi con una categoria per iniziare a imputarli.</p>
                </div>
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead><tr className="border-b border-white/5">
                            {['Categoria', 'Conto contropartita', 'Conto cassa/banca', 'IVA', ''].map((h, i) => (
                                <th key={i} className="px-3 py-2 text-left font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {categorie.map(({ tipo, categoria }) => {
                                const key = `${tipo}|${categoria}`
                                const m = mappings[key] ?? {}
                                const contiContro = tipo === 'entrata' ? contiRicavo : contiCosto
                                return (
                                    <tr key={key} className="border-b border-white/5 last:border-0">
                                        <td className="px-3 py-2">
                                            <span className="font-body text-sm text-nebbia">{categoria}</span>
                                            <span className={`ml-2 font-body text-[10px] px-1.5 py-0.5 border ${tipo === 'entrata' ? 'border-salvia/30 text-salvia' : 'border-oro/30 text-oro'}`}>{tipo === 'entrata' ? 'entrata' : 'uscita'}</span>
                                        </td>
                                        <td className="px-3 py-2 w-64">
                                            <select value={m.conto_id ?? ''} onChange={e => setLocal(key, 'conto_id', e.target.value)} className={selCls}>
                                                <option value="">—</option>
                                                {contiContro.map(c => <option key={c.id} value={c.id}>{c.numero} · {c.nome}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2 w-48">
                                            <select value={m.conto_cassa_id ?? ''} onChange={e => setLocal(key, 'conto_cassa_id', e.target.value)} className={selCls}>
                                                <option value="">—</option>
                                                {contiCassa.map(c => <option key={c.id} value={c.id}>{c.numero} · {c.nome}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2 w-24">
                                            <select value={String(m.aliquota_iva ?? 0)} onChange={e => setLocal(key, 'aliquota_iva', e.target.value)} className={selCls}>
                                                {ALIQUOTE_IVA.map(a => <option key={a} value={a}>{a}%</option>)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <button onClick={() => salva(tipo, categoria)}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-white/10 text-nebbia/60 font-body text-xs hover:border-oro/30 hover:text-oro transition-colors">
                                                {salvati[key] ? <><Check size={12} className="text-salvia" /> Salvato</> : 'Salva'}
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
