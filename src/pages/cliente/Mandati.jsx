// src/pages/cliente/Mandati.jsx
//
// Portale cliente (studio commercialista): elenco read-only dei mandati del
// cliente. Speculare a Pratiche.jsx (studio legale). Il cliente legge solo i
// propri mandati via RLS (mandati.cliente_id = auth.uid()).

import { useState, useEffect } from 'react'
import { PageHeader, Badge } from '@/components/shared'
import { Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const STATO_CFG = {
    attivo: { label: 'Attivo', variant: 'salvia' },
    sospeso: { label: 'Sospeso', variant: 'warning' },
    concluso: { label: 'Concluso', variant: 'gray' },
    archiviato: { label: 'Archiviato', variant: 'gray' },
}

export default function ClienteMandati() {
    const [mandati, setMandati] = useState([])
    const [loading, setLoading] = useState(true)
    const [statoF, setStatoF] = useState('')

    useEffect(() => {
        async function carica() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('mandati')
                .select('id, titolo, tipo, stato, anno_riferimento, note, created_at, professionista:avvocato_id(nome, cognome)')
                .eq('cliente_id', user.id)
                .order('created_at', { ascending: false })
            setMandati(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    const rows = mandati.filter(m => !statoF || m.stato === statoF)

    return (
        <div className="space-y-5">
            <PageHeader label="Portale cliente" title="I miei mandati" />

            <div className="flex gap-3">
                <select value={statoF} onChange={e => setStatoF(e.target.value)}
                    className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    <option value="">Tutti gli stati</option>
                    <option value="attivo">Attivo</option>
                    <option value="sospeso">Sospeso</option>
                    <option value="concluso">Concluso</option>
                    <option value="archiviato">Archiviato</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="space-y-4">
                    {rows.length === 0 ? (
                        <div className="py-12 text-center">
                            <Briefcase size={36} className="text-nebbia/15 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/30">Nessun mandato trovato</p>
                        </div>
                    ) : rows.map(m => {
                        const st = STATO_CFG[m.stato] ?? STATO_CFG.attivo
                        return (
                            <div key={m.id} className="bg-slate border border-white/5 p-5 space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-display text-xl font-semibold text-nebbia">{m.titolo}</h3>
                                        <p className="font-body text-xs text-nebbia/40 mt-1">
                                            {m.tipo ?? '—'}
                                            {m.professionista ? ` · Dott. ${m.professionista.nome} ${m.professionista.cognome}` : ''}
                                        </p>
                                    </div>
                                    <Badge label={st.label} variant={st.variant} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-petrolio/40 border border-white/5 p-3">
                                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Anno di riferimento</p>
                                        <p className="font-body text-sm text-nebbia">{m.anno_riferimento ?? '—'}</p>
                                    </div>
                                    <div className="bg-petrolio/40 border border-white/5 p-3">
                                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Aperto il</p>
                                        <p className="font-body text-sm text-nebbia">{new Date(m.created_at).toLocaleDateString('it-IT')}</p>
                                    </div>
                                </div>

                                {m.note && (
                                    <div className="border-t border-white/5 pt-3">
                                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Note</p>
                                        <p className="font-body text-sm text-nebbia/60">{m.note}</p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
