// src/pages/avvocato/SentenzaTributariaDettaglio.jsx
// Pagina di dettaglio per una sentenza tributaria CGT (Banca Dati MEF)
// Tabella sorgente: giurisprudenza_bdgt_mef
// Licenza: CC BY-NC 3.0 IT (attribuzione obbligatoria, visibile in cima e in fondo)

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import {
    ChevronLeft, Calendar, Scale, Building2,
    FileText, ExternalLink, AlertCircle, Search, X
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// AggiungiAPratica — popover inline (clone del pattern di BancaDati)
// ═══════════════════════════════════════════════════════════════
function AggiungiAPratica({ ricerca, ricercaSalvataId, setRicercaSalvataId, variant = 'default' }) {
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
                            fonte: 'tributario_bdgt_mef',
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
export default function SentenzaTributariaDettaglio() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [sentenza, setSentenza] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState(null)
    const [testoEspanso, setTestoEspanso] = useState(true)
    const [ricercaSalvataId, setRicercaSalvataId] = useState(null)

    const isAreaUtente = window.location.pathname.startsWith('/area')
    const prefix = isAreaUtente ? '/area' : '/banca-dati'

    // Se l'URL contiene ?focus=principio (settato da Lex AI), evidenzia la sezione
    const params = new URLSearchParams(window.location.search)
    const focus = params.get('focus')  // "principio" oppure null

    useEffect(() => {
        async function carica() {
            setLoading(true)
            setErrore(null)
            try {
                const { data, error } = await supabase
                    .from('giurisprudenza_bdgt_mef')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (error) throw new Error(error.message)
                if (!data) throw new Error('Sentenza non trovata')
                setSentenza(data)
            } catch (e) {
                setErrore(e.message)
            } finally {
                setLoading(false)
            }
        }
        if (id) carica()
    }, [id])

    // Quando la sentenza e' caricata E c'e' un focus, scrolla alla sezione
    useEffect(() => {
        if (!sentenza || !focus) return
        // Aspetta che il DOM sia renderizzato prima di scrollare
        const timer = setTimeout(() => {
            const targetId = focus === 'principio' ? 'principio-diritto' : null
            if (targetId) {
                const el = document.getElementById(targetId)
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [sentenza, focus])

    function formatData(d) {
        if (!d) return null
        try {
            return new Date(d).toLocaleDateString('it-IT', {
                day: 'numeric', month: 'long', year: 'numeric'
            })
        } catch {
            return d
        }
    }

    function labelTipoProvvedimento(t) {
        const map = {
            sentenza: 'Sentenza',
            ordinanza: 'Ordinanza',
            ordinanza_interlocutoria: 'Ordinanza interlocutoria',
            decreto_presidenziale: 'Decreto presidenziale',
        }
        return map[t] ?? t
    }

    function labelGrado(g) {
        return g === 'primo_grado' ? 'Primo grado'
            : g === 'secondo_grado' ? 'Secondo grado'
                : g
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
                    <p className="font-body text-sm text-red-400">
                        {errore ?? 'Sentenza non disponibile'}
                    </p>
                </div>
            </div>
        )
    }

    const titoloBreve = [
        sentenza.organo,
        sentenza.numero && `n. ${sentenza.numero}`,
        sentenza.anno,
    ].filter(Boolean).join(' · ')

    // Per il dropdown "Salva in pratica" preparo testo e domanda
    const ricercaSave = {
        sentenza_id: sentenza.id,
        domanda: `${sentenza.organo ?? 'Sentenza CGT'} — n. ${sentenza.numero}/${sentenza.anno}${sentenza.oggetto ? ` — ${sentenza.oggetto}` : ''}`,
        testo: [
            sentenza.oggetto && `Oggetto: ${sentenza.oggetto}`,
            sentenza.principio_diritto && `Principio: ${sentenza.principio_diritto}`,
            sentenza.esito && `Esito: ${sentenza.esito}`,
            sentenza.fonte_url && `Fonte: ${sentenza.fonte_url}`,
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

            {/* Banner attribuzione MEF — sempre visibile in cima */}
            <div className="bg-petrolio/60 border border-salvia/15 px-4 py-3 flex items-start gap-3">
                <Scale size={14} className="text-salvia shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="font-body text-xs text-nebbia/70 leading-relaxed">
                        Sentenza della <strong className="text-nebbia">Corte di Giustizia Tributaria</strong>
                        {sentenza.grado_commissione && (
                            <> &mdash; <strong className="text-nebbia">{labelGrado(sentenza.grado_commissione)}</strong></>
                        )}
                    </p>
                    <p className="font-body text-[11px] text-nebbia/40 mt-1 leading-relaxed">
                        Fonte: MEF &mdash; Banca Dati Giurisprudenza Tributaria &middot; Licenza CC BY-NC 3.0 IT
                    </p>
                </div>
            </div>

            {/* Header sentenza */}
            <div className="bg-slate border border-white/5 p-6 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">
                            {labelTipoProvvedimento(sentenza.tipo_provvedimento) ?? 'Sentenza'}
                        </p>
                        <h1 className="font-display text-2xl text-nebbia leading-tight">{titoloBreve}</h1>
                        {sentenza.oggetto && (
                            <p className="font-body text-sm text-nebbia/60 mt-3 leading-relaxed">
                                {sentenza.oggetto}
                            </p>
                        )}
                    </div>
                    <span className="font-body text-xs text-salvia border border-salvia/30 px-2 py-1 bg-salvia/5 whitespace-nowrap">
                        Gratuita
                    </span>
                </div>

                {/* Griglia metadati */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 border-t border-white/5">
                    {sentenza.data_deposito && (
                        <div>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Deposito</p>
                            <p className="font-body text-sm text-nebbia/70 flex items-center gap-2">
                                <Calendar size={12} className="text-nebbia/30" />
                                {formatData(sentenza.data_deposito)}
                            </p>
                        </div>
                    )}
                    {sentenza.data_emissione && (
                        <div>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Emissione</p>
                            <p className="font-body text-sm text-nebbia/70 flex items-center gap-2">
                                <Calendar size={12} className="text-nebbia/30" />
                                {formatData(sentenza.data_emissione)}
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
                    {sentenza.autorita_emittente && (
                        <div>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Codice autorità</p>
                            <p className="font-body text-sm text-nebbia/70">
                                {sentenza.autorita_emittente}
                            </p>
                        </div>
                    )}
                    {sentenza.esito && (
                        <div>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Esito</p>
                            <p className="font-body text-sm text-salvia">
                                {sentenza.esito}
                            </p>
                        </div>
                    )}
                    {sentenza.valore_controversia && (
                        <div>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Valore controversia</p>
                            <p className="font-body text-sm text-nebbia/70">
                                EUR {Number(sentenza.valore_controversia).toLocaleString('it-IT')}
                            </p>
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
                    elemento={{ tipo: 'sentenza_tributaria', id: sentenza.id }}
                    domanda={ricercaSave.domanda}
                    risposta={ricercaSave.testo}
                    metadati={{
                        fonte: 'tributario_bdgt_mef',
                        sentenza_id: sentenza.id,
                        organo: sentenza.organo,
                        numero: sentenza.numero,
                        anno: sentenza.anno,
                        ts: new Date().toISOString(),
                    }}
                    ricercaIdEsterno={ricercaSalvataId}
                    onRicercaCreata={setRicercaSalvataId}
                />
                {sentenza.fonte_url && (
                    <a
                        href={sentenza.fonte_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-white/10 text-nebbia/60 font-body text-sm hover:border-oro/30 hover:text-oro transition-colors"
                    >
                        <ExternalLink size={13} /> Vedi sul portale MEF
                    </a>
                )}
            </div>

            {/* Oggetto */}
            {sentenza.oggetto && (
                <div className="bg-slate border border-white/5 p-6">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">Oggetto della controversia</p>
                    <p className="font-body text-sm text-nebbia/80 leading-relaxed">{sentenza.oggetto}</p>
                </div>
            )}

            {/* Principio di diritto */}
            {sentenza.principio_diritto && (
                <div
                    id="principio-diritto"
                    className={
                        focus === 'principio'
                            ? "bg-slate border-2 border-oro/60 p-6 shadow-lg shadow-oro/10 animate-pulse-once"
                            : "bg-slate border border-white/5 p-6"
                    }
                >
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">
                            Principio di diritto / Motivazione
                        </p>
                        {focus === 'principio' && (
                            <span className="font-body text-[10px] text-oro border border-oro/40 px-2 py-0.5 bg-oro/10 uppercase tracking-wider">
                                Sezione di interesse
                            </span>
                        )}
                    </div>
                    <p className="font-body text-sm text-nebbia/80 leading-relaxed whitespace-pre-line">
                        {sentenza.principio_diritto}
                    </p>
                </div>
            )}

            {/* Materia / parole chiave */}
            {(sentenza.materia || sentenza.materia_classificazione) && (
                <div className="bg-slate border border-white/5 p-6">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">Materia</p>
                    {sentenza.materia && (
                        <p className="font-body text-sm text-nebbia/70 leading-relaxed">{sentenza.materia}</p>
                    )}
                    {sentenza.materia_classificazione && (
                        <p className="font-body text-xs text-nebbia/40 mt-1">
                            Classificazione: {sentenza.materia_classificazione}
                        </p>
                    )}
                </div>
            )}

            {/* Abstract */}
            {sentenza.abstract_sentenza && (
                <div className="bg-slate border border-white/5 p-6">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">Abstract</p>
                    <p className="font-body text-sm text-nebbia/80 leading-relaxed whitespace-pre-line">
                        {sentenza.abstract_sentenza}
                    </p>
                </div>
            )}

            {/* Testo completo (espandibile) */}
            {sentenza.testo_completo && (
                <div className="bg-slate border border-white/5 p-6">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest">Testo completo</p>
                        <button
                            onClick={() => setTestoEspanso(v => !v)}
                            className="font-body text-xs text-oro hover:text-oro/80 transition-colors"
                        >
                            {testoEspanso ? 'Nascondi' : 'Mostra'}
                        </button>
                    </div>
                    {testoEspanso && (
                        <div className="font-body text-sm text-nebbia/75 leading-relaxed whitespace-pre-line max-h-[600px] overflow-y-auto pr-2">
                            {sentenza.testo_completo}
                        </div>
                    )}
                    {!testoEspanso && (
                        <p className="font-body text-xs text-nebbia/30 italic">
                            ({sentenza.testo_completo.length.toLocaleString('it-IT')} caratteri)
                        </p>
                    )}
                </div>
            )}

            {/* Spese di giudizio */}
            {sentenza.flag_spese_giudizio && (
                <div className="bg-slate border border-white/5 p-6">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-3">Spese di giudizio</p>
                    {sentenza.spese_giudizio_desc && (
                        <p className="font-body text-sm text-nebbia/70 leading-relaxed">{sentenza.spese_giudizio_desc}</p>
                    )}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        {sentenza.importo_spese_parte != null && (
                            <div>
                                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Spese parte</p>
                                <p className="font-body text-sm text-nebbia/70">
                                    EUR {Number(sentenza.importo_spese_parte).toLocaleString('it-IT')}
                                </p>
                            </div>
                        )}
                        {sentenza.importo_spese_ufficio != null && (
                            <div>
                                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1">Spese ufficio</p>
                                <p className="font-body text-sm text-nebbia/70">
                                    EUR {Number(sentenza.importo_spese_ufficio).toLocaleString('it-IT')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Vincoli AI — informativa */}
            <div className="bg-petrolio/40 border border-white/5 px-4 py-3 flex items-start gap-3">
                <AlertCircle size={12} className="text-nebbia/40 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                        Questa sentenza è soggetta a <strong className="text-nebbia/70">licenza CC BY-NC 3.0 IT</strong>:
                        può essere consultata e citata, ma il suo contenuto non può essere rielaborato per scopi commerciali
                        né dato in pasto a sistemi di AI generativa per produrre testi derivati.
                    </p>
                </div>
            </div>

            {/* Attribuzione finale (richiesta dalla licenza CC BY-NC) */}
            <div className="bg-slate border border-white/5 p-4">
                <p className="font-body text-[11px] text-nebbia/40 leading-relaxed">
                    <strong className="text-nebbia/60">Fonte:</strong> Ministero dell'Economia e delle Finanze &mdash;
                    Banca Dati Giurisprudenza Tributaria
                    {sentenza.fonte_url && (
                        <> &middot; <a href={sentenza.fonte_url} target="_blank" rel="noopener noreferrer" className="text-oro hover:underline">{sentenza.fonte_url}</a></>
                    )}
                </p>
                <p className="font-body text-[11px] text-nebbia/40 leading-relaxed mt-1">
                    Licenza: <a href="https://creativecommons.org/licenses/by-nc/3.0/it/" target="_blank" rel="noopener noreferrer" className="text-oro hover:underline">CC BY-NC 3.0 IT</a>
                </p>
                {sentenza.attribuzione_testo && (
                    <p className="font-body text-[11px] text-nebbia/40 leading-relaxed mt-1 italic">
                        {sentenza.attribuzione_testo}
                    </p>
                )}
            </div>

        </div>
    )
}