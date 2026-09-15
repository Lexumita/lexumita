// src/components/fisco/TabFiscoCliente.jsx
//
// Tab "Fisco" della scheda cliente: i documenti fiscali di questo cliente,
// il caricamento già intestato a lui e la sua delega al cassetto fiscale.

import { useCallback, useEffect, useState } from 'react'
import { Landmark, Loader2 } from 'lucide-react'
import { EmptyState } from '@/components/shared'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import CaricaFiscale from '@/components/fisco/CaricaFiscale'
import DocumentoFiscale from '@/components/fisco/DocumentoFiscale'
import DelegheFiscali from '@/components/fisco/DelegheFiscali'
import { conStatoVisibile, nomeDaProfilo } from '@/lib/fisco'

export default function TabFiscoCliente({ clienteId }) {
    const { profile } = useAuth()
    const [documenti, setDocumenti] = useState([])
    const [tipi, setTipi] = useState([])
    const [clienti, setClienti] = useState([])
    const [loading, setLoading] = useState(true)
    const [appena, setAppena] = useState([])

    const carica = useCallback(async () => {
        const { data } = await supabase
            .from('v_documenti_fiscali')
            .select('*')
            .eq('cliente_id', clienteId)
            .order('created_at', { ascending: false })
        setDocumenti(data ?? [])
    }, [clienteId])

    const ricaricaUno = useCallback(async id => {
        const { data } = await supabase.from('v_documenti_fiscali').select('*').eq('id', id).maybeSingle()
        setDocumenti(prev => {
            // passato a un altro cliente: qui non va più mostrato
            if (!data || (data.cliente_id && data.cliente_id !== clienteId)) return prev.filter(d => d.id !== id)
            return prev.some(d => d.id === id) ? prev.map(d => (d.id === id ? data : d)) : [data, ...prev]
        })
    }, [clienteId])

    useEffect(() => {
        Promise.all([
            carica(),
            supabase.from('fisco_tipi_documento')
                .select('codice, label, azione, ammette_adesione')
                .eq('attivo', true)
                .order('ordine')
                .then(({ data }) => setTipi(data ?? [])),
            supabase.from('profiles')
                .select('id, nome, cognome, ragione_sociale, cf, partita_iva')
                .eq('role', 'cliente')
                .then(({ data }) => setClienti((data ?? []).sort((a, b) => nomeDaProfilo(a).localeCompare(nomeDaProfilo(b), 'it')))),
        ]).then(() => setLoading(false))
    }, [carica])

    const letturaInCorso = documenti.some(d => d.stato === 'in_analisi')
    useEffect(() => {
        if (!letturaInCorso) return
        const giro = setInterval(carica, 4000)
        const basta = setTimeout(() => clearInterval(giro), 5 * 60 * 1000)
        return () => {
            clearInterval(giro)
            clearTimeout(basta)
        }
    }, [letturaInCorso, carica])

    async function caricato(id) {
        setAppena(a => [...a, id])
        await ricaricaUno(id)
    }

    return (
        <div className="space-y-6">
            <CaricaFiscale clienteId={clienteId} compatto onCaricato={caricato} onLetto={ricaricaUno} />

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 size={20} className="animate-spin text-oro" />
                </div>
            ) : documenti.length === 0 ? (
                <EmptyState
                    icon={Landmark}
                    title="Nessun documento fiscale"
                    desc="Avvisi, cartelle e atti di questo cliente compariranno qui, con le scadenze già calcolate."
                />
            ) : (
                <div className="space-y-2">
                    {documenti.map(d => (
                        <DocumentoFiscale
                            key={d.id}
                            doc={conStatoVisibile(d)}
                            tipi={tipi}
                            clienti={clienti}
                            meId={profile?.id}
                            apertoIniziale={appena.includes(d.id)}
                            onCambiato={ricaricaUno}
                            onEliminato={id => setDocumenti(prev => prev.filter(x => x.id !== id))}
                        />
                    ))}
                </div>
            )}

            <div className="pt-2">
                <p className="section-label mb-4">Delega al cassetto fiscale</p>
                <DelegheFiscali clienteId={clienteId} meId={profile?.id} />
            </div>
        </div>
    )
}
