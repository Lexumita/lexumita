// src/pages/BancaDati.jsx

import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/shared'
import { Search, Eye, FileText, Lock, CheckCircle, BookOpen, X, AlertCircle, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// HOOK — categorie dal DB
// ─────────────────────────────────────────────────────────────
function useCategoryTree() {
    const [categorie, setCategorie] = useState([])
    const [contatori, setContatori] = useState({})

    useEffect(() => {
        async function carica() {
            const { data: cats } = await supabase.from('categorie').select('id, nome').order('nome')
            const { data: sotto } = await supabase.from('sotto_categorie').select('id, nome, categoria_id').order('nome')
            const { data: tipi } = await supabase.from('tipologie').select('id, nome, sotto_categoria_id').order('nome')
            const { data: sent } = await supabase.from('sentenze').select('categoria, sotto_categoria, tipologia').eq('stato', 'pubblica')

            // Contatori
            const cnt = {}
            for (const s of sent ?? []) {
                cnt[s.categoria] = (cnt[s.categoria] ?? 0) + 1
                if (s.sotto_categoria) cnt[s.sotto_categoria] = (cnt[s.sotto_categoria] ?? 0) + 1
                if (s.tipologia) cnt[s.tipologia] = (cnt[s.tipologia] ?? 0) + 1
            }
            setContatori(cnt)

            const albero = (cats ?? []).map(c => ({
                ...c,
                count: cnt[c.nome] ?? 0,
                sotto_categorie: (sotto ?? [])
                    .filter(s => s.categoria_id === c.id)
                    .map(s => ({
                        ...s,
                        count: cnt[s.nome] ?? 0,
                        tipologie: (tipi ?? [])
                            .filter(t => t.sotto_categoria_id === s.id)
                            .map(t => ({ ...t, count: cnt[t.nome] ?? 0 }))
                    }))
            }))
            setCategorie(albero)
        }
        carica()
    }, [])

    return { categorie, contatori }
}

// ─────────────────────────────────────────────────────────────
// CARD SENTENZA
// ─────────────────────────────────────────────────────────────
function CardSentenza({ s, acquistata, prezzo }) {
    return (
        <div className={`bg-slate border p-5 transition-all ${acquistata ? 'border-salvia/20' : 'border-white/5 hover:border-oro/20'}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">
                        {s.categoria}{s.sotto_categoria ? ` › ${s.sotto_categoria}` : ''}{s.tipologia ? ` › ${s.tipologia}` : ''}
                    </p>
                    <h3 className="font-display text-lg font-semibold text-nebbia mb-1">{s.titolo}</h3>
                    <p className="font-body text-xs text-nebbia/40 mb-2">
                        {s.autore?.nome} {s.autore?.cognome} · {s.tribunale} · {s.anno}
                    </p>
                    {s.descrizione && (
                        <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-3 line-clamp-2">{s.descrizione}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                        {(s.tags ?? []).map(t => (
                            <span key={t} className="font-body text-[10px] px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/40">{t}</span>
                        ))}
                    </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    {acquistata ? (
                        <>
                            <div className="flex items-center gap-1.5 text-salvia">
                                <CheckCircle size={14} />
                                <span className="font-body text-xs">Acquistata</span>
                            </div>
                            <Link to={`/banca-dati/${s.id}`} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
                                <Eye size={12} /> Leggi
                            </Link>
                        </>
                    ) : (
                        <>
                            <div>
                                <p className="font-display text-2xl font-semibold text-oro">EUR {prezzo}</p>
                                <p className="font-body text-xs text-nebbia/30">accesso singolo</p>
                            </div>
                            <Link to={`/banca-dati/${s.id}`} className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5">
                                <Eye size={12} /> Anteprima
                            </Link>
                            <Link to={`/banca-dati/${s.id}/acquista`} className="btn-primary text-xs py-2 px-4">
                                Acquista accesso
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

function AggiungiAPratica({ sentenza }) {
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
                tipo: 'sentenza_acquistata',
                testo: sentenza.ocr_raw_text ?? '',
                metadati: {
                    domanda: `Sentenza: ${sentenza.titolo}`,
                    sentenza_id: sentenza.id,
                    titolo: sentenza.titolo,
                    tribunale: sentenza.tribunale,
                    anno: sentenza.anno,
                    categoria: sentenza.categoria,
                    ts: new Date().toISOString(),
                }
            })
            setSalvato(pratica.titolo)
            setAperto(false)
        } catch (e) {
            setErrore(e.message)
        } finally { setSalvando(false) }
    }

    if (salvato) return (
        <p className="font-body text-sm text-salvia flex items-center gap-2">
            <CheckCircle size={14} /> Sentenza aggiunta alla pratica "{salvato}"
        </p>
    )

    return (
        <div>
            <button
                onClick={() => setAperto(!aperto)}
                className="btn-secondary text-sm flex items-center gap-2"
            >
                <FileText size={13} /> {aperto ? 'Annulla' : 'Aggiungi a pratica'}
            </button>

            {aperto && (
                <div className="mt-3 bg-slate border border-white/10 p-4 space-y-3">
                    <p className="font-body text-xs text-nebbia/50">Cerca la pratica a cui aggiungere questa sentenza:</p>
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
                        <button
                            key={p.id}
                            onClick={() => aggiungi(p)}
                            disabled={salvando}
                            className="w-full text-left px-3 py-2.5 bg-petrolio border border-white/5 hover:border-oro/30 transition-colors"
                        >
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

// ─────────────────────────────────────────────────────────────
// CATALOGO
// ─────────────────────────────────────────────────────────────
export function BancaDatiCatalogo() {
    const { categorie, contatori } = useCategoryTree()
    const [tab, setTab] = useState('cerca')
    const [catSel, setCatSel] = useState(null)
    const [sottoSel, setSottoSel] = useState(null)
    const [tipoSel, setTipoSel] = useState(null)
    const [search, setSearch] = useState('')
    const [cercato, setCercato] = useState(false)
    const [risultati, setRisultati] = useState([])
    const [acquistate, setAcquistate] = useState([])
    const [acquistatiIds, setAcquistatiIds] = useState(new Set())
    const [prezzoAccesso, setPrezzoAccesso] = useState(15)
    const [loading, setLoading] = useState(false)
    const [meId, setMeId] = useState(null)

    useEffect(() => {
        if (tipoSel) handleCerca()
    }, [tipoSel])

    const catObj = categorie.find(c => c.nome === catSel)
    const sottoList = catObj?.sotto_categorie ?? []
    const sottoObj = sottoList.find(s => s.nome === sottoSel)
    const tipoList = sottoObj?.tipologie ?? []

    const [domandaLex, setDomandaLex] = useState('')
    const [cercandoLex, setCercandoLex] = useState(false)
    const [rispostaLex, setRispostaLex] = useState(null)
    const [erroreLex, setErroreLex] = useState(null)
    const [modalita, setModalita] = useState('tradizionale') // 'tradizionale' | 'lex'

    useEffect(() => {
        async function caricaContesto() {
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)

            const { data: acc } = await supabase
                .from('accessi_sentenze').select('sentenza_id').eq('acquirente_id', user.id)
            const ids = new Set((acc ?? []).map(a => a.sentenza_id))
            setAcquistatiIds(ids)

            if (ids.size > 0) {
                const { data: sent } = await supabase
                    .from('sentenze')
                    .select('id, titolo, categoria, sotto_categoria, tipologia, anno, tribunale, descrizione, tags, autore:autore_id(nome, cognome)')
                    .in('id', [...ids]).eq('stato', 'pubblica')
                setAcquistate(sent ?? [])
            }

            const { data: prod } = await supabase
                .from('prodotti').select('prezzo').eq('tipo', 'accesso_singolo').eq('attivo', true).single()
            if (prod) setPrezzoAccesso(prod.prezzo)
        }
        caricaContesto()
    }, [])
    async function handleCerca() {
        setLoading(true)
        let query = supabase
            .from('sentenze')
            .select('id, titolo, categoria, sotto_categoria, tipologia, anno, tribunale, descrizione, tags, autore:autore_id(nome, cognome)')
            .eq('stato', 'pubblica')

        if (catSel) query = query.eq('categoria', catSel)
        if (sottoSel) query = query.eq('sotto_categoria', sottoSel)
        if (tipoSel) query = query.eq('tipologia', tipoSel)
        if (search.trim()) {
            query = query.or(`titolo.ilike.%${search}%,descrizione.ilike.%${search}%`)
        }

        const { data } = await query.order('created_at', { ascending: false })
        setRisultati(data ?? [])
        setCercato(true)
        setLoading(false)
    }

    function handleReset() {
        setCatSel(null); setSottoSel(null); setTipoSel(null)
        setSearch(''); setCercato(false); setRisultati([])
    }

    async function cercaConLex() {
        if (!domandaLex.trim()) return
        setCercandoLex(true)
        setErroreLex(null)
        setRispostaLex(null)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-sentenze`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domanda: domandaLex }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            setRispostaLex(json)
            if (json.sentenze?.length > 0) setRisultati(json.sentenze)
            setCercato(true)
        } catch (e) {
            setErroreLex(e.message)
        } finally {
            setCercandoLex(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="section-label mb-2">Banca dati legale</p>
                <h1 className="font-display text-4xl font-light text-nebbia">Sentenze e giurisprudenza</h1>
                <p className="font-body text-sm text-nebbia/40 mt-1">
                    Accedi alle sentenze caricate dai professionisti. Ogni documento costa EUR {prezzoAccesso}.
                </p>
            </div>

            <div className="flex gap-0 border-b border-white/8">
                {[
                    { id: 'cerca', label: 'Cerca sentenze' },
                    { id: 'acquistati', label: `Acquistati (${acquistate.length})` },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-5 py-3 font-body text-sm border-b-2 transition-colors ${tab === t.id ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'
                            }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* TAB ACQUISTATI */}
            {tab === 'acquistati' && (
                <div className="space-y-4">
                    {acquistate.length === 0 ? (
                        <div className="py-12 text-center">
                            <BookOpen size={36} className="text-nebbia/15 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/30">Non hai ancora acquistato nessuna sentenza</p>
                            <button onClick={() => setTab('cerca')} className="btn-secondary text-sm mt-4">Sfoglia il catalogo</button>
                        </div>
                    ) : acquistate.map(s => (
                        <CardSentenza key={s.id} s={s} acquistata={true} prezzo={prezzoAccesso} />
                    ))}
                </div>
            )}

            {tab === 'cerca' && (
                <div className="space-y-5">
                    <div className="bg-slate border border-white/5 p-5 space-y-4">

                        {/* Switch modalità */}
                        <div className="flex gap-1 bg-petrolio border border-white/5 p-1 w-fit">
                            <button
                                onClick={() => setModalita('tradizionale')}
                                className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${modalita === 'tradizionale' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}
                            >
                                <Search size={13} /> Ricerca tradizionale
                            </button>
                            <button
                                onClick={() => setModalita('lex')}
                                className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${modalita === 'lex' ? 'bg-salvia/10 text-salvia border border-salvia/30' : 'text-nebbia/40 hover:text-nebbia'}`}
                            >
                                <Sparkles size={13} /> Cerca con Lex
                            </button>
                        </div>

                        {/* Ricerca Lex */}
                        {modalita === 'lex' && (
                            <div className="space-y-3">
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                                    Descrivi il caso o la questione legale — Lex cercherà le sentenze più pertinenti nella banca dati.
                                </p>
                                <textarea
                                    rows={3}
                                    placeholder="Es. Revoca patente dopo condanna per omicidio stradale..."
                                    value={domandaLex}
                                    onChange={e => setDomandaLex(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) cercaConLex() }}
                                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/25"
                                />
                                {erroreLex && (
                                    <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                                        <AlertCircle size={11} />{erroreLex}
                                    </p>
                                )}
                                <button
                                    onClick={cercaConLex}
                                    disabled={cercandoLex || !domandaLex.trim()}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40"
                                >
                                    {cercandoLex
                                        ? <><span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> Lex sta cercando...</>
                                        : <><Sparkles size={13} /> Cerca con Lex</>
                                    }
                                </button>
                                {rispostaLex?.ragionamento && (
                                    <div className="bg-slate border border-salvia/20 p-4 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={13} className="text-salvia" />
                                            <p className="font-body text-xs font-medium text-salvia">Analisi Lex</p>
                                        </div>
                                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">{rispostaLex.ragionamento}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Ricerca tradizionale */}
                        {modalita === 'tradizionale' && (
                            <>
                                {/* Campo cerca sempre visibile */}
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                                        <input
                                            placeholder="Cerca per titolo o massima..."
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleCerca()}
                                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                        />
                                    </div>
                                    <button onClick={handleCerca} className="btn-primary text-sm px-5">Cerca</button>
                                    <button onClick={handleReset} className="btn-secondary text-sm px-4 flex items-center gap-1">
                                        <X size={13} /> Reset
                                    </button>
                                </div>

                                {/* Filtri opzionali */}
                                <div>
                                    <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Categoria</label>
                                    <div className="flex flex-wrap gap-2">
                                        {categorie.map(c => (
                                            <button key={c.id}
                                                onClick={() => { setCatSel(catSel === c.nome ? null : c.nome); setSottoSel(null); setTipoSel(null); setCercato(false) }}
                                                className={`flex items-center gap-2 font-body text-sm px-4 py-2 border transition-all ${catSel === c.nome ? 'bg-oro/15 border-oro/40 text-oro' : 'border-white/10 text-nebbia/50 hover:border-oro/20'}`}>
                                                {c.nome}
                                                {c.count > 0 && <span className="font-body text-xs opacity-50">({c.count})</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {catSel && sottoList.length > 0 && (
                                    <div>
                                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Sotto-categoria</label>
                                        <div className="flex flex-wrap gap-2">
                                            {sottoList.map(s => (
                                                <button key={s.id}
                                                    onClick={() => { setSottoSel(sottoSel === s.nome ? null : s.nome); setTipoSel(null); setCercato(false) }}
                                                    className={`flex items-center gap-2 font-body text-sm px-4 py-2 border transition-all ${sottoSel === s.nome ? 'bg-oro/15 border-oro/40 text-oro' : 'border-white/10 text-nebbia/50 hover:border-oro/20'}`}>
                                                    {s.nome}
                                                    {s.count > 0 && <span className="font-body text-xs opacity-50">({s.count})</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {sottoSel && tipoList.length > 0 && (
                                    <div>
                                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Tipologia</label>
                                        <div className="flex flex-wrap gap-2">
                                            {tipoList.map(t => (
                                                <button key={t.id}
                                                    onClick={() => { setTipoSel(tipoSel === t.nome ? null : t.nome); setCercato(false) }}
                                                    className={`flex items-center gap-2 font-body text-sm px-4 py-2 border transition-all ${tipoSel === t.nome ? 'bg-oro/15 border-oro/40 text-oro' : 'border-white/10 text-nebbia/50 hover:border-oro/20'}`}>
                                                    {t.nome}
                                                    {t.count > 0 && <span className="font-body text-xs opacity-50">({t.count})</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                        </div>
                    )}

                    {cercato && !loading && (
                        <div className="space-y-3">
                            <p className="font-body text-xs text-nebbia/40">
                                {risultati.length} {risultati.length === 1 ? 'risultato' : 'risultati'}
                                {modalita === 'tradizionale' && <span className="text-nebbia/60"> per {catSel}{sottoSel ? ` › ${sottoSel}` : ''}{tipoSel ? ` › ${tipoSel}` : ''}</span>}
                            </p>
                            {risultati.length === 0 ? (
                                <div className="py-10 text-center">
                                    <p className="font-body text-sm text-nebbia/30">Nessuna sentenza trovata</p>
                                </div>
                            ) : risultati.map(s => (
                                <CardSentenza key={s.id} s={s} acquistata={acquistatiIds.has(s.id)} prezzo={prezzoAccesso} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// DETTAGLIO
// ─────────────────────────────────────────────────────────────
export function BancaDatiDettaglio() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [s, setS] = useState(null)
    const [acquistata, setAcquistata] = useState(false)
    const [pdfUrl, setPdfUrl] = useState(null)
    const [loading, setLoading] = useState(true)
    const [prezzoAccesso, setPrezzoAccesso] = useState(15)

    useEffect(() => {
        async function carica() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            const [{ data: sentenza }, { data: accesso }, { data: prod }] = await Promise.all([
                supabase.from('sentenze').select('*, autore:autore_id(nome, cognome)').eq('id', id).single(),
                supabase.from('accessi_sentenze').select('id').eq('sentenza_id', id).eq('acquirente_id', user.id).maybeSingle(),
                supabase.from('prodotti').select('prezzo').eq('tipo', 'accesso_singolo').eq('attivo', true).single(),
            ])

            setS(sentenza)
            setAcquistata(!!accesso)
            if (prod) setPrezzoAccesso(prod.prezzo)

            if (accesso && sentenza?.storage_path) {
                const { data } = await supabase.storage.from('sentenze').createSignedUrl(sentenza.storage_path, 3600)
                setPdfUrl(data?.signedUrl ?? null)
            }
            setLoading(false)
        }
        carica()
    }, [id])

    if (loading) return <div className="flex items-center justify-center py-40"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
    if (!s) return <div className="space-y-5"><button onClick={() => navigate(-1)} className="font-body text-xs text-nebbia/40 hover:text-oro">← Indietro</button><p className="font-body text-sm text-nebbia/40">Sentenza non trovata.</p></div>

    const cat = [s.categoria, s.sotto_categoria, s.tipologia].filter(Boolean).join(' › ')

    return (
        <div className="space-y-5 max-w-3xl mx-auto">
            <button onClick={() => navigate(-1)} className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors">← Indietro</button>

            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-2">{cat}</p>
                    <h1 className="font-display text-3xl font-light text-nebbia">{s.titolo}</h1>
                    <p className="font-body text-xs text-nebbia/40 mt-1">{s.autore?.nome} {s.autore?.cognome} · {s.tribunale} · {s.anno}</p>
                </div>
                {acquistata ? (
                    <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                        <div className="flex items-center gap-1.5 text-salvia">
                            <CheckCircle size={14} />
                            <span className="font-body text-sm">Acquistata</span>
                        </div>
                        <AggiungiAPratica sentenza={s} />
                    </div>
                ) : (
                    <Link to={`/banca-dati/${s.id}/acquista`} className="btn-primary text-sm shrink-0">
                        Acquista — EUR {prezzoAccesso}
                    </Link>
                )}
            </div>

            {(s.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {s.tags.map(t => <span key={t} className="font-body text-xs px-3 py-1 bg-petrolio border border-white/10 text-nebbia/50">{t}</span>)}
                </div>
            )}

            {s.descrizione && (
                <div className="bg-slate border border-white/5 p-5">
                    <p className="section-label mb-3">Massima</p>
                    <p className="font-body text-sm text-nebbia/60 leading-relaxed">{s.descrizione}</p>
                </div>
            )}

            <div className="bg-slate border border-white/5 p-5">
                <p className="section-label mb-4">Documento</p>
                {acquistata && pdfUrl ? (
                    <iframe src={pdfUrl} className="w-full rounded" style={{ height: 600 }} title={s.titolo} />
                ) : (
                    <div className="border border-dashed border-white/15 p-10 flex flex-col items-center justify-center text-center">
                        <Lock size={32} className="text-nebbia/15 mb-3" />
                        <p className="font-body text-sm text-nebbia/40 mb-1">Documento protetto</p>
                        <p className="font-body text-xs text-nebbia/25 mb-5">Acquista l'accesso per leggere il documento completo.</p>
                        <Link to={`/banca-dati/${s.id}/acquista`} className="btn-primary text-sm">Acquista — EUR {prezzoAccesso}</Link>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// CHECKOUT ACCESSO SINGOLO
// ─────────────────────────────────────────────────────────────
export function BancaDatiAcquista() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { profile } = useAuth()
    const [s, setS] = useState(null)
    const [prodottoId, setProdottoId] = useState(null)
    const [prezzoAccesso, setPrezzoAccesso] = useState(15)
    const [loading, setLoading] = useState(true)
    const [acquistando, setAcquistando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        async function carica() {
            setLoading(true)
            const [{ data: sentenza }, { data: prod }] = await Promise.all([
                supabase.from('sentenze').select('id, titolo, categoria, sotto_categoria, anno, autore:autore_id(nome, cognome)').eq('id', id).single(),
                supabase.from('prodotti').select('id, prezzo').eq('tipo', 'accesso_singolo').eq('attivo', true).single(),
            ])
            setS(sentenza)
            if (prod) { setProdottoId(prod.id); setPrezzoAccesso(prod.prezzo) }
            setLoading(false)
        }
        carica()
    }, [id])

    async function handleAcquisto() {
        if (!prodottoId) return setErrore('Prodotto accesso singolo non configurato. Contatta l\'admin.')
        setAcquistando(true)
        setErrore('')
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({
                        prodotto_id: prodottoId,
                        sentenza_id: id,
                        success_url: `${window.location.origin}/banca-dati/${id}?success=1`,
                        cancel_url: `${window.location.origin}/banca-dati/${id}/acquista`,
                    }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            window.location.href = json.url
        } catch (err) {
            setErrore(err.message)
            setAcquistando(false)
        }
    }

    if (loading) return <div className="flex items-center justify-center py-40"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
    if (!s) return <div className="space-y-5"><button onClick={() => navigate(-1)} className="font-body text-xs text-nebbia/40 hover:text-oro">← Indietro</button><p className="font-body text-sm text-nebbia/40">Sentenza non trovata.</p></div>

    return (
        <div className="space-y-5 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)} className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors">← Indietro</button>

            <div>
                <p className="section-label mb-2">Acquisto accesso</p>
                <h1 className="font-display text-3xl font-light text-nebbia">Riepilogo ordine</h1>
            </div>

            <div className="bg-slate border border-oro/20 p-5 space-y-2">
                <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">
                    {s.categoria}{s.sotto_categoria ? ` › ${s.sotto_categoria}` : ''}
                </p>
                <p className="font-display text-lg font-semibold text-nebbia">{s.titolo}</p>
                <p className="font-body text-xs text-nebbia/40">{s.autore?.nome} {s.autore?.cognome} · {s.anno}</p>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="font-body text-sm text-nebbia/50">Accesso singolo documento</span>
                    <span className="font-display text-2xl font-semibold text-oro">EUR {prezzoAccesso}</span>
                </div>
            </div>

            <div className="bg-slate border border-white/5 p-5 space-y-2">
                <p className="section-label">Intestatario</p>
                {[
                    ['Nome', `${profile?.nome ?? ''} ${profile?.cognome ?? ''}`.trim() || '—'],
                    ['Email', profile?.email ?? '—'],
                ].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1.5 border-b border-white/5">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className="font-body text-sm text-nebbia">{v}</span>
                    </div>
                ))}
            </div>

            <div className="bg-slate border border-amber-500/15 p-4">
                <p className="font-body text-xs text-amber-400/70 leading-relaxed">
                    L'accesso è permanente ma il documento è consultabile solo nel portale Lexum. Non è previsto download o condivisione del PDF.
                </p>
            </div>

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            <button onClick={handleAcquisto} disabled={acquistando || !prodottoId}
                className="btn-primary w-full justify-center text-sm disabled:opacity-60">
                {acquistando
                    ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                    : `Procedi al pagamento — EUR ${prezzoAccesso}`}
            </button>
            <p className="font-body text-xs text-nebbia/20 text-center">Pagamento gestito da Stripe — Connessione cifrata SSL</p>
        </div>
    )
}