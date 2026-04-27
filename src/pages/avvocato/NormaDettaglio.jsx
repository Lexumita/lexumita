// src/pages/avvocato/NormaDettaglio.jsx
// Pagina dettaglio norma — funziona per norme, norme_archivio, norme_ue
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import { ChevronLeft, BookOpen, Globe, Archive, AlertCircle, ExternalLink } from 'lucide-react'

export function NormaDettaglio() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { profile } = useAuth()

    const [norma, setNorma] = useState(null)
    const [tipoFonte, setTipoFonte] = useState(null) // 'norme' | 'archivio' | 'ue'
    const [codiceLabel, setCodiceLabel] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState(null)

    useEffect(() => {
        carica()
    }, [id])

    async function carica() {
        setLoading(true)
        setErrore(null)
        try {
            // 1. Prova in `norme` (corpus curato)
            const { data: dataNorme } = await supabase
                .from('norme')
                .select('*')
                .eq('id', id)
                .maybeSingle()

            if (dataNorme) {
                setNorma(dataNorme)
                setTipoFonte('norme')
                // Recupera label codice
                const { data: cd } = await supabase
                    .from('codici_norme')
                    .select('label')
                    .eq('codice', dataNorme.codice)
                    .maybeSingle()
                if (cd) setCodiceLabel(cd.label)
                setLoading(false)
                return
            }

            // 2. Prova in `norme_archivio`
            const { data: dataArchivio } = await supabase
                .from('norme_archivio')
                .select('*')
                .eq('id', id)
                .maybeSingle()

            if (dataArchivio) {
                setNorma(dataArchivio)
                setTipoFonte('archivio')
                setLoading(false)
                return
            }

            // 3. Prova in `norme_ue`
            const { data: dataUe } = await supabase
                .from('norme_ue')
                .select('*')
                .eq('id', id)
                .maybeSingle()

            if (dataUe) {
                setNorma(dataUe)
                setTipoFonte('ue')
                setLoading(false)
                return
            }

            // Nessuna trovata
            setErrore('Norma non trovata')
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
        }
    }

    function tornaIndietro() {
        if (window.history.length > 1) navigate(-1)
        else navigate('/banca-dati')
    }

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            </div>
        )
    }

    if (errore || !norma) {
        return (
            <div className="p-6 space-y-5">
                <button
                    onClick={tornaIndietro}
                    className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors"
                >
                    <ChevronLeft size={13} /> Indietro
                </button>
                <div className="bg-slate border border-red-400/20 p-12 text-center">
                    <AlertCircle size={32} className="text-red-400/50 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/60">{errore ?? 'Norma non trovata'}</p>
                    <p className="font-body text-xs text-nebbia/30 mt-2">ID: {id}</p>
                </div>
            </div>
        )
    }

    // Etichette / icone per tipo fonte
    const fonteConfig = {
        'norme': {
            icon: BookOpen,
            label: 'Codice italiano',
            color: 'text-oro',
            badgeBorder: 'border-oro/30',
            badgeBg: 'bg-oro/5',
        },
        'archivio': {
            icon: Archive,
            label: 'Archivio normativo',
            color: 'text-salvia',
            badgeBorder: 'border-salvia/30',
            badgeBg: 'bg-salvia/5',
        },
        'ue': {
            icon: Globe,
            label: 'Normativa UE',
            color: 'text-nebbia',
            badgeBorder: 'border-white/30',
            badgeBg: 'bg-white/5',
        },
    }
    const cfg = fonteConfig[tipoFonte]
    const FonteIcon = cfg.icon

    // Costruisci riferimento di intestazione
    let riferimento = ''
    if (tipoFonte === 'norme') {
        riferimento = `${norma.articolo}${codiceLabel ? ` — ${codiceLabel}` : ''}`
    } else if (tipoFonte === 'archivio') {
        const meta = [norma.tipo_atto, norma.numero_atto && norma.anno_atto ? `${norma.numero_atto}/${norma.anno_atto}` : null].filter(Boolean).join(' ')
        riferimento = `${norma.articolo}${meta ? ` — ${meta}` : ''}`
    } else if (tipoFonte === 'ue') {
        const meta = [norma.tipo_atto, norma.numero_atto && norma.anno_atto ? `${norma.numero_atto}/${norma.anno_atto}` : null].filter(Boolean).join(' ')
        riferimento = `${norma.articolo}${meta ? ` — ${meta}` : ''}`
    }

    const isAvvocato = profile?.role === 'avvocato'

    return (
        <div className="p-6 space-y-5 max-w-4xl">
            {/* Breadcrumb / back */}
            <button
                onClick={tornaIndietro}
                className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors"
            >
                <ChevronLeft size={13} /> Torna alla banca dati
            </button>

            {/* Header */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 font-body text-xs px-2.5 py-1 border ${cfg.badgeBorder} ${cfg.badgeBg} ${cfg.color}`}>
                        <FonteIcon size={11} />
                        {cfg.label}
                    </span>
                    {norma.vigente === false && (
                        <span className="font-body text-xs text-red-400/70 border border-red-400/30 bg-red-400/5 px-2 py-1">
                            Non vigente
                        </span>
                    )}
                    {norma.tipo_elemento && norma.tipo_elemento !== 'articolo' && (
                        <span className="font-body text-xs text-nebbia/50 border border-white/10 px-2 py-1 uppercase tracking-wider">
                            {norma.tipo_elemento}
                        </span>
                    )}
                </div>

                <h1 className="font-display text-3xl text-nebbia">{riferimento}</h1>

                {norma.rubrica && (
                    <p className="font-display text-lg text-nebbia/70 italic">{norma.rubrica}</p>
                )}

                {/* Riferimenti aggiuntivi per archivio/UE */}
                {tipoFonte === 'archivio' && norma.titolo_doc && (
                    <p className="font-body text-sm text-nebbia/50">{norma.titolo_doc}</p>
                )}
                {tipoFonte === 'ue' && (
                    <div className="font-body text-sm text-nebbia/50 space-y-0.5">
                        {norma.titolo_doc && <p>{norma.titolo_doc}</p>}
                        {norma.titolo_breve && <p className="text-nebbia/40">{norma.titolo_breve}</p>}
                        {norma.celex && (
                            <p className="font-mono text-xs text-nebbia/40 mt-2">CELEX: {norma.celex}</p>
                        )}
                    </div>
                )}
                {tipoFonte === 'norme' && norma.libro && (
                    <p className="font-body text-xs text-nebbia/40">
                        {norma.libro}
                        {norma.titolo && ` › ${norma.titolo}`}
                        {norma.capo && ` › ${norma.capo}`}
                    </p>
                )}
            </div>

            {/* Testo principale */}
            <div className="bg-slate border border-white/5 p-6">
                {norma.testo ? (
                    <div className="font-body text-base text-nebbia/80 leading-relaxed whitespace-pre-line">
                        {norma.testo}
                    </div>
                ) : (
                    <p className="font-body text-sm text-nebbia/30 italic">Testo non disponibile.</p>
                )}
            </div>

            {/* Metadati aggiuntivi */}
            {(norma.data_vigenza || norma.data_pubblicazione || norma.urn) && (
                <div className="bg-slate border border-white/5 p-4 space-y-2">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Riferimenti</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-body">
                        {norma.data_vigenza && (
                            <div>
                                <span className="text-nebbia/40">Data vigenza:</span>
                                <span className="text-nebbia/70 ml-2">{new Date(norma.data_vigenza).toLocaleDateString('it-IT')}</span>
                            </div>
                        )}
                        {norma.data_pubblicazione && (
                            <div>
                                <span className="text-nebbia/40">Data pubblicazione:</span>
                                <span className="text-nebbia/70 ml-2">{new Date(norma.data_pubblicazione).toLocaleDateString('it-IT')}</span>
                            </div>
                        )}
                        {norma.urn && (
                            <div className="md:col-span-3">
                                <span className="text-nebbia/40">URN:</span>
                                <span className="text-nebbia/70 ml-2 font-mono break-all">{norma.urn}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Azioni: aggiungi a etichetta (solo avvocati) */}
            {isAvvocato && (
                <div className="flex flex-wrap gap-2">
                    <AggiungiAEtichetta
                        elemento={{ tipo: 'norma', id: norma.id }}
                        variant="default"
                    />
                </div>
            )}
        </div>
    )
}

export default NormaDettaglio