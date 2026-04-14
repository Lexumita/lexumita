// src/pages/admin/NormativaDettaglio.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageHeader, BackButton, Badge } from '@/components/shared'
import { Search, Plus, Edit2, Trash2, AlertCircle, X, RefreshCw } from 'lucide-react'

export default function AdminNormativaDettaglio() {
    const { codice } = useParams()
    const navigate = useNavigate()

    const [norme, setNorme] = useState([])
    const [loading, setLoading] = useState(true)
    const [cerca, setCerca] = useState('')
    const [totale, setTotale] = useState(0)
    const [label, setLabel] = useState('')
    const [pagina, setPagina] = useState(0)
    const PER_PAGINA = 100

    const [mostraForm, setMostraForm] = useState(false)
    const [formData, setFormData] = useState({ articolo: '', rubrica: '', testo: '' })
    const [formErr, setFormErr] = useState(null)
    const [salvando, setSalvando] = useState(false)
    const [editId, setEditId] = useState(null)

    useEffect(() => { caricaLabel() }, [codice])
    useEffect(() => { caricaNorme() }, [codice, cerca, pagina])

    async function caricaLabel() {
        const { data } = await supabase
            .from('codici_norme').select('label').eq('codice', codice).single()
        setLabel(data?.label ?? codice)
    }

    async function caricaNorme() {
        setLoading(true)
        try {
            const { count } = await supabase
                .from('norme').select('*', { count: 'exact', head: true })
                .eq('codice', codice)
                .ilike('articolo', cerca ? `%${cerca}%` : '%')
            setTotale(count ?? 0)

            let q = supabase
                .from('norme')
                .select('id, articolo, rubrica, testo, aggiornato_al, embedding')
                .eq('codice', codice)
                .order('articolo')
                .range(pagina * PER_PAGINA, (pagina + 1) * PER_PAGINA - 1)

            if (cerca.trim()) q = q.ilike('articolo', `%${cerca}%`)

            const { data } = await q
            setNorme(data ?? [])
        } finally {
            setLoading(false)
        }
    }

    async function salvaArticolo() {
        setFormErr(null)
        if (!formData.articolo.trim()) return setFormErr('Articolo obbligatorio')
        if (!formData.testo.trim()) return setFormErr('Testo obbligatorio')
        setSalvando(true)
        try {
            if (editId) {
                await supabase.from('norme').update({ ...formData, codice }).eq('id', editId)
            } else {
                await supabase.from('norme').insert({ ...formData, codice })
            }
            setMostraForm(false)
            setFormData({ articolo: '', rubrica: '', testo: '' })
            setEditId(null)
            caricaNorme()
        } catch (e) {
            setFormErr(e.message)
        } finally {
            setSalvando(false)
        }
    }

    function apriModifica(norma) {
        setFormData({ articolo: norma.articolo, rubrica: norma.rubrica ?? '', testo: norma.testo ?? '' })
        setEditId(norma.id)
        setMostraForm(true)
    }

    async function eliminaNorma(id) {
        if (!confirm('Eliminare questo articolo?')) return
        await supabase.from('norme').delete().eq('id', id)
        caricaNorme()
    }

    const pagine = Math.ceil(totale / PER_PAGINA)

    return (
        <div className="space-y-5">
            <BackButton to="/admin/normativa" label="Tutti i codici" />

            <PageHeader
                label="Admin — Normativa"
                title={label}
                subtitle={`${totale.toLocaleString()} articoli`}
            />

            {/* Filtri + azioni */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-44">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input
                        placeholder="Cerca per numero articolo..."
                        value={cerca}
                        onChange={e => { setCerca(e.target.value); setPagina(0) }}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />
                </div>
                <button
                    onClick={() => { setMostraForm(true); setEditId(null); setFormData({ articolo: '', rubrica: '', testo: '' }); setFormErr(null) }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors"
                >
                    <Plus size={13} /> Aggiungi articolo
                </button>
                <button onClick={caricaNorme} className="px-4 py-2.5 bg-slate border border-white/10 text-nebbia/40 hover:text-nebbia transition-colors">
                    <RefreshCw size={13} />
                </button>
            </div>

            {/* Form */}
            {mostraForm && (
                <div className="bg-slate border border-oro/20 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="section-label">{editId ? 'Modifica articolo' : 'Nuovo articolo'}</p>
                        <button onClick={() => { setMostraForm(false); setEditId(null) }} className="text-nebbia/30 hover:text-nebbia transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Articolo</label>
                            <input
                                placeholder="es. Art. 2118"
                                value={formData.articolo}
                                onChange={e => setFormData(p => ({ ...p, articolo: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                            />
                        </div>
                        <div>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Rubrica</label>
                            <input
                                placeholder="es. Recesso dal contratto..."
                                value={formData.rubrica}
                                onChange={e => setFormData(p => ({ ...p, rubrica: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Testo</label>
                        <textarea
                            rows={8}
                            value={formData.testo}
                            onChange={e => setFormData(p => ({ ...p, testo: e.target.value }))}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 resize-none"
                        />
                    </div>
                    {formErr && (
                        <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                            <AlertCircle size={11} />{formErr}
                        </p>
                    )}
                    <div className="flex gap-3">
                        <button onClick={salvaArticolo} disabled={salvando}
                            className="flex items-center gap-2 px-5 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40">
                            {salvando
                                ? <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
                                : editId ? 'Salva modifiche' : 'Aggiungi'
                            }
                        </button>
                        <button onClick={() => { setMostraForm(false); setEditId(null) }}
                            className="px-5 py-2.5 bg-slate border border-white/10 text-nebbia/50 font-body text-sm hover:text-nebbia transition-colors">
                            Annulla
                        </button>
                    </div>
                </div>
            )}

            {/* Tabella */}
            <div className="bg-slate border border-white/5 overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Articolo</th>
                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Rubrica</th>
                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">AI</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="px-4 py-20 text-center">
                                <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" />
                            </td></tr>
                        ) : norme.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-20 text-center">
                                <p className="font-body text-sm text-nebbia/30">Nessun articolo trovato</p>
                            </td></tr>
                        ) : norme.map(n => (
                            <tr key={n.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                <td className="px-4 py-3 font-body text-sm text-oro font-medium">{n.articolo}</td>
                                <td className="px-4 py-3 font-body text-sm text-nebbia/50 max-w-sm truncate">{n.rubrica ?? '—'}</td>
                                <td className="px-4 py-3">
                                    <Badge
                                        label={n.embedding ? '✓ OK' : '— Mancante'}
                                        variant={n.embedding ? 'salvia' : 'red'}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => apriModifica(n)} className="text-nebbia/30 hover:text-oro transition-colors">
                                            <Edit2 size={13} />
                                        </button>
                                        <button onClick={() => eliminaNorma(n.id)} className="text-nebbia/30 hover:text-red-400 transition-colors">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Paginazione */}
                {pagine > 1 && (
                    <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                        <p className="font-body text-xs text-nebbia/30">
                            {pagina * PER_PAGINA + 1}–{Math.min((pagina + 1) * PER_PAGINA, totale)} di {totale.toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagina(p => Math.max(0, p - 1))}
                                disabled={pagina === 0}
                                className="px-3 py-1.5 bg-slate border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30"
                            >
                                ← Prev
                            </button>
                            <button
                                onClick={() => setPagina(p => Math.min(pagine - 1, p + 1))}
                                disabled={pagina >= pagine - 1}
                                className="px-3 py-1.5 bg-slate border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}