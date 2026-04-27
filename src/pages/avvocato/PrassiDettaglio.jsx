// src/pages/avvocato/PrassiDettaglio.jsx
// Pagina dettaglio prassi (atti amministrativi: circolari, provvedimenti, ecc.)
// Sempre gratuita per utenti autenticati.

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { BackButton, Badge } from '@/components/shared'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import {
    FileText, Calendar, BookOpen, Scale,
    AlertCircle, CheckCircle, Search, Save,
    Download, ExternalLink, Landmark, Building2,
    ArrowRight, X
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function titoloCompatto(p, ente) {
    const enteName = ente?.label ?? p.fonte
    const parti = [enteName, p.numero && `n. ${p.numero}`, p.anno].filter(Boolean)
    return parti.join(' · ') || 'Prassi'
}

// ═══════════════════════════════════════════════════════════════
// AGGIUNGI A PRATICA
// ═══════════════════════════════════════════════════════════════
function AggiungiAPratica({ prassi }) {
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
            await supabase.from('note_interne').insert({
                pratica_id: pratica.id,
                autore_id: user.id,
                tipo: 'prassi_amministrativa',
                testo: prassi.sintesi ?? prassi.oggetto ?? '',
                metadati: {
                    domanda: `Prassi: ${prassi.oggetto}`,
                    prassi_id: prassi.id,
                    fonte: prassi.fonte,
                    numero: prassi.numero,
                    anno: prassi.anno,
                    categorie_lex: prassi.categorie_lex,
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

    // Solo gli avvocati hanno pratiche
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
// CATEGORIE HELPER
// ═══════════════════════════════════════════════════════════════
function useCategorieMap() {
    const [mappa, setMappa] = useState({})
    useEffect(() => {
        supabase.from('codici_lex').select('codice, label').then(({ data }) => {
            const m = {}
            for (const c of data ?? []) m[c.codice] = c.label
            setMappa(m)
        })
    }, [])
    return mappa
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE
// ═══════════════════════════════════════════════════════════════
export default function PrassiDettaglio() {
    const { id } = useParams()
    const mappaCategorie = useCategorieMap()

    const [prassi, setPrassi] = useState(null)
    const [ente, setEnte] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState(null)
    const [pdfUrl, setPdfUrl] = useState(null)

    useEffect(() => {
        async function carica() {
            setLoading(true); setErrore(null)
            try {
                const { data, error } = await supabase
                    .from('prassi')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle()
                if (error) throw new Error(error.message)
                if (!data) {
                    setErrore('Prassi non trovata')
                    return
                }
                setPrassi(data)

                // Carica info ente
                if (data.fonte) {
                    const { data: enteData } = await supabase
                        .from('enti')
                        .select('codice, label, descrizione, sito_web, macro_area')
                        .eq('codice', data.fonte)
                        .maybeSingle()
                    setEnte(enteData)
                }

                // Signed URL PDF (se presente e file esiste)
                if (data.pdf_storage_path) {
                    const lastSlash = data.pdf_storage_path.lastIndexOf('/')
                    const folder = lastSlash > 0 ? data.pdf_storage_path.slice(0, lastSlash) : ''
                    const filename = lastSlash > 0 ? data.pdf_storage_path.slice(lastSlash + 1) : data.pdf_storage_path

                    const { data: listData } = await supabase.storage
                        .from('prassi-pdf')
                        .list(folder, { search: filename, limit: 1 })

                    const fileExists = listData && listData.some(f => f.name === filename)

                    if (fileExists) {
                        const { data: signed } = await supabase.storage
                            .from('prassi-pdf')
                            .createSignedUrl(data.pdf_storage_path, 3600)
                        setPdfUrl(signed?.signedUrl ?? null)
                    }
                }
            } catch (e) {
                setErrore(e.message)
            } finally {
                setLoading(false)
            }
        }
        carica()
    }, [id])

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    if (errore) return (
        <div className="space-y-5">
            <BackButton to={window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'} label="Banca dati" />
            <div className="bg-slate border border-red-500/20 p-8 flex flex-col items-center text-center gap-3">
                <AlertCircle size={28} className="text-red-400" />
                <p className="font-body text-sm text-red-400">{errore}</p>
            </div>
        </div>
    )

    if (!prassi) return null

    const p = prassi
    const titolo = titoloCompatto(p, ente)
    const dataVisibile = p.data_pubblicazione ?? p.data_emanazione

    return (
        <div className="space-y-5">
            <BackButton to={window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'} label="Banca dati" />

            {/* Intestazione */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                        <p className="section-label !m-0">Prassi amministrativa</p>
                        <span className="font-body text-xs text-salvia border border-salvia/30 px-2 py-0.5 bg-salvia/5">
                            Gratuita
                        </span>
                    </div>
                    <h1 className="font-body text-xl font-medium text-nebbia leading-snug">{p.oggetto ?? 'Prassi'}</h1>
                    <p className="font-body text-sm text-nebbia/40 mt-2">{titolo}</p>
                    {dataVisibile && (
                        <p className="font-body text-xs text-nebbia/30 mt-1 flex items-center gap-1.5">
                            <Calendar size={11} /> Pubblicata il {new Date(dataVisibile).toLocaleDateString('it-IT')}
                        </p>
                    )}
                </div>

                <div className="shrink-0 flex flex-wrap items-start gap-2">
                    <AggiungiAPratica prassi={p} />
                    <AggiungiAEtichetta
                        elemento={{ tipo: 'prassi', id: p.id }}
                    />
                </div>
            </div>

            {/* Ente emanante */}
            {ente && (
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Building2 size={13} className="text-oro/60" />
                        <p className="section-label !m-0">Ente emanante</p>
                    </div>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <p className="font-body text-base font-medium text-nebbia">{ente.label}</p>
                            {ente.descrizione && (
                                <p className="font-body text-xs text-nebbia/40 mt-1 max-w-xl leading-relaxed">{ente.descrizione}</p>
                            )}
                        </div>
                        {ente.sito_web && (
                            <a href={ente.sito_web} target="_blank" rel="noreferrer"
                                className="font-body text-xs text-salvia hover:text-salvia/80 flex items-center gap-1.5 transition-colors shrink-0">
                                <ExternalLink size={11} /> Sito ufficiale
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Sintesi */}
            {p.sintesi && (
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Scale size={13} className="text-oro/60" />
                        <p className="section-label !m-0">Sintesi</p>
                    </div>
                    <p className="font-body text-sm text-nebbia/75 leading-relaxed whitespace-pre-line">
                        {p.sintesi}
                    </p>
                </div>
            )}

            {/* Categorie Lex */}
            {(p.categorie_lex ?? []).length > 0 && (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">Categorie</p>
                    <div className="flex flex-wrap gap-2">
                        {p.categorie_lex.map(c => (
                            <Link
                                key={c}
                                to={`${window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'}?categoria=${c}`}
                                className="font-body text-xs px-3 py-1 bg-petrolio border border-white/10 text-nebbia/60 hover:border-oro/30 hover:text-oro transition-colors"
                            >
                                {mappaCategorie[c] ?? c}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Materia + Parole chiave */}
            {((p.materia ?? []).length > 0 || (p.parole_chiave ?? []).length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {(p.materia ?? []).length > 0 && (
                        <div className="bg-slate border border-white/5 p-5">
                            <p className="section-label mb-3">Materia</p>
                            <div className="flex flex-wrap gap-2">
                                {p.materia.map(m => (
                                    <span key={m} className="font-body text-xs px-2.5 py-1 bg-petrolio border border-white/10 text-nebbia/60">{m}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {(p.parole_chiave ?? []).length > 0 && (
                        <div className="bg-slate border border-white/5 p-5">
                            <p className="section-label mb-3">Parole chiave</p>
                            <div className="flex flex-wrap gap-2">
                                {p.parole_chiave.map(pc => (
                                    <span key={pc} className="font-body text-xs px-2.5 py-1 bg-petrolio border border-white/10 text-nebbia/60">{pc}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Norme richiamate */}
            {(p.norme_richiamate ?? []).length > 0 && (
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <BookOpen size={13} className="text-oro/60" />
                        <p className="section-label !m-0">Norme richiamate</p>
                    </div>
                    <div className="space-y-1.5">
                        {p.norme_richiamate.map((n, i) => (
                            <p key={i} className="font-mono text-xs text-nebbia/60 px-3 py-2 bg-petrolio/50 border-l-2 border-oro/20">
                                {n}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* CELEX UE */}
            {(p.celex_correlati ?? []).length > 0 && (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">Riferimenti UE</p>
                    <div className="space-y-1.5">
                        {p.celex_correlati.map((c, i) => (
                            <p key={i} className="font-mono text-xs text-nebbia/60 px-3 py-2 bg-petrolio/50 border-l-2 border-salvia/20">
                                {c}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* Testo integrale */}
            {p.testo_integrale && (
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText size={13} className="text-oro/60" />
                        <p className="section-label !m-0">Testo integrale</p>
                    </div>
                    <div className="bg-petrolio/60 border border-white/5 p-5 max-h-[600px] overflow-y-auto">
                        <p className="font-body text-sm text-nebbia/70 whitespace-pre-line leading-relaxed">
                            {p.testo_integrale}
                        </p>
                    </div>
                </div>
            )}

            {/* Documento PDF (solo se presente) */}
            {pdfUrl && (
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <FileText size={13} className="text-oro/60" />
                            <p className="section-label !m-0">Documento</p>
                        </div>
                        <a href={pdfUrl} target="_blank" rel="noreferrer" className="font-body text-xs text-nebbia/50 hover:text-oro flex items-center gap-1.5 transition-colors">
                            <Download size={11} /> Apri in nuova scheda
                        </a>
                    </div>
                    <iframe
                        src={pdfUrl}
                        title={p.oggetto ?? 'Prassi'}
                        className="w-full border border-white/5"
                        style={{ height: 700 }}
                    />
                </div>
            )}

            {/* Fonte ufficiale */}
            {p.url_originale && (
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Landmark size={13} className="text-oro/60" />
                        <p className="section-label !m-0">Fonte ufficiale</p>
                    </div>
                    <a
                        href={p.url_originale}
                        target="_blank"
                        rel="noreferrer"
                        className="font-body text-sm text-salvia hover:text-salvia/80 flex items-center gap-1.5 transition-colors break-all"
                    >
                        <ExternalLink size={12} className="shrink-0" />
                        {p.url_originale}
                    </a>
                </div>
            )}

            {/* Footer info */}
            <div className="pt-4 border-t border-white/5">
                <p className="font-body text-xs text-nebbia/25 text-center">ID: {p.id}</p>
            </div>
        </div>
    )
}