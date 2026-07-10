// src/pages/commercialista/BancoLavoro.jsx
//
// Lista di TUTTI i mandati del commercialista (analoga ad AvvocatoPratiche).
// Filtri: ricerca titolo/cliente, stato, cliente. Ogni riga → /banco-lavoro/:id.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/shared'
import { Plus, Search, AlertCircle, Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import NuovoMandato from '@/components/commercialista/NuovoMandato'

// Classi + label per stato mandato
const STATI = {
    attivo: { label: 'Attivo', cls: 'bg-salvia/10 border-salvia/30 text-salvia' },
    sospeso: { label: 'Sospeso', cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
    concluso: { label: 'Concluso', cls: 'bg-oro/10 border-oro/30 text-oro' },
    archiviato: { label: 'Archiviato', cls: 'bg-white/5 border-white/15 text-nebbia/40' },
}

function nomeCliente(c) {
    if (!c) return '—'
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

export default function BancoLavoro() {
    const [search, setSearch] = useState('')
    const [statoF, setStatoF] = useState('')
    const [clienteF, setClienteF] = useState('')
    const [mandati, setMandati] = useState([])
    const [clienti, setClienti] = useState([])
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')
    const [mostraNuovo, setMostraNuovo] = useState(false)

    async function carica() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data, error } = await supabase
            .from('mandati')
            .select('id, titolo, tipo, stato, anno_riferimento, created_at, cliente:cliente_id(id, nome, cognome, ragione_sociale, tipo_soggetto)')
            .order('updated_at', { ascending: false })

        if (error) setErrore('Errore nel caricamento dei mandati.')
        else setMandati(data ?? [])

        // Clienti dello studio per il filtro (RLS limita già al proprio studio)
        const { data: cl } = await supabase
            .from('profiles')
            .select('id, nome, cognome, ragione_sociale, tipo_soggetto')
            .eq('role', 'cliente')
            .order('cognome')
        setClienti(cl ?? [])

        setLoading(false)
    }

    useEffect(() => { carica() }, [])

    const rows = mandati.filter(m => {
        if (statoF && m.stato !== statoF) return false
        if (clienteF && m.cliente?.id !== clienteF) return false
        if (search) {
            const q = search.toLowerCase()
            return (m.titolo ?? '').toLowerCase().includes(q) ||
                nomeCliente(m.cliente).toLowerCase().includes(q)
        }
        return true
    })

    const hasFilters = search || statoF || clienteF

    return (
        <div className="space-y-5">
            <PageHeader label="Banco di lavoro" title="Mandati"
                action={
                    <button onClick={() => setMostraNuovo(true)} className="btn-primary text-sm">
                        <Plus size={15} /> Nuovo mandato
                    </button>
                } />

            {/* Barra filtri */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input
                        placeholder="Cerca per titolo o cliente..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />
                </div>

                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">Tutti gli stati</option>
                    {Object.entries(STATI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>

                <select value={clienteF} onChange={e => setClienteF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 max-w-56">
                    <option value="">Tutti i clienti</option>
                    {clienti.map(c => <option key={c.id} value={c.id}>{nomeCliente(c)}</option>)}
                </select>

                {hasFilters && (
                    <button onClick={() => { setSearch(''); setStatoF(''); setClienteF('') }}
                        className="font-body text-xs text-nebbia/30 hover:text-red-400 px-3 py-2.5 border border-white/5 hover:border-red-500/30 transition-colors">
                        Azzera
                    </button>
                )}
            </div>

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : errore ? (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-4 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            ) : mandati.length === 0 ? (
                <div className="bg-slate border border-white/5 p-12 flex flex-col items-center text-center gap-3">
                    <Briefcase size={28} className="text-nebbia/20" />
                    <p className="font-body text-sm text-nebbia/40">Nessun mandato ancora</p>
                    <p className="font-body text-xs text-nebbia/25">Crea il primo mandato per organizzare lavoro e scadenze di un cliente.</p>
                    <button onClick={() => setMostraNuovo(true)} className="btn-primary text-sm mt-2">
                        <Plus size={15} /> Nuovo mandato
                    </button>
                </div>
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Mandato', 'Cliente', 'Tipo', 'Anno', 'Stato', 'Creato', ''].map((h, i) => (
                                    <th key={i} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">Nessun mandato con questi filtri</td></tr>
                            ) : rows.map(m => {
                                const st = STATI[m.stato] ?? STATI.attivo
                                return (
                                    <tr key={m.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                        <td className="px-4 py-3 font-body text-sm font-medium text-nebbia max-w-xs truncate">{m.titolo}</td>
                                        <td className="px-4 py-3 font-body text-sm text-nebbia/60">{nomeCliente(m.cliente)}</td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/40">{m.tipo ?? '—'}</td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/50">{m.anno_riferimento ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`font-body text-[10px] px-2 py-0.5 border uppercase tracking-wider ${st.cls}`}>
                                                {st.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">
                                            {new Date(m.created_at).toLocaleDateString('it-IT')}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link to={`/banco-lavoro/${m.id}`} className="font-body text-xs text-oro hover:text-oro/70">Dettaglio</Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal nuovo mandato (senza cliente predeterminato → selettore interno) */}
            {mostraNuovo && (
                <NuovoMandato
                    onClose={() => setMostraNuovo(false)}
                    onSaved={() => { setMostraNuovo(false); carica() }}
                />
            )}
        </div>
    )
}
