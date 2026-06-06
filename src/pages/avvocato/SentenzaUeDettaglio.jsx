// src/pages/avvocato/SentenzaUeDettaglio.jsx
// Pagina di dettaglio per una pronuncia della Corte di giustizia dell'UE (CGUE).
// Tabella sorgente: eur_lex
// Fonte: EUR-Lex © Unione europea, 1998–oggi — riuso autorizzato (Dec. 2011/833/UE) con indicazione della fonte.
//
// Modellata su SentenzaTributariaDettaglio.jsx (stesso stile/tema).
// Rotte: /banca-dati/eur-lex/:id  e  /area/eur-lex/:id

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import {
    ChevronLeft, Calendar, Scale, Building2,
    FileText, ExternalLink, AlertCircle, Search, X, User
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// AggiungiAPratica — popover inline (clone del pattern di BancaDati)
// ═══════════════════════════════════════════════════════════════
function AggiungiAPratica({ ricerca, ricercaSalvataId, setRicercaSalvataId }) {
    const { profile } = useAuth()
    const [aperto, setAperto] = useState(false)
    const [cerca, setCerca] = useState('')
    const [pratiche, setPratiche] = useState([])
    const [loading, setLoading] = useState(false)
    const [salvando, setSalvando] = useState(null)
    const [salvatoIn, setSalvatoIn] = useState(null)
    const [errore, setErrore] = useState(null)

    useEffect(() => {
        if (!aperto) return
        async function carica() {
            setLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                const { data } = await supabase
                    .from('pratiche')
                    .select('id, titolo, cliente:cliente_id(nome, cognome)')
                    .eq('avvocato_id', user.id)
                    .eq('stato', 'aperta')
                    .order('updated_at', { ascending: false })
                    .limit(50)
                setPratiche(data ?? [])
            } finally {
                setLoading(false)
            }
        }
        carica()
    }, [aperto])

    async function salva(pratica) {
        setSalvando(pratica.id)
        setErrore(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (ricercaSalvataId) {
                const { error } = await supabase
                    .from('ricerche')
                    .update({ pratica_id: pratica.id })
                    .eq('id', ricercaSalvataId)
                if (error) throw new Error(error.message)
            } else {
                const { data, error } = await supabase
                    .from('ricerche')
                    .insert({
                        pratica_id: pratica.id,
                        user_id: user.id,
                        autore_id: user.id,
                        tipo: 'ricerca_manuale',
                        titolo: ricerca.domanda,
                        contenuto: ricerca.testo,
                        metadati: {
                            fonte: 'eur_lex_cgue',
                            sentenza_id: ricerca.sentenza_id,
                            ts: new Date().toISOString(),
                        }
                    })
                    .select('id')
                    .single()
                if (error) throw new Error(error.message)
                if (setRicercaSalvataId) setRicercaSalvataId(data.id)
            }
            setSalvatoIn(pratica)
            setAperto(false)
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(null)
        }
    }

    if (profile?.role !== 'avvocato') return null

    if (salvatoIn) return (
        <span className="font-body text-xs text-salvia flex items-center gap-1.5 px-3 py-2 border border-salvia/30 bg-salvia/5">
            Salvato in "{salvatoIn.titolo}"
        </span>
    )

    const pratichefiltrate = cerca.trim()
        ? pratiche.filter(p => p.titolo.toLowerCase().includes(cerca.toLowerCase()))
        : pratiche

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onClick={() => setAperto(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors"
            >
                <FileText size={13} />
                <span>Salva in pratica</span>
            </button>

            {aperto && (
                <div className="absolute z-50 mt-2 w-80 bg-slate border border-white/10 shadow-2xl">
                    <div className="p-3 border-b border-white/5">
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                            <input
                                autoFocus
                                value={cerca}
                                onChange={e => setCerca(e.target.value)}
                                placeholder="Cerca pratica..."
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-8 pr-8 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <button
                                onClick={() => setAperto(false)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-nebbia"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 flex items-center justify-center gap-2 text-nebbia/30">
                                <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                                <span className="font-body text-xs">Caricamento...</span>
                            </div>
                        ) : pratichefiltrate.length === 0 ? (
                            <p className="p-4 text-center font-body text-xs text-nebbia/25">
                                {cerca ? 'Nessuna pratica trovata' : 'Nessuna pratica aperta'}
                            </p>
                        ) : (
                            pratichefiltrate.map(p => {
                                const isLoading = salvando === p.id
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => salva(p)}
                                        disabled={isLoading}
                                        className="w-full text-left px-3 py-2.5 hover:bg-petrolio/50 transition-colors border-b border-white/5 last:border-0 disabled:opacity-50"
                                    >
                                        <p className="font-body text-sm text-nebbia/80 truncate">{p.titolo}</p>
                                        {p.cliente && (
                                            <p className="font-body text-xs text-nebbia/30 mt-0.5 truncate">
                                                {p.cliente.nome} {p.cliente.cognome}
                                            </p>
                                        )}
                                        {isLoading && (
                                            <span className="font-body text-xs text-oro mt-1 flex items-center gap-1">
                                                <span className="animate-spin w-2.5 h-2.5 border border-oro border-t-transparent rounded-full" />
                                                Salvataggio...
                                            </span>
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </div>

                    {errore && (
                        <div className="p-2 bg-red-900/15 border-t border-red-500/20">
                            <p className="font-body text-xs text-red-400">{errore}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE
// ═══════════════════════════════════════════════════════════════
export default function SentenzaUeDettaglio() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [sentenza, setSentenza] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState(null)
    const [testoEspanso, setTestoEspanso] = useState(false)
    const [ricercaSalvataId, setRicercaSalvataId] = useState(null)

    const isAreaUtente = window.location.pathname.startsWith('/area')
    const prefix = isAreaUtente ? '/area' : '/banca-dati'

    useEffect(() => {
        async function carica() {
            setLoading(true)
            setErrore(null)
            try {
                const { data, error } = await supabase
                    .from('eur_lex')
                    .select('*')
                    .eq('id', id)
                    .single()
                if (error) throw new Error(error.message)
                if (!data) throw new Error('Pronuncia non trovata')
                setSentenza(data)
            } catch (e) {
                setErrore(e.message)
            } finally {
                setLoading(false)
            }
        }
        if (id) carica()
    }, [id])

    function formatData(d) {
        if (!d) return null
        try {
            return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
        } catch {
            return d
        }
    }

    function labelTipo(t) {
        const map = {
            sentenza_cgue: 'Sentenza',
            ordinanza_cgue: 'Ordinanza',
            conclusioni_ag: "Conclusioni dell'Avvocato Generale",
            view_ag: "Presa di posizione dell'Avvocato Generale",
            opinione_giuridica: 'Parere',
        }
        return map[t] ?? (t ? String(t).replace(/_/g, ' ') : 'Pronuncia')
    }

    // Conclusioni AG / pareri: autorevoli ma NON vincolanti → badge informativo
    const isNonVincolante = sentenza && ['conclusioni_ag', 'view_ag', 'opinione_giuridica'].includes(sentenza.tipo)

    function asArray(v) {
        if (Array.isArray(v)) return v.filter(Boolean)
        if (typeof v === 'string' && v.trim()) return [v]
        return []
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
            </div>
        )
    }

    if (errore || !sentenza) {
        return (
            <div className="space-y-4 pb-24">
                <button
                    onClick={() => navigate(`${prefix}`)}
                    className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors"
                >
                    <ChevronLeft size={13} /> Torna alla banca dati
                </button>
                <div className="bg-red-900/10 border border-red-500/20 p-6">
                    <p className="font-body text-sm text-red-400">{errore ?? 'Pronuncia non disponibile'}</p>
                </div>
            </div>
        )
    }

    const materie = asArray(sentenza.materia)
    const normeRichiamate = asArray(sentenza.norme_richiamate)
    const giurCollegata = asArray(sentenza.giurisprudenza_collegata)

    const titoloBreve = [
        sentenza.organo,
        sentenza.numero_caso && `causa ${sentenza.numero_caso}`,
    ].filter(Boolean).join(' · ') || sentenza.celex_id || 'Pronuncia CGUE'

    const ricercaSave = {
        sentenza_id: sentenza.id,
        domanda: `${sentenza.organo ?? 'CGUE'} — ${sentenza.numero_caso ? `causa ${sentenza.numero_caso}` : sentenza.celex_id}${sentenza.oggetto ? ` — ${String(sentenza.oggetto).slice(0, 120)}` : ''}`,
        testo: [
            sentenza.ecli && `ECLI: ${sentenza.ecli}`,
            sentenza.celex_id && `CELEX: ${sentenza.celex_id}`,
            sentenza.oggetto && `Oggetto: ${sentenza.oggetto}`,
            sentenza.url_originale && `Fonte: ${sentenza.url_originale}`,
        ].filter(Boolean).join('\n\n'),
    }

    return (
        <div className="space-y-5 pb-24">

            {/* Header navigazione */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors"
                >
                    <ChevronLeft size={13} /> Indietro
                </button>
            </div>

            {/* Banner attribuzione UE — sempre visibile in cima */}
            <div className="bg-petrolio/60 border border-salvia/15 px-4 py-3 flex items-start gap-3">
                <Scale size={14} className="text-salvia shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="font-body text-xs text-nebbia/70 leading-relaxed">
                        Pronuncia della <strong className="text-nebbia">Corte di giustizia dell'Unione europea</strong>
                        {sentenza.organo && sentenza.organo !== 'Corte di Giustizia UE' && (
                            <> &mdash; <strong className="text-nebbia">{sentenza.organo}</strong></>
                        )}
                    </p>
                    <p className="font-body text-[11px] text-nebbia/40 mt-1 leading-relaxed">
                        Fonte: EUR-Lex &mdash; © Unione europea, 1998&ndash;oggi
                    </p>
                </div>
            </div>

            {/* Header pronuncia */}
            <div className="bg-slate border border-white/5 p-6 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">
                            {labelTipo(sentenza.tipo)}
                        </p>
                        <h1 className="font-display text-2xl text-nebbia leading-tight">{titoloBreve}</h1>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {sentenza.celex_id && (
                                <span className="font-body text-[11px] text-nebbia/60 border border-white/10 px-2 py-0.5 bg-petrolio/40">
                                    CELEX {sentenza.celex_id}
                                </span>
                            )}
                            {sentenza.ecli && (
                                <span className="font-body text-[11px] text-nebbia/60 border border-white/10 px-2 py-0.5 bg-petrolio/40">
                                    {sentenza.ecli}
                                </span>
                            )}
                        </div>
                    </div>
                    {isNonVincolante ? (
                        <span className="font-body text-xs text-oro border border-oro/30 px-2 py-1 bg-oro/5 whitespace-nowrap">
                            Non vincolante
                        </span>
                    ) : (
                        <span className="font-body text-xs text-salvia border border-salvia/30 px-2 py-1 bg-salvia/5 whitespace-nowrap">
                            Gratuita
                        </span>
                    )}
                </div>

                {/* Griglia metadati */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 border-t border-white/5">
                    {sentenza.data_decisione && (
                        <div>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Decisione</p>
                            <p className="font-body text-sm text-nebbia/70 flex items-center gap-2">
                                <Calendar size={12} className="text-nebbia/30" />
                                {formatData(sentenza.data_decisione)}
                            </p>
                        </div>
                    )}
                    {sentenza.data_pubblicazione && (
                        <div>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Pubblicazione</p>
                            <p className="font-body text-sm text-nebbia/70 flex items-center gap-2">
                                <Calendar size={12} className="text-nebbia/30" />
                                {formatData(sentenza.data_pubblicazione)}
                            </p>
                        </div>
                    )}
                    {sentenza.organo && (
                        <div>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Organo</p>
                            <p className="font-body text-sm text-nebbia/70 flex items-center gap-2">
                                <Building2 size={12} className="text-nebbia/30" />
                                {sentenza.organo}
                            </p>
                        </div>
                    )}
                    {sentenza.relatore && (
                        <div>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Relatore</p>
                            <p className="font-body text-sm text-nebbia/70 flex items-center gap-2">
                                <User size={12} className="text-nebbia/30" />
                                {sentenza.relatore}
                            </p>
                        </div>
                    )}
                    {sentenza.avvocato_generale && (
                        <div>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Avvocato Generale</p>
                            <p className="font-body text-sm text-nebbia/70 flex items-center gap-2">
                                <User size={12} className="text-nebbia/30" />
                                {sentenza.avvocato_generale}
                            </p>
                        </div>
                    )}
                    {sentenza.parti && (
                        <div className="md:col-span-2 lg:col-span-1">
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Parti</p>
                            <p className="font-body text-sm text-nebbia/70">{sentenza.parti}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottoni azione */}
            <div className="flex flex-wrap gap-2">
                <AggiungiAPratica
                    ricerca={ricercaSave}
                    ricercaSalvataId={ricercaSalvataId}
                    setRicercaSalvataId={setRicercaSalvataId}
                />
                <AggiungiAEtichetta
                    elemento={{ tipo: 'sentenza_ue', id: sentenza.id }}
                    domanda={ricercaSave.domanda}
                    risposta={ricercaSave.testo}
                    metadati={{
                        fonte: 'eur_lex_cgue',
                        sentenza_id: sentenza.id,
                        celex: sentenza.celex_id,
                        ecli: sentenza.ecli,
                        organo: sentenza.organo,
                        ts: new Date().toISOString(),
                    }}
                    ricercaIdEsterno={ricercaSalvataId}
                    onRicercaCreata={setRicercaSalvataId}
                />
                {sentenza.url_originale && (
                    <a
                        href={sentenza.url_originale}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-white/10 text-nebbia/60 font-body text-sm hover:border-oro/30 hover:text-oro transition-colors"
                    >
                        <ExternalLink size={13} /> Vedi su EUR-Lex
                    </a>
                )}
            </div>

            {/* Conclusioni AG: avviso non vincolante */}
            {isNonVincolante && (
                <div className="bg-oro/5 border border-oro/20 px-4 py-3 flex items-start gap-3">
                    <AlertCircle size={12} className="text-oro shrink-0 mt-0.5" />
                    <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                        Le conclusioni dell'Avvocato Generale sono <strong className="text-nebbia/80">autorevoli ma non vincolanti</strong>:
                        non costituiscono la decisione della Corte. Verificare l'eventuale sentenza definitiva sulla medesima causa.
                    </p>
                </div>
            )}

            {/* Oggetto */}
            {sentenza.oggetto && (
                <div className="bg-slate border border-white/5 p-6">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">Oggetto / massima</p>
                    <p className="font-body text-sm text-nebbia/80 leading-relaxed whitespace-pre-line">{sentenza.oggetto}</p>
                </div>
            )}

            {/* Materia */}
            {materie.length > 0 && (
                <div className="bg-slate border border-white/5 p-6">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">Materia</p>
                    <div className="flex flex-wrap gap-2">
                        {materie.map((m, i) => (
                            <span key={i} className="font-body text-xs text-nebbia/70 border border-white/10 px-2 py-1 bg-petrolio/40">{m}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Norme richiamate */}
            {normeRichiamate.length > 0 && (
                <div className="bg-slate border border-white/5 p-6">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">Norme richiamate</p>
                    <div className="flex flex-wrap gap-2">
                        {normeRichiamate.map((n, i) => (
                            <span key={i} className="font-body text-xs text-nebbia/70 border border-white/10 px-2 py-1 bg-petrolio/40">{n}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Giurisprudenza collegata */}
            {giurCollegata.length > 0 && (
                <div className="bg-slate border border-white/5 p-6">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">Giurisprudenza collegata</p>
                    <div className="flex flex-wrap gap-2">
                        {giurCollegata.map((g, i) => (
                            <span key={i} className="font-body text-xs text-nebbia/60 border border-white/10 px-2 py-1 bg-petrolio/40">{g}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Testo integrale (espandibile) */}
            {sentenza.testo_integrale && (
                <div className="bg-slate border border-white/5 p-6">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Testo integrale</p>
                        <button
                            onClick={() => setTestoEspanso(v => !v)}
                            className="font-body text-xs text-oro hover:text-oro/80 transition-colors"
                        >
                            {testoEspanso ? 'Nascondi' : 'Mostra'}
                        </button>
                    </div>
                    {testoEspanso ? (
                        <div className="font-body text-sm text-nebbia/75 leading-relaxed whitespace-pre-line max-h-[600px] overflow-y-auto pr-2">
                            {sentenza.testo_integrale}
                        </div>
                    ) : (
                        <p className="font-body text-xs text-nebbia/30 italic">
                            ({sentenza.testo_integrale.length.toLocaleString('it-IT')} caratteri{sentenza.testo_lingua ? ` · lingua: ${sentenza.testo_lingua}` : ''})
                        </p>
                    )}
                </div>
            )}

            {/* Attribuzione finale */}
            <div className="bg-slate border border-white/5 p-4">
                <p className="font-body text-[11px] text-nebbia/40 leading-relaxed">
                    <strong className="text-nebbia/60">Fonte:</strong> EUR-Lex &mdash; © Unione europea, 1998&ndash;oggi.
                    Riuso autorizzato (Decisione 2011/833/UE) con indicazione della fonte.
                    {sentenza.url_originale && (
                        <> &middot; <a href={sentenza.url_originale} target="_blank" rel="noopener noreferrer" className="text-oro hover:underline">EUR-Lex</a></>
                    )}
                </p>
                <p className="font-body text-[11px] text-nebbia/40 leading-relaxed mt-1">
                    Solo i testi pubblicati nell'edizione cartacea o elettronica della Gazzetta ufficiale dell'Unione europea fanno fede.
                </p>
            </div>

        </div>
    )
}
