// src/pages/SentenzaDettaglio.jsx
// Pagina dettaglio unificata:
//   - fonte='lexum'    -> legge da giurisprudenza (gratuita per abbonati)
//   - fonte='avvocato' -> legge da sentenze (paywall se non acquistata)
// Usata da route: /banca-dati/lexum/:id e /banca-dati/avvocato/:id

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { BackButton, PageHeader, Badge } from '@/components/shared'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import EtichetteAssegnate from '@/components/EtichetteAssegnate'
import {
    FileText, Calendar, Gavel, BookOpen, Scale,
    AlertCircle, CheckCircle, Lock, Search, Save,
    Download, ExternalLink, Loader2, Landmark,
    Sparkles, X
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function titoloCompatto(s) {
    const parti = [s.organo, s.sezione, s.numero && `n. ${s.numero}`, s.anno].filter(Boolean)
    return parti.join(' · ') || 'Sentenza'
}

function labelTipoProvvedimento(t) {
    const map = {
        sentenza: 'Sentenza',
        ordinanza: 'Ordinanza',
        ordinanza_interlocutoria: 'Ord. interlocutoria',
        decreto_presidenziale: 'Decreto presidenziale',
        rassegna: 'Rassegna',
        relazione: 'Relazione',
    }
    return map[t] ?? t
}

// ═══════════════════════════════════════════════════════════════
// AGGIUNGI A PRATICA (riuso del pattern di Sentenze.jsx)
// ═══════════════════════════════════════════════════════════════
function AggiungiAPratica({ sentenza, sorgente }) {
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
            const titolo = titoloCompatto(sentenza)
            await supabase.from('note_interne').insert({
                pratica_id: pratica.id,
                autore_id: user.id,
                tipo: sorgente === 'lexum' ? 'sentenza_giurisprudenza' : 'sentenza_acquistata',
                testo: sentenza.principio_diritto ?? '',
                metadati: {
                    domanda: `Sentenza: ${titolo}`,
                    sentenza_id: sentenza.id,
                    sorgente,
                    oggetto: sentenza.oggetto,
                    organo: sentenza.organo,
                    anno: sentenza.anno,
                    categorie_lex: sentenza.categorie_lex,
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
// PAYWALL CARD — mostrato solo per sentenze avvocati non acquistate
// ═══════════════════════════════════════════════════════════════
function PaywallCard({ sentenza, prezzo, prodottoId, onAcquista }) {
    const [processando, setProcessando] = useState(false)
    const [errore, setErrore] = useState(null)

    async function acquista() {
        if (!prodottoId) {
            setErrore('Prodotto non configurato. Contatta l\'assistenza.')
            return
        }
        setProcessando(true); setErrore(null)
        try {
            const basePath = window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'

            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prodotto_id: prodottoId,
                        metadata: {
                            sentenza_id: sentenza.id,
                            tipo: 'accesso_sentenza',
                        },
                        success_url: `${window.location.origin}${basePath}/avvocato/${sentenza.id}?acquistato=1`,
                        cancel_url: window.location.href,
                    })
                }
            )
            const json = await res.json()
            if (!json.ok || !json.checkout_url) {
                throw new Error(json.error ?? 'Errore generazione checkout')
            }
            window.location.href = json.checkout_url
        } catch (e) {
            setErrore(e.message)
            setProcessando(false)
        }
    }

    return (
        <div className="bg-gradient-to-br from-oro/10 to-slate border border-oro/30 p-6 space-y-4">
            <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 bg-oro/10 border border-oro/30 flex items-center justify-center">
                    <Lock size={18} className="text-oro" />
                </div>
                <div className="min-w-0">
                    <p className="font-display text-lg font-medium text-nebbia mb-1">Contenuto riservato</p>
                    <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                        Acquista l'accesso a questa sentenza per leggere il principio di diritto completo, il testo integrale e scaricare il PDF.
                    </p>
                </div>
            </div>

            <div className="border-t border-oro/10 pt-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest">Prezzo accesso</p>
                        <p className="font-display text-3xl font-semibold text-oro mt-1">EUR {prezzo}</p>
                        <p className="font-body text-xs text-nebbia/30 mt-0.5">Pagamento una tantum</p>
                    </div>
                    <button
                        onClick={acquista}
                        disabled={processando}
                        className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
                    >
                        {processando
                            ? <><Loader2 size={14} className="animate-spin" /> Redirect...</>
                            : <>Acquista accesso</>
                        }
                    </button>
                </div>
                {errore && (
                    <p className="font-body text-xs text-red-400 mt-3 flex items-center gap-1.5">
                        <AlertCircle size={11} /> {errore}
                    </p>
                )}
            </div>

            <p className="font-body text-xs text-nebbia/30 border-t border-oro/10 pt-3">
                Pagamento sicuro via Stripe. L'accesso e permanente una volta acquistato.
            </p>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// CATEGORIE HELPER — trasforma slug in label leggibile
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
export default function SentenzaDettaglio({ fonte = 'lexum' }) {
    const { id } = useParams()
    const navigate = useNavigate()
    const mappaCategorie = useCategorieMap()

    const [sentenza, setSentenza] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState(null)
    const [refreshEtichette, setRefreshEtichette] = useState(0)

    // Paywall state (solo per fonte='avvocato')
    const [haAccesso, setHaAccesso] = useState(false)
    const [isAutore, setIsAutore] = useState(false)
    const [prezzo, setPrezzo] = useState(15)
    const [prodottoId, setProdottoId] = useState(null)

    // PDF signed URL
    const [pdfUrl, setPdfUrl] = useState(null)

    // Notifica acquisto appena completato (da redirect Stripe)
    const [appenaAcquistata, setAppenaAcquistata] = useState(false)

    useEffect(() => {
        async function carica() {
            setLoading(true); setErrore(null)

            try {
                // 1. Carica la sentenza dalla tabella corretta
                let sentenzaData = null

                if (fonte === 'lexum') {
                    const { data, error } = await supabase
                        .from('giurisprudenza')
                        .select('*')
                        .eq('id', id)
                        .maybeSingle()
                    if (error) throw new Error(error.message)
                    sentenzaData = data
                } else {
                    const { data, error } = await supabase
                        .from('sentenze')
                        .select('*, autore:autore_id(nome, cognome)')
                        .eq('id', id)
                        .maybeSingle()
                    if (error) throw new Error(error.message)
                    sentenzaData = data
                }

                if (!sentenzaData) {
                    setErrore('Sentenza non trovata')
                    return
                }

                setSentenza(sentenzaData)

                // 2. Logica di accesso
                const { data: { user } } = await supabase.auth.getUser()

                if (fonte === 'lexum') {
                    // Corpus Lexum: accesso libero per utenti autenticati
                    setHaAccesso(true)
                } else {
                    // Sentenza avvocato: check se autore o acquirente
                    const amIAutore = user && sentenzaData.autore_id === user.id
                    const amIStudioMembro = user && sentenzaData.studio_id === user.id

                    // Sentenza in revisione o sospesa: solo autore/studio possono vederla
                    if (sentenzaData.stato !== 'pubblica') {
                        if (!amIAutore && !amIStudioMembro) {
                            setErrore(
                                sentenzaData.stato === 'in_revisione'
                                    ? 'Questa sentenza e in attesa di approvazione e non e ancora disponibile'
                                    : 'Questa sentenza non e disponibile'
                            )
                            setLoading(false)
                            return
                        }
                    }

                    if (amIAutore || amIStudioMembro) {
                        setIsAutore(true)
                        setHaAccesso(true)
                    } else {
                        // Check accessi_sentenze
                        const { data: accesso } = await supabase
                            .from('accessi_sentenze')
                            .select('id')
                            .eq('sentenza_id', id)
                            .eq('acquirente_id', user?.id)
                            .maybeSingle()

                        setHaAccesso(!!accesso)
                    }

                    // Carica prezzo e prodotto per eventuale checkout
                    const { data: prod } = await supabase
                        .from('prodotti')
                        .select('id, prezzo')
                        .eq('tipo', 'accesso_singolo')
                        .eq('attivo', true)
                        .maybeSingle()
                    if (prod) {
                        setPrezzo(prod.prezzo)
                        setProdottoId(prod.id)
                    }
                }

                // 3. Signed URL del PDF (solo se ha accesso e il file esiste davvero)
                // 3. Signed URL del PDF (solo se ha accesso e il file esiste davvero)
                if (sentenzaData.pdf_storage_path) {
                    const bucket = fonte === 'lexum' ? 'giurisprudenza-pdf' : 'sentenze'
                    // Verifica esistenza prima di chiedere la signed URL (evita 404 in console)
                    const lastSlash = sentenzaData.pdf_storage_path.lastIndexOf('/')
                    const folder = lastSlash > 0 ? sentenzaData.pdf_storage_path.slice(0, lastSlash) : ''
                    const filename = lastSlash > 0 ? sentenzaData.pdf_storage_path.slice(lastSlash + 1) : sentenzaData.pdf_storage_path

                    const { data: listData } = await supabase.storage
                        .from(bucket)
                        .list(folder, { search: filename, limit: 1 })

                    const fileExists = listData && listData.some(f => f.name === filename)

                    if (fileExists) {
                        const { data: signed } = await supabase.storage
                            .from(bucket)
                            .createSignedUrl(sentenzaData.pdf_storage_path, 3600)
                        setPdfUrl(signed?.signedUrl ?? null)
                    } else {
                        setPdfUrl(null)
                    }
                }

            } catch (e) {
                setErrore(e.message)
            } finally {
                setLoading(false)
            }
        }

        carica()

        // Controlla se arriva da redirect Stripe con ?acquistato=1
        const params = new URLSearchParams(window.location.search)
        if (params.get('acquistato') === '1') {
            setAppenaAcquistata(true)
            // Pulisci l'URL senza reload
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [id, fonte])

    // ── RENDER ──
    if (loading) {
        return (
            <div className="flex items-center justify-center py-40">
                <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
            </div>
        )
    }

    if (errore) {
        return (
            <div className="space-y-5">
                <BackButton to={window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'} label="Banca dati" />
                <div className="bg-slate border border-red-500/20 p-8 flex flex-col items-center text-center gap-3">
                    <AlertCircle size={28} className="text-red-400" />
                    <p className="font-body text-sm text-red-400">{errore}</p>
                </div>
            </div>
        )
    }

    if (!sentenza) return null

    const s = sentenza
    const titoloIntestazione = titoloCompatto(s)
    const dataVisibile = s.data_pubblicazione ?? s.data_deposito
    const gratuita = fonte === 'lexum'
    const mostraTestoIntegrale = haAccesso

    // Teaser del principio di diritto se paywall
    const principioVisibile = mostraTestoIntegrale
        ? s.principio_diritto
        : (s.principio_diritto ? s.principio_diritto.slice(0, 200).trim() + '...' : null)

    return (
        <div className="space-y-5">
            <BackButton to={window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'} label="Banca dati" />

            {/* Notifica acquisto avvenuto */}
            {appenaAcquistata && (
                <div className="flex items-center gap-3 p-4 bg-salvia/10 border border-salvia/30">
                    <CheckCircle size={18} className="text-salvia shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-salvia font-medium">Acquisto completato</p>
                        <p className="font-body text-xs text-salvia/70 mt-0.5">Hai ora accesso permanente a questa sentenza.</p>
                    </div>
                    <button onClick={() => setAppenaAcquistata(false)} className="text-salvia/50 hover:text-salvia">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Notifica autore */}
            {isAutore && fonte === 'avvocato' && s.stato === 'pubblica' && (
                <div className="p-3 bg-oro/5 border border-oro/20">
                    <p className="font-body text-xs text-oro/80">
                        Stai visualizzando una sentenza del tuo studio — hai accesso completo.
                    </p>
                </div>
            )}

            {/* Notifica sentenza in revisione (solo autore/studio) */}
            {isAutore && fonte === 'avvocato' && s.stato === 'in_revisione' && (
                <div className="p-4 bg-amber-900/10 border border-amber-500/30">
                    <p className="font-body text-sm text-amber-400 font-medium mb-1">In attesa di approvazione</p>
                    <p className="font-body text-xs text-amber-400/70 leading-relaxed">
                        Questa sentenza e stata inviata ed e in attesa di approvazione dall'amministratore.
                        Non e ancora visibile agli altri avvocati nella banca dati.
                    </p>
                </div>
            )}

            {/* Notifica sentenza sospesa (solo autore/studio) */}
            {isAutore && fonte === 'avvocato' && s.stato === 'sospesa' && (
                <div className="p-4 bg-red-900/10 border border-red-500/30">
                    <p className="font-body text-sm text-red-400 font-medium mb-1">Sentenza sospesa</p>
                    <p className="font-body text-xs text-red-400/70 leading-relaxed">
                        Questa sentenza e stata sospesa dall'amministratore e non e visibile nella banca dati.
                        Contatta l'assistenza per maggiori informazioni.
                    </p>
                </div>
            )}

            {/* Intestazione */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                        <p className="section-label !m-0">{gratuita ? 'Corpus Lexum' : 'Contributo avvocato'}</p>
                        {s.tipo_provvedimento && (
                            <span className="font-body text-[10px] text-nebbia/50 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">
                                {labelTipoProvvedimento(s.tipo_provvedimento)}
                            </span>
                        )}
                        {gratuita ? (
                            <span className="font-body text-xs text-salvia border border-salvia/30 px-2 py-0.5 bg-salvia/5">
                                Gratuita
                            </span>
                        ) : !haAccesso ? (
                            <span className="font-body text-xs text-oro border border-oro/30 px-2 py-0.5 bg-oro/5 flex items-center gap-1">
                                <Lock size={10} /> A pagamento
                            </span>
                        ) : (
                            <span className="font-body text-xs text-salvia border border-salvia/30 px-2 py-0.5 bg-salvia/5 flex items-center gap-1">
                                <CheckCircle size={10} /> Acquistata
                            </span>
                        )}
                    </div>
                    <h1 className="font-body text-xl font-medium text-nebbia leading-snug">{s.oggetto ?? 'Sentenza'}</h1>
                    <p className="font-body text-sm text-nebbia/40 mt-2">{titoloIntestazione}</p>
                    {dataVisibile && (
                        <p className="font-body text-xs text-nebbia/30 mt-1 flex items-center gap-1.5">
                            <Calendar size={11} /> Pubblicata il {new Date(dataVisibile).toLocaleDateString('it-IT')}
                        </p>
                    )}
                    {fonte === 'avvocato' && s.autore && (
                        <p className="font-body text-xs text-nebbia/40 mt-2">
                            Caricata da <span className="text-nebbia/60 font-medium">Avv. {s.autore.nome} {s.autore.cognome}</span>
                        </p>
                    )}
                </div>

                {haAccesso && (
                    <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <AggiungiAPratica sentenza={s} sorgente={fonte} />
                            <AggiungiAEtichetta
                                elemento={{ tipo: 'sentenza', id: s.id }}
                                onCambio={() => setRefreshEtichette(k => k + 1)}
                            />
                        </div>
                        <EtichetteAssegnate
                            elemento={{ tipo: 'sentenza', id: s.id }}
                            refreshKey={refreshEtichette}
                        />
                    </div>
                )}
            </div>

            {/* Paywall (solo se sentenza avvocato + non acquistata + non autore) */}
            {!haAccesso && fonte === 'avvocato' && (
                <PaywallCard sentenza={s} prezzo={prezzo} prodottoId={prodottoId} />
            )}

            {/* Principio di diritto */}
            {principioVisibile && (
                <div className="bg-slate border border-white/5 p-5 relative">
                    <div className="flex items-center gap-2 mb-3">
                        <Scale size={13} className="text-oro/60" />
                        <p className="section-label !m-0">Principio di diritto</p>
                    </div>
                    <p className="font-body text-sm text-nebbia/75 leading-relaxed whitespace-pre-line">
                        {principioVisibile}
                    </p>
                    {!mostraTestoIntegrale && s.principio_diritto && s.principio_diritto.length > 200 && (
                        <div className="mt-3 pt-3 border-t border-oro/10">
                            <p className="font-body text-xs text-oro/70 flex items-center gap-1.5">
                                <Lock size={11} /> Continua la lettura dopo l'acquisto
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Categorie Lex */}
            {(s.categorie_lex ?? []).length > 0 && (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">Categorie</p>
                    <div className="flex flex-wrap gap-2">
                        {s.categorie_lex.map(c => (
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

            {/* Griglia: Materia + Parole chiave */}
            {((s.materia ?? []).length > 0 || (s.parole_chiave ?? []).length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {(s.materia ?? []).length > 0 && (
                        <div className="bg-slate border border-white/5 p-5">
                            <p className="section-label mb-3">Materia</p>
                            <div className="flex flex-wrap gap-2">
                                {s.materia.map(m => (
                                    <span key={m} className="font-body text-xs px-2.5 py-1 bg-petrolio border border-white/10 text-nebbia/60">
                                        {m}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {(s.parole_chiave ?? []).length > 0 && (
                        <div className="bg-slate border border-white/5 p-5">
                            <p className="section-label mb-3">Parole chiave</p>
                            <div className="flex flex-wrap gap-2">
                                {s.parole_chiave.map(p => (
                                    <span key={p} className="font-body text-xs px-2.5 py-1 bg-petrolio border border-white/10 text-nebbia/60">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Norme richiamate */}
            {(s.norme_richiamate ?? []).length > 0 && (
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <BookOpen size={13} className="text-oro/60" />
                        <p className="section-label !m-0">Norme richiamate</p>
                    </div>
                    <div className="space-y-1.5">
                        {s.norme_richiamate.map((n, i) => (
                            <p key={i} className="font-mono text-xs text-nebbia/60 px-3 py-2 bg-petrolio/50 border-l-2 border-oro/20">
                                {n}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* CELEX UE correlati */}
            {(s.celex_correlati ?? []).length > 0 && (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">Riferimenti UE</p>
                    <div className="space-y-1.5">
                        {s.celex_correlati.map((c, i) => (
                            <p key={i} className="font-mono text-xs text-nebbia/60 px-3 py-2 bg-petrolio/50 border-l-2 border-salvia/20">
                                {c}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* Collegio */}
            {(s.presidente || s.relatore || s.estensore) && (
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Gavel size={13} className="text-oro/60" />
                        <p className="section-label !m-0">Collegio</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {s.presidente && (
                            <div>
                                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Presidente</p>
                                <p className="font-body text-sm text-nebbia/70">{s.presidente}</p>
                            </div>
                        )}
                        {s.relatore && (
                            <div>
                                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Relatore</p>
                                <p className="font-body text-sm text-nebbia/70">{s.relatore}</p>
                            </div>
                        )}
                        {s.estensore && (
                            <div>
                                <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Estensore</p>
                                <p className="font-body text-sm text-nebbia/70">{s.estensore}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Testo integrale (dietro paywall) */}
            {mostraTestoIntegrale && s.testo_integrale && (
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText size={13} className="text-oro/60" />
                        <p className="section-label !m-0">Testo integrale</p>
                    </div>
                    <div className="bg-petrolio/60 border border-white/5 p-5 max-h-[600px] overflow-y-auto">
                        <p className="font-body text-sm text-nebbia/70 whitespace-pre-line leading-relaxed">
                            {s.testo_integrale}
                        </p>
                    </div>
                </div>
            )}

            {/* Documento PDF (dietro paywall) — mostrato solo se c'e il PDF */}
            {mostraTestoIntegrale && pdfUrl && (
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
                        title={s.oggetto ?? 'Sentenza'}
                        className="w-full border border-white/5"
                        style={{ height: 700 }}
                    />
                </div>
            )}

            {/* Fonte originale (solo giurisprudenza Lexum) */}
            {fonte === 'lexum' && s.url_originale && (
                <div className="bg-slate border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Landmark size={13} className="text-oro/60" />
                        <p className="section-label !m-0">Fonte ufficiale</p>
                    </div>
                    <a
                        href={s.url_originale}
                        target="_blank"
                        rel="noreferrer"
                        className="font-body text-sm text-salvia hover:text-salvia/80 flex items-center gap-1.5 transition-colors break-all"
                    >
                        <ExternalLink size={12} className="shrink-0" />
                        {s.url_originale}
                    </a>
                    <p className="font-body text-xs text-nebbia/30 mt-2">
                        Questa sentenza e parte del corpus ufficiale Lexum importato da fonti istituzionali.
                    </p>
                </div>
            )}

            {/* Footer info */}
            <div className="pt-4 border-t border-white/5">
                <p className="font-body text-xs text-nebbia/25 text-center">
                    ID: {s.id}
                    {fonte === 'avvocato' && s.accessi != null && ` · ${s.accessi} accessi totali`}
                </p>
            </div>
        </div>
    )
}