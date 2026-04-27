// src/components/GeneraDocumentoMenu.jsx
//
// Menu accordion che mostra i template documenti raggruppati per categoria.
// Click su un template apre il GeneraDocumentoWizard.

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Wand2, ChevronRight, FileText, AlertCircle, Loader2
} from 'lucide-react'
import GeneraDocumentoWizard from './GeneraDocumentoWizard'

// ─────────────────────────────────────────────────────────────
// CATEGORIE — ordine + label di visualizzazione
// ─────────────────────────────────────────────────────────────
const CATEGORIE = [
    {
        codice: 'stragiudiziale',
        label: 'Atti stragiudiziali',
        desc: 'Diffide, messe in mora, pareri, accordi, transazioni',
        ordine: 1,
    },
    {
        codice: 'introduttivo',
        label: 'Atti introduttivi',
        desc: 'Citazione, ricorso, decreto ingiuntivo, opposizione',
        ordine: 2,
    },
    {
        codice: 'difensivo',
        label: 'Atti difensivi',
        desc: 'Comparsa, memoria, note difensive, replica, conclusionale',
        ordine: 3,
    },
    {
        codice: 'istruttorio',
        label: 'Atti istruttori e incidentali',
        desc: 'Istanze, richieste prova, lista testimoni, osservazioni CTU',
        ordine: 4,
    },
    {
        codice: 'esecutivo',
        label: 'Atti esecutivi',
        desc: 'Precetto, pignoramento, istanza di vendita o assegnazione',
        ordine: 5,
    },
    {
        codice: 'impugnazione',
        label: 'Impugnazioni',
        desc: 'Appello, reclamo, cassazione, revocazione',
        ordine: 6,
    },
]

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function GeneraDocumentoMenu({ praticaId }) {
    const [templates, setTemplates] = useState([])
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')
    const [aperta, setAperta] = useState(null)
    const [templateSelezionato, setTemplateSelezionato] = useState(null)

    useEffect(() => {
        async function carica() {
            setLoading(true)
            setErrore('')
            const { data, error } = await supabase
                .from('templates_documenti')
                .select('id, codice, categoria, nome, descrizione_breve, ordine')
                .eq('attivo', true)
                .order('ordine', { ascending: true })

            if (error) {
                setErrore('Errore nel caricamento dei template')
            } else {
                setTemplates(data ?? [])
            }
            setLoading(false)
        }
        carica()
    }, [])

    // Raggruppa template per categoria
    function templateDi(codiceCategoria) {
        return templates.filter(t => t.categoria === codiceCategoria)
    }

    function apriTemplate(template) {
        setTemplateSelezionato(template)
    }

    function chiudiWizard() {
        setTemplateSelezionato(null)
    }

    // Solo categorie che hanno almeno un template attivo
    const categorieConTemplate = CATEGORIE.filter(cat => templateDi(cat.codice).length > 0)

    return (
        <>
            <div className="bg-slate border border-oro/20 flex flex-col" style={{ minHeight: 480 }}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <Wand2 size={16} className="text-oro" />
                        <p className="font-body text-base font-medium text-oro">Genera documento</p>
                    </div>
                    {!loading && templates.length > 0 && (
                        <span className="font-body text-[10px] text-nebbia/40 border border-white/10 px-2 py-0.5 uppercase tracking-wider">
                            {templates.length} {templates.length === 1 ? 'template' : 'template'}
                        </span>
                    )}
                </div>

                {/* Subtitle */}
                <div className="px-4 py-3 border-b border-white/5 bg-petrolio/30 shrink-0">
                    <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                        Lex genera l'atto a partire dai dati della pratica, del cliente e delle controparti.
                    </p>
                </div>

                {/* Lista categorie */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={20} className="animate-spin text-oro" />
                        </div>
                    ) : errore ? (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={13} /> {errore}
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                            <FileText size={24} className="text-nebbia/20 mb-2" />
                            <p className="font-body text-sm text-nebbia/40">Nessun template disponibile</p>
                            <p className="font-body text-xs text-nebbia/25 mt-1">
                                I template saranno disponibili a breve
                            </p>
                        </div>
                    ) : categorieConTemplate.map(cat => {
                        const lista = templateDi(cat.codice)
                        const isAperta = aperta === cat.codice
                        return (
                            <div key={cat.codice} className="border border-white/8 bg-petrolio/30">
                                <button
                                    onClick={() => setAperta(isAperta ? null : cat.codice)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-body text-sm font-medium text-nebbia">{cat.label}</p>
                                        <p className="font-body text-xs text-nebbia/40 mt-0.5 truncate">{cat.desc}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="font-body text-[10px] text-nebbia/30">{lista.length}</span>
                                        <ChevronRight
                                            size={14}
                                            className={`text-nebbia/30 transition-transform ${isAperta ? 'rotate-90' : ''}`}
                                        />
                                    </div>
                                </button>
                                {isAperta && (
                                    <div className="px-2 pb-2 space-y-1">
                                        {lista.map(tpl => (
                                            <button
                                                key={tpl.id}
                                                onClick={() => apriTemplate(tpl)}
                                                className="w-full text-left p-3 bg-slate border border-white/5 hover:border-oro/30 hover:bg-oro/5 transition-colors group"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors">
                                                            {tpl.nome}
                                                        </p>
                                                        {tpl.descrizione_breve && (
                                                            <p className="font-body text-xs text-nebbia/50 mt-0.5 leading-relaxed">
                                                                {tpl.descrizione_breve}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <ChevronRight size={13} className="text-nebbia/20 group-hover:text-oro transition-colors shrink-0 mt-0.5" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Wizard modale */}
            {templateSelezionato && (
                <GeneraDocumentoWizard
                    template={templateSelezionato}
                    praticaId={praticaId}
                    onClose={chiudiWizard}
                />
            )}
        </>
    )
}