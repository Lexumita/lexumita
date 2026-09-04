// src/components/avvocato/BoxTerminiPratica.jsx
//
// Box in scheda pratica per visualizzare e gestire i termini processuali.
// - Lista termini in corso con badge urgenza colorato
// - Bottone "Aggiungi termine" che apre il modal
// - Click su termine: azioni (compiuto, annulla)
// - Anteprima dei termini scaduti/compiuti separati

import { useState, useEffect } from 'react'
import { Plus, AlertTriangle, CheckCircle2, XCircle, Calendar, Trash2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import NuovoTerminePratica from './NuovoTerminePratica'

function fmtData(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function giorniMancanti(dataScadenza) {
    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    const target = new Date(dataScadenza)
    target.setHours(0, 0, 0, 0)
    return Math.round((target - oggi) / (1000 * 60 * 60 * 24))
}

function badgeUrgenza(giorni) {
    if (giorni < 0) return { color: 'text-red-400 bg-red-500/10 border-red-500/30', label: 'Scaduta', critico: true }
    if (giorni === 0) return { color: 'text-red-400 bg-red-500/10 border-red-500/30', label: 'Oggi', critico: true }
    if (giorni <= 3) return { color: 'text-red-400 bg-red-500/10 border-red-500/30', label: `${giorni}g`, critico: true }
    if (giorni <= 7) return { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: `${giorni}g`, critico: false }
    if (giorni <= 30) return { color: 'text-salvia bg-salvia/10 border-salvia/30', label: `${giorni}g`, critico: false }
    return { color: 'text-nebbia/50 bg-white/5 border-white/10', label: `${giorni}g`, critico: false }
}

export default function BoxTerminiPratica({ praticaId }) {
    const [termini, setTermini] = useState([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [filtroStato, setFiltroStato] = useState('in_corso') // 'in_corso' | 'storico'

    async function carica() {
        setLoading(true)
        const { data, error } = await supabase
            .from('termini_processuali')
            .select('*')
            .eq('pratica_id', praticaId)
            .order('data_scadenza', { ascending: true })

        if (error) {
            console.error('Errore caricamento termini:', error.message)
            setTermini([])
        } else {
            setTermini(data ?? [])
        }
        setLoading(false)
    }

    useEffect(() => { if (praticaId) carica() }, [praticaId])

    async function marcaCompiuto(id) {
        const oggi = new Date().toISOString().slice(0, 10)
        const { error } = await supabase
            .from('termini_processuali')
            .update({ stato: 'compiuto', data_compimento: oggi })
            .eq('id', id)
        if (error) return alert('Errore: ' + error.message)
        carica()
    }

    async function annullaTermine(id) {
        if (!confirm('Annullare questo termine? L\'evento sul calendario sara` rimosso.')) return
        const { error } = await supabase
            .from('termini_processuali')
            .delete()
            .eq('id', id)
        if (error) return alert('Errore: ' + error.message)
        carica()
    }

    const terminiInCorso = termini.filter(t => t.stato === 'in_corso')
    const terminiStorico = termini.filter(t => t.stato !== 'in_corso')

    const terminiVisibili = filtroStato === 'in_corso' ? terminiInCorso : terminiStorico

    return (
        <div className="bg-slate border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="section-label">Termini processuali</p>
                    {terminiInCorso.length > 0 && (
                        <p className="font-body text-xs text-nebbia/40 mt-1">
                            {terminiInCorso.length} in corso
                            {terminiStorico.length > 0 && ` - ${terminiStorico.length} storici`}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-oro text-petrolio font-body text-xs font-medium hover:bg-oro/90 transition-colors"
                >
                    <Plus size={13} /> Aggiungi termine
                </button>
            </div>

            {/* Tabs filtro */}
            {(terminiInCorso.length > 0 || terminiStorico.length > 0) && (
                <div className="flex items-center gap-3 mb-4 border-b border-white/5">
                    <button
                        onClick={() => setFiltroStato('in_corso')}
                        className={`pb-2 px-1 font-body text-xs transition-colors border-b-2 ${filtroStato === 'in_corso'
                                ? 'text-oro border-oro'
                                : 'text-nebbia/40 hover:text-nebbia/70 border-transparent'
                            }`}
                    >
                        In corso ({terminiInCorso.length})
                    </button>
                    <button
                        onClick={() => setFiltroStato('storico')}
                        className={`pb-2 px-1 font-body text-xs transition-colors border-b-2 ${filtroStato === 'storico'
                                ? 'text-oro border-oro'
                                : 'text-nebbia/40 hover:text-nebbia/70 border-transparent'
                            }`}
                    >
                        Storico ({terminiStorico.length})
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : terminiVisibili.length === 0 ? (
                <div className="py-8 text-center">
                    <Calendar size={28} className="text-nebbia/20 mx-auto mb-2" />
                    <p className="font-body text-sm text-nebbia/40">
                        {filtroStato === 'in_corso' ? 'Nessun termine in corso' : 'Nessun termine nello storico'}
                    </p>
                    {filtroStato === 'in_corso' && (
                        <p className="font-body text-xs text-nebbia/30 mt-1">
                            Aggiungi un termine per calcolare automaticamente la scadenza
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {terminiVisibili.map(t => {
                        const giorni = giorniMancanti(t.data_scadenza)
                        const badge = badgeUrgenza(giorni)
                        const isAttivo = t.stato === 'in_corso'

                        // Icona di stato
                        let StatoIcon = Calendar
                        let statoColor = 'text-salvia'
                        if (t.stato === 'compiuto') { StatoIcon = CheckCircle2; statoColor = 'text-salvia' }
                        else if (t.stato === 'scaduto_non_compiuto') { StatoIcon = XCircle; statoColor = 'text-red-400' }
                        else if (badge.critico) { StatoIcon = AlertTriangle; statoColor = 'text-red-400' }

                        return (
                            <div
                                key={t.id}
                                className={`group p-3 border transition-colors ${isAttivo && badge.critico
                                        ? 'bg-red-500/[0.03] border-red-500/20'
                                        : 'bg-petrolio/40 border-white/5 hover:border-white/10'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <StatoIcon size={16} className={`${statoColor} mt-0.5 shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-body text-sm text-nebbia font-medium">{t.tipo_label}</p>
                                            {isAttivo && (
                                                <span className={`font-body text-[10px] px-2 py-0.5 border ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                            )}
                                            {t.stato === 'compiuto' && (
                                                <span className="font-body text-[10px] px-2 py-0.5 border text-salvia bg-salvia/10 border-salvia/30">
                                                    Compiuto {fmtData(t.data_compimento)}
                                                </span>
                                            )}
                                            {t.stato === 'scaduto_non_compiuto' && (
                                                <span className="font-body text-[10px] px-2 py-0.5 border text-red-400 bg-red-500/10 border-red-500/30">
                                                    Scaduto non compiuto
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <p className="font-body text-xs text-nebbia/50">
                                                Scadenza: <span className="text-nebbia/80">{fmtData(t.data_scadenza)}</span>
                                            </p>
                                            {t.evento_descrizione && (
                                                <p className="font-body text-xs text-nebbia/40">
                                                    Da: {t.evento_descrizione}
                                                </p>
                                            )}
                                        </div>

                                        {t.note_calcolo && (
                                            <p className="font-body text-[11px] text-nebbia/40 mt-1 italic">{t.note_calcolo}</p>
                                        )}
                                        {t.note_avvocato && (
                                            <p className="font-body text-xs text-nebbia/60 mt-1">{t.note_avvocato}</p>
                                        )}
                                    </div>

                                    {/* Azioni */}
                                    {isAttivo && (
                                        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                                            <button
                                                onClick={() => marcaCompiuto(t.id)}
                                                title="Segna come compiuto"
                                                className="p-2.5 hover:bg-salvia/10 border border-transparent hover:border-salvia/30 transition-colors"
                                            >
                                                <Check size={16} className="text-salvia" />
                                            </button>
                                            <button
                                                onClick={() => annullaTermine(t.id)}
                                                title="Elimina termine"
                                                className="p-2.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
                                            >
                                                <Trash2 size={16} className="text-nebbia/40 hover:text-red-400" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {modalOpen && (
                <NuovoTerminePratica
                    praticaId={praticaId}
                    onClose={() => setModalOpen(false)}
                    onSaved={() => { setModalOpen(false); carica() }}
                />
            )}
        </div>
    )
}