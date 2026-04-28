// src/pages/avvocato/NormaDettaglio.jsx
// Pagina dettaglio norma — funziona per norme, norme_archivio, norme_ue
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { BackButton } from '@/components/shared'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import EtichetteAssegnate from '@/components/EtichetteAssegnate'
import {
    BookOpen, Globe, Archive, AlertCircle, ExternalLink,
    Calendar, Save, CheckCircle, Search
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// AGGIUNGI A PRATICA — stesso pattern di Sentenza/Prassi
// ═══════════════════════════════════════════════════════════════
function AggiungiAPratica({ norma, tipoFonte, codiceLabel }) {
    const { profile } = useAuth()
    const [aperto, setAperto] = useState(false)
    const [cerca, setCerca] = useState('')
    const [pratiche, setPratiche] = useState([])
    const [loading, setLoading] = useState(false)
    const [salvando, setSalvando] = useState(false)
    const [salvato, setSalvato] = useState(null)
    const [errore, setErrore] = useState(null)

    async function cercaPratiche(q) {
        setCerca(q)
        if (!q.trim()) { setPratiche([]); return }
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data } = await supabase
                .from('pratiche')
                .select('id, titolo, cliente:cliente_id(nome, cognome)')
                .eq('avvocato_id', user.id)
                .eq('stato', 'aperta')
                .ilike('titolo', `%${q}%`)
                .limit(5)
            setPratiche(data ?? [])
        } finally { setLoading(false) }
    }

    async function aggiungi(pratica) {
        setSalvando(true); setErrore(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const titolo = `${norma.articolo}${codiceLabel ? ` — ${codiceLabel}` : ''}`
            await supabase.from('note_interne').insert({
                pratica_id: pratica.id,
                autore_id: user.id,
                tipo: 'norma',
                testo: norma.testo ?? '',
                metadati: {
                    domanda: `Norma: ${titolo}`,
                    norma_id: norma.id,
                    tipo_fonte: tipoFonte,
                    codice: norma.codice,
                    articolo: norma.articolo,
                    rubrica: norma.rubrica,
                    ts: new Date().toISOString(),
                }
            })
            setSalvato(pratica.titolo)
            setAperto(false)
        } catch (e) { setErrore(e.message) }
        finally { setSalvando(false) }
    }

    if (salvato) return (
        <p className="font-body text-sm text-salvia flex items-center gap-2">
            <CheckCircle size={14} /> Aggiunta alla pratica "{salvato}"
        </p>
    )

    if (profile?.role !== 'avvocato') return null

    return (
        <div>
            <button onClick={() => setAperto(!aperto)} className="btn-secondary text-sm flex items-center gap-2">
                <Save size={13} /> {aperto ? 'Annulla' : 'Aggiungi a pratica'}
            </button>
            {aperto && (
                <div className="mt-3 bg-slate border border-white/10 p-4 space-y-3">
                    <p className="font-body text-xs text-nebbia/50">Cerca la pratica a cui aggiungere:</p>
                    <div className="relative">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                        <input
                            placeholder="Cerca pratica per nome..."
                            value={cerca}
                            onChange={e => cercaPratiche(e.target.value)}
                            autoFocus
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-8 pr-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />}
                    </div>
                    {!loading && cerca && pratiche.length === 0 && (
                        <p className="font-body text-xs text-nebbia/30">Nessuna pratica trovata</p>
                    )}
                    {pratiche.map(p => (
                        <button key={p.id} onClick={() => aggiungi(p)} disabled={salvando}
                            className="w-full text-left px-3 py-2.5 bg-petrolio border border-white/5 hover:border-oro/30 transition-colors">
                            <p className="font-body text-sm text-nebbia">{p.titolo}</p>
                            {p.cliente && <p className="font-body text-xs text-nebbia/30 mt-0.5">{p.cliente.nome} {p.cliente.cognome}</p>}
                        </button>
                    ))}
                    {errore && <p className="font-body text-xs text-red-400">{errore}</p>}
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE
// ═══════════════════════════════════════════════════════════════
export function NormaDettaglio() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { profile } = useAuth()

    const [norma, setNorma] = useState(null)
    const [tipoFonte, setTipoFonte] = useState(null) // 'norme' | 'archivio' | 'ue'
    const [codiceLabel, setCodiceLabel] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState(null)
    const [refreshEtichette, setRefreshEtichette] = useState(0)

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

            setErrore('Norma non trovata')
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    if (errore || !norma) return (
        <div className="space-y-5">
            <BackButton to={window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'} label="Banca dati" />
            <div className="bg-slate border border-red-500/20 p-8 flex flex-col items-center text-center gap-3">
                <AlertCircle size={28} className="text-red-400" />
                <p className="font-body text-sm text-red-400">{errore ?? 'Norma non trovata'}</p>
                <p className="font-body text-xs text-nebbia/30 mt-2">ID: {id}</p>
            </div>
        </div>
    )

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

    // Riferimento di intestazione
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
        <div className="space-y-5">
            <BackButton to={window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'} label="Banca dati" />

            {/* Intestazione — stesso pattern di SentenzaDettaglio/PrassiDettaglio */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                        <p className="section-label !m-0">{cfg.label}</p>
                        {norma.vigente === false && (
                            <span className="font-body text-xs text-red-400/70 border border-red-400/30 bg-red-400/5 px-2 py-0.5">
                                Non vigente
                            </span>
                        )}
                        {norma.tipo_elemento && norma.tipo_elemento !== 'articolo' && (
                            <span className="font-body text-[10px] text-nebbia/50 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">
                                {norma.tipo_elemento}
                            </span>
                        )}
                    </div>
                    <h1 className="font-display text-3xl text-nebbia leading-snug">{riferimento}</h1>
                    {norma.rubrica && (
                        <p className="font-body text-sm text-nebbia/60 italic mt-2">{norma.rubrica}</p>
                    )}

                    {/* Riferimenti aggiuntivi */}
                    {tipoFonte === 'archivio' && norma.titolo_doc && (
                        <p className="font-body text-sm text-nebbia/40 mt-2">{norma.titolo_doc}</p>
                    )}
                    {tipoFonte === 'ue' && (
                        <div className="font-body text-sm text-nebbia/40 space-y-0.5 mt-2">
                            {norma.titolo_doc && <p>{norma.titolo_doc}</p>}
                            {norma.titolo_breve && <p className="text-nebbia/30">{norma.titolo_breve}</p>}
                            {norma.celex && (
                                <p className="font-mono text-xs text-nebbia/30 mt-1">CELEX: {norma.celex}</p>
                            )}
                        </div>
                    )}
                    {tipoFonte === 'norme' && norma.libro && (
                        <p className="font-body text-xs text-nebbia/40 mt-2">
                            {norma.libro}
                            {norma.titolo && ` › ${norma.titolo}`}
                            {norma.capo && ` › ${norma.capo}`}
                        </p>
                    )}

                    {/* Date */}
                    {(norma.data_vigenza || norma.data_pubblicazione) && (
                        <div className="flex items-center gap-3 flex-wrap mt-2">
                            {norma.data_pubblicazione && (
                                <p className="font-body text-xs text-nebbia/30 flex items-center gap-1.5">
                                    <Calendar size={11} /> Pubblicata il {new Date(norma.data_pubblicazione).toLocaleDateString('it-IT')}
                                </p>
                            )}
                            {norma.data_vigenza && (
                                <p className="font-body text-xs text-nebbia/30 flex items-center gap-1.5">
                                    <Calendar size={11} /> In vigore dal {new Date(norma.data_vigenza).toLocaleDateString('it-IT')}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Azioni in alto a destra (solo avvocati) */}
                {isAvvocato && (
                    <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <AggiungiAPratica norma={norma} tipoFonte={tipoFonte} codiceLabel={codiceLabel} />
                            <AggiungiAEtichetta
                                elemento={{ tipo: 'norma', id: norma.id }}
                                onCambio={() => setRefreshEtichette(k => k + 1)}
                            />
                        </div>
                        <EtichetteAssegnate
                            elemento={{ tipo: 'norma', id: norma.id }}
                            refreshKey={refreshEtichette}
                        />
                    </div>
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

            {/* URN (solo se presente, isolato in card) */}
            {norma.urn && (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">Riferimenti</p>
                    <div className="flex items-start gap-2 font-body text-xs">
                        <span className="text-nebbia/40 shrink-0">URN:</span>
                        <span className="text-nebbia/70 font-mono break-all">{norma.urn}</span>
                    </div>
                </div>
            )}

            {/* Footer info */}
            <div className="pt-4 border-t border-white/5">
                <p className="font-body text-xs text-nebbia/25 text-center">ID: {norma.id}</p>
            </div>
        </div>
    )
}

export default NormaDettaglio