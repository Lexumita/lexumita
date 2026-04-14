// src/pages/avvocato/PraticaDettaglio.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BackButton, Badge, TextareaField, EmptyState } from '@/components/shared'
import { Plus, Search, FileText, Calendar, Sparkles, X, Save, AlertCircle, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'

const STATI = {
    aperta: { label: 'Aperta', variant: 'salvia' },
    chiusa: { label: 'Chiusa', variant: 'gray' },
}

async function caricaContesto(userId) {
    const { data: profilo } = await supabase
        .from('profiles').select('posti_acquistati').eq('id', userId).single()
    const haStudio = (profilo?.posti_acquistati ?? 1) > 1
    let collaboratori = []
    if (haStudio) {
        const { data: c } = await supabase
            .from('profiles').select('id, nome, cognome').eq('titolare_id', userId)
        collaboratori = c ?? []
    }
    return { haStudio, collaboratori, ids: [userId, ...collaboratori.map(c => c.id)] }
}

function RicercaEspandibile({ testo, id, tipo, onSalva }) {
    const [espansa, setEspansa] = useState(false)
    const [modifica, setModifica] = useState(false)
    const [testoEdit, setTestoEdit] = useState(testo ?? '')
    const [salvando, setSalvando] = useState(false)

    async function salva() {
        setSalvando(true)
        await supabase.from('note_interne').update({ testo: testoEdit }).eq('id', id)
        setModifica(false)
        if (onSalva) await onSalva()
        setSalvando(false)
    }

    if (modifica) return (
        <div className="ml-5 space-y-2 mt-1">
            <textarea
                rows={5}
                value={testoEdit}
                onChange={e => setTestoEdit(e.target.value)}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50 resize-none"
            />
            <div className="flex gap-2">
                <button
                    onClick={salva}
                    disabled={salvando}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                >
                    {salvando
                        ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                        : <><Save size={10} /> Salva</>
                    }
                </button>
                <button
                    onClick={() => { setModifica(false); setTestoEdit(testo ?? '') }}
                    className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors"
                >
                    Annulla
                </button>
            </div>
        </div>
    )

    return (
        <div className="ml-5 mt-1">
            {tipo === 'ricerca_ai' ? (
                <div className={`font-body text-xs text-nebbia/50 leading-relaxed ${espansa ? '' : 'line-clamp-3'}`}>
                    <ReactMarkdown
                        components={{
                            h2: ({ children }) => <h2 className="font-body text-xs font-semibold text-nebbia mt-2 mb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="font-body text-xs font-semibold text-nebbia/70 mt-1 mb-0.5">{children}</h3>,
                            strong: ({ children }) => <strong className="font-semibold text-nebbia/70">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li className="font-body text-xs">{children}</li>,
                            p: ({ children }) => <p className="font-body text-xs text-nebbia/50 leading-relaxed mb-1">{children}</p>,
                        }}
                    >
                        {testo}
                    </ReactMarkdown>
                </div>
            ) : (
                <p className={`font-body text-xs text-nebbia/50 leading-relaxed ${espansa ? 'whitespace-pre-line' : 'line-clamp-3'}`}>
                    {testo}
                </p>
            )}
            <div className="flex items-center gap-3 mt-1">
                <button
                    onClick={() => setEspansa(!espansa)}
                    className="font-body text-xs text-nebbia/25 hover:text-nebbia/50 transition-colors"
                >
                    {espansa ? '▲ Riduci' : '▼ Espandi'}
                </button>
                {tipo !== 'ricerca_ai' && (
                    <button
                        onClick={() => setModifica(true)}
                        className="font-body text-xs text-nebbia/25 hover:text-oro transition-colors"
                    >
                        Modifica
                    </button>
                )}
            </div>
        </div>
    )
}

export default function PraticaDettaglio() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [pratica, setPratica] = useState(null)
    const [collabPratica, setCP] = useState([])
    const [collabs, setCollabs] = useState([])
    const [isStudio, setIsStudio] = useState(false)
    const [meId, setMeId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [note, setNote] = useState('')
    const [salvandoNote, setSalvando] = useState(false)

    const [mostraEsito, setMostraEsito] = useState(false)
    const [esito, setEsito] = useState('')

    const [noteEsito, setNoteEsito] = useState('')
    const [salvandoNoteEsito, setSalvandoNoteEsito] = useState(false)

    // Ricerche
    const [ricerche, setRicerche] = useState([])
    const [loadingRicerche, setLoadingRicerche] = useState(false)
    const [mostraFormRicerca, setMostraForm] = useState(false)
    const [nuovaRicerca, setNuovaRicerca] = useState({ titolo: '', testo: '' })
    const [salvandoRicerca, setSalvandoRicerca] = useState(false)
    const [erroreRicerca, setErroreRicerca] = useState(null)

    const [strategia, setStrategia] = useState(null)
    const [generando, setGenerando] = useState(false)
    const [erroreStrategia, setErroreStrategia] = useState(null)
    const [salvandoStrategia, setSalvandoStrategia] = useState(false)
    const [strategiaSalvata, setStrategiaSalvata] = useState(false)
    const [modificaUdienza, setModificaUdienza] = useState(false)
    const [nuovaUdienza, setNuovaUdienza] = useState(pratica?.prossima_udienza?.slice(0, 10) ?? '')

    const [documenti, setDocumenti] = useState([])
    const [loadingDocs, setLoadingDocs] = useState(false)
    const [caricandoDoc, setCaricandoDoc] = useState(false)
    const [erroreDoc, setErroreDoc] = useState(null)

    async function caricaRicerche() {
        setLoadingRicerche(true)
        const { data } = await supabase
            .from('note_interne')
            .select('id, tipo, testo, metadati, created_at, autore:autore_id(nome, cognome)')
            .eq('pratica_id', id)
            .in('tipo', ['ricerca_ai', 'ricerca_manuale'])
            .order('created_at', { ascending: false })
        setRicerche(data ?? [])
        setLoadingRicerche(false)
    }

    useEffect(() => {
        async function load() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)

            const { data: p } = await supabase
                .from('pratiche')
                .select('id, titolo, tipo, stato, note, note_esito, esito, created_at, prossima_udienza, avvocato_id, cliente_id, cliente:cliente_id(id, nome, cognome), aggiornato_da, aggiornatore:aggiornato_da(nome, cognome), updated_at')
                .eq('id', id).single()
            if (p) { setPratica(p); setNote(p.note ?? ''); setNoteEsito(p.note_esito ?? '') }

            const { data: cp } = await supabase
                .from('pratica_collaboratori')
                .select('avvocato_id, profilo:avvocato_id(id, nome, cognome)')
                .eq('pratica_id', id)
            setCP(cp?.map(c => ({ id: c.profilo.id, nome: `${c.profilo.nome} ${c.profilo.cognome}` })) ?? [])

            const ctx = await caricaContesto(user.id)
            setIsStudio(ctx.haStudio)
            setCollabs(ctx.collaboratori)

            await caricaRicerche()
            await caricaDocumenti()
            setLoading(false)
        }
        load()
    }, [id])

    async function salvaNote() {
        setSalvando(true)
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('pratiche').update({
            note,
            aggiornato_da: user.id,
            updated_at: new Date().toISOString()
        }).eq('id', id)
        setSalvando(false)
    }

    async function caricaDocumenti() {
        setLoadingDocs(true)
        const { data } = await supabase
            .from('documenti_pratiche')
            .select('id, nome_file, storage_path, dimensione, tipo_file, created_at, autore:autore_id(nome, cognome)')
            .eq('pratica_id', id)
            .order('created_at', { ascending: false })
        setDocumenti(data ?? [])
        setLoadingDocs(false)
    }

    async function uploadDocumento(file) {
        if (!file) return
        setCaricandoDoc(true)
        setErroreDoc(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const ext = file.name.split('.').pop()
            const path = `${id}/${Date.now()}.${ext}`

            const { error: upErr } = await supabase.storage
                .from('documenti')
                .upload(path, file)
            if (upErr) throw new Error(upErr.message)

            await supabase.from('documenti_pratiche').insert({
                pratica_id: id,
                autore_id: user.id,
                nome_file: file.name,
                storage_path: path,
                dimensione: file.size,
                tipo_file: file.type,
            })
            await caricaDocumenti()
        } catch (e) {
            setErroreDoc(e.message)
        } finally {
            setCaricandoDoc(false)
        }
    }

    async function scaricaDocumento(doc) {
        const { data } = await supabase.storage
            .from('documenti')
            .createSignedUrl(doc.storage_path, 3600)
        if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    }

    async function eliminaDocumento(doc) {
        if (!confirm(`Eliminare "${doc.nome_file}"?`)) return
        await supabase.storage.from('documenti').remove([doc.storage_path])
        await supabase.from('documenti_pratiche').delete().eq('id', doc.id)
        setDocumenti(prev => prev.filter(d => d.id !== doc.id))
    }

    async function salvaRicercaManuale() {
        setErroreRicerca(null)
        if (!nuovaRicerca.testo.trim()) return setErroreRicerca('Il testo è obbligatorio')
        setSalvandoRicerca(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('note_interne').insert({
                pratica_id: id,
                user_id: user.id,
                autore_id: user.id,
                tipo: 'ricerca_manuale',
                testo: nuovaRicerca.testo.trim(),
                metadati: {
                    domanda: nuovaRicerca.titolo.trim() || 'Ricerca manuale',
                    ts: new Date().toISOString(),
                }
            })
            setNuovaRicerca({ titolo: '', testo: '' })
            setMostraForm(false)
            await caricaRicerche()
        } catch (e) {
            setErroreRicerca(e.message)
        } finally {
            setSalvandoRicerca(false)
        }
    }

    async function eliminaRicerca(ricercaId) {
        if (!confirm('Eliminare questa ricerca?')) return
        await supabase.from('note_interne').delete().eq('id', ricercaId)
        setRicerche(prev => prev.filter(r => r.id !== ricercaId))
    }

    async function generaStrategia() {
        setGenerando(true)
        setErroreStrategia(null)
        setStrategia(null)
        setStrategiaSalvata(false)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/genera-strategia`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ pratica_id: id }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            setStrategia(json.strategia)
        } catch (e) {
            setErroreStrategia(e.message)
        } finally {
            setGenerando(false)
        }
    }

    async function salvaStrategia() {
        if (!strategia) return
        setSalvandoStrategia(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('note_interne').insert({
                pratica_id: id,
                autore_id: user.id,
                tipo: 'strategia_ai',
                testo: strategia,
                metadati: {
                    domanda: 'Strategia AI generata da Lex',
                    ts: new Date().toISOString(),
                    ricerche_usate: ricerche.length,
                }
            })
            setStrategiaSalvata(true)
        } catch (e) {
            setErroreStrategia(e.message)
        } finally {
            setSalvandoStrategia(false)
        }
    }

    async function toggleCollab(membroId) {
        const esiste = collabPratica.find(c => c.id === membroId)
        if (esiste) {
            await supabase.from('pratica_collaboratori').delete().eq('pratica_id', id).eq('avvocato_id', membroId)
            setCP(prev => prev.filter(c => c.id !== membroId))
        } else {
            await supabase.from('pratica_collaboratori').insert({ pratica_id: id, avvocato_id: membroId })
            const m = collabs.find(c => c.id === membroId)
            if (m) setCP(prev => [...prev, { id: m.id, nome: `${m.nome} ${m.cognome}` }])
        }
    }

    if (loading) return (
        <div className="flex justify-center py-40">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
        </div>
    )

    if (!pratica) return (
        <div className="space-y-5">
            <BackButton to="/pratiche" label="Tutte le pratiche" />
            <p className="font-body text-sm text-nebbia/40">Pratica non trovata.</p>
        </div>
    )

    const sc = STATI[pratica.stato] ?? STATI.aperta
    const nomeAvv = pratica.avvocato_id === meId ? 'Tu'
        : (() => { const c = collabs.find(c => c.id === pratica.avvocato_id); return c ? `${c.nome} ${c.cognome}` : '—' })()
    const collabDisp = collabs.filter(c => c.id !== pratica.avvocato_id && !collabPratica.find(cp => cp.id === c.id))

    return (
        <div className="space-y-5 p-6">
            <BackButton to="/pratiche" label="Tutte le pratiche" />

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="section-label mb-2">Pratica</p>
                    <h1 className="font-display text-4xl font-light text-nebbia">{pratica.titolo}</h1>
                    <p className="font-body text-sm text-nebbia/40 mt-1">
                        {pratica.cliente ? `${pratica.cliente.nome} ${pratica.cliente.cognome}` : '—'} · {pratica.tipo ?? '—'}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Badge label={sc.label} variant={sc.variant} />
                    {pratica.stato === 'aperta' ? (
                        mostraEsito ? (
                            <div className="flex items-center gap-2 bg-slate border border-white/10 p-2">
                                <select
                                    value={esito}
                                    onChange={e => setEsito(e.target.value)}
                                    className="bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-1.5 outline-none focus:border-oro/50"
                                >
                                    <option value="">Seleziona esito</option>
                                    <option value="vinta">Vinta</option>
                                    <option value="persa">Persa</option>
                                    <option value="transatta">Transatta</option>
                                    <option value="archiviata">Archiviata</option>
                                </select>
                                <button
                                    onClick={async () => {
                                        if (!esito) return
                                        await supabase.from('pratiche').update({ stato: 'chiusa', esito }).eq('id', id)
                                        setPratica(prev => ({ ...prev, stato: 'chiusa', esito }))
                                        setMostraEsito(false)
                                    }}
                                    className="font-body text-xs text-red-400 border border-red-500/30 px-3 py-1.5 hover:bg-red-500/10 transition-colors"
                                >
                                    Conferma chiusura
                                </button>
                                <button
                                    onClick={() => { setMostraEsito(false); setEsito('') }}
                                    className="font-body text-xs text-nebbia/30 hover:text-nebbia transition-colors px-2"
                                >
                                    Annulla
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setMostraEsito(true)}
                                className="font-body text-xs text-nebbia/50 hover:text-red-400 border border-white/15 hover:border-red-500/30 hover:bg-red-500/5 px-3 py-1.5 transition-colors"
                            >
                                Chiudi pratica
                            </button>
                        )
                    ) : (
                        <button
                            onClick={async () => {
                                await supabase.from('pratiche').update({ stato: 'aperta', esito: null }).eq('id', id)
                                setPratica(prev => ({ ...prev, stato: 'aperta', esito: null }))
                            }}
                            className="font-body text-xs text-salvia/70 border border-salvia/30 bg-salvia/5 hover:bg-salvia/15 px-3 py-1.5 transition-colors"
                        >
                            Riapri pratica
                        </button>
                    )}
                </div>
            </div>

            {/* Layout due colonne */}
            <div className="flex gap-6 items-start">

                {/* ── COLONNA SINISTRA 60% ── */}
                <div className="flex-[3] space-y-5 min-w-0">

                    {/* Dettagli + Scadenze */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-slate border border-white/5 p-5 space-y-3">
                            <p className="section-label">Dettagli</p>
                            {[
                                ['Cliente', pratica.cliente ? `${pratica.cliente.nome} ${pratica.cliente.cognome}` : '—'],
                                ['Tipo', pratica.tipo ?? '—'],
                                ['Creata il', new Date(pratica.created_at).toLocaleDateString('it-IT')],
                                ['Pross. udienza', pratica.prossima_udienza ? new Date(pratica.prossima_udienza).toLocaleDateString('it-IT') : '—'],
                                ...(pratica.esito ? [['Esito', (
                                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-body border ${pratica.esito === 'vinta' ? 'bg-salvia/15 text-salvia border-salvia/30' :
                                        pratica.esito === 'persa' ? 'bg-red-900/20 text-red-400 border-red-500/30' :
                                            pratica.esito === 'transatta' ? 'bg-amber-900/20 text-amber-400 border-amber-500/30' :
                                                'bg-white/5 text-nebbia/40 border-white/10'
                                        }`}>
                                        {pratica.esito.charAt(0).toUpperCase() + pratica.esito.slice(1)}
                                    </span>
                                )]] : []),
                                ...(isStudio ? [['Avvocato', nomeAvv]] : []),
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                    <span className="font-body text-sm text-nebbia">{v}</span>
                                </div>
                            ))}
                            {isStudio && (
                                <div>
                                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-2">Collaboratori</p>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {collabPratica.length === 0
                                            ? <span className="font-body text-xs text-nebbia/25 italic">Nessun collaboratore</span>
                                            : collabPratica.map(c => (
                                                <span key={c.id} className="flex items-center gap-1 font-body text-xs px-2 py-1 bg-salvia/10 border border-salvia/25 text-salvia">
                                                    {c.nome}
                                                    <button onClick={() => toggleCollab(c.id)} className="text-salvia/50 hover:text-red-400 ml-0.5">×</button>
                                                </span>
                                            ))
                                        }
                                    </div>
                                    {collabDisp.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {collabDisp.map(c => (
                                                <button key={c.id} onClick={() => toggleCollab(c.id)}
                                                    className="font-body text-xs px-2 py-1 border border-white/10 text-nebbia/30 hover:border-salvia/30 hover:text-salvia transition-colors">
                                                    + {c.nome} {c.cognome}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate border border-white/5 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="section-label">Scadenze & udienze</p>
                                <button
                                    onClick={() => setModificaUdienza(!modificaUdienza)}
                                    className="font-body text-xs text-nebbia/30 hover:text-oro transition-colors"
                                >
                                    {modificaUdienza ? 'Annulla' : pratica.prossima_udienza ? 'Modifica' : '+ Aggiungi'}
                                </button>
                            </div>
                            {modificaUdienza ? (
                                <div className="space-y-3">
                                    <input
                                        type="date"
                                        value={nuovaUdienza}
                                        onChange={e => setNuovaUdienza(e.target.value)}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                                if (!nuovaUdienza) return
                                                const { data: { user } } = await supabase.auth.getUser()
                                                await supabase.from('pratiche').update({ prossima_udienza: nuovaUdienza }).eq('id', id)
                                                const dataInizio = new Date(`${nuovaUdienza}T09:00:00`)
                                                const dataFine = new Date(`${nuovaUdienza}T11:00:00`)
                                                const { data: esistente } = await supabase.from('appuntamenti').select('id').eq('pratica_id', id).eq('tipo', 'udienza').maybeSingle()
                                                if (esistente) {
                                                    await supabase.from('appuntamenti').update({ data_ora_inizio: dataInizio.toISOString(), data_ora_fine: dataFine.toISOString() }).eq('id', esistente.id)
                                                } else {
                                                    await supabase.from('appuntamenti').insert({
                                                        avvocato_id: user.id, pratica_id: id, tipo: 'udienza',
                                                        titolo: `Udienza — ${pratica.titolo}`, stato: 'programmato',
                                                        data_ora_inizio: dataInizio.toISOString(), data_ora_fine: dataFine.toISOString(),
                                                        cliente_id: pratica.cliente_id ?? null,
                                                    })
                                                }
                                                setPratica(prev => ({ ...prev, prossima_udienza: nuovaUdienza }))
                                                setModificaUdienza(false)
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors"
                                        >
                                            <Save size={11} /> Salva
                                        </button>
                                        {pratica.prossima_udienza && (
                                            <button
                                                onClick={async () => {
                                                    await supabase.from('pratiche').update({ prossima_udienza: null }).eq('id', id)
                                                    setPratica(prev => ({ ...prev, prossima_udienza: null }))
                                                    setModificaUdienza(false)
                                                }}
                                                className="px-3 py-1.5 border border-red-500/30 text-red-400 font-body text-xs hover:bg-red-500/10 transition-colors"
                                            >
                                                Rimuovi
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : pratica.prossima_udienza ? (
                                <div className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-500/25">
                                    <Calendar size={16} className="text-red-400" />
                                    <div>
                                        <p className="font-body text-xs text-red-400/60 uppercase tracking-widest mb-0.5">Prossima udienza</p>
                                        <span className="font-body text-sm text-red-400">{new Date(pratica.prossima_udienza).toLocaleDateString('it-IT')}</span>
                                    </div>
                                </div>
                            ) : (
                                <EmptyState icon={Calendar} title="Nessuna scadenza" />
                            )}
                        </div>
                    </div>

                    {/* Note esito — solo se pratica chiusa */}
                    {pratica.stato === 'chiusa' && pratica.esito && (
                        <div className="bg-slate border border-white/5 p-5">
                            <p className="section-label mb-3">Note sull'esito</p>
                            <p className="font-body text-xs text-nebbia/30 leading-relaxed mb-3">
                                Perché la pratica si è conclusa così? Cosa ha funzionato o non ha funzionato?
                            </p>
                            <textarea
                                rows={4}
                                placeholder="Es. La strategia difensiva basata sull'alibi ha funzionato perché..."
                                value={noteEsito}
                                onChange={e => setNoteEsito(e.target.value)}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                            />
                            <button
                                onClick={async () => {
                                    setSalvandoNoteEsito(true)
                                    await supabase.from('pratiche').update({ note_esito: noteEsito }).eq('id', id)
                                    setPratica(prev => ({ ...prev, note_esito: noteEsito }))
                                    setSalvandoNoteEsito(false)
                                }}
                                disabled={salvandoNoteEsito}
                                className="font-body text-xs text-nebbia/50 border border-white/10 hover:border-white/25 hover:text-nebbia px-4 py-2 mt-3 transition-colors"
                            >
                                {salvandoNoteEsito
                                    ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                    : 'Salva note esito'
                                }
                            </button>
                        </div>
                    )}

                    {/* Documenti */}
                    <div className="bg-slate border border-white/5 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="section-label">Documenti pratica</p>
                            <a
                                href={`/archivio?pratica_id=${id}`}
                                className="btn-secondary text-xs flex items-center gap-1.5"
                            >
                                <Plus size={12} /> Carica in archivio
                            </a>
                        </div>
                        {erroreDoc && (
                            <p className="font-body text-xs text-red-400 flex items-center gap-1.5 mb-3">
                                <AlertCircle size={11} />{erroreDoc}
                            </p>
                        )}
                        {loadingDocs ? (
                            <div className="flex justify-center py-6">
                                <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                            </div>
                        ) : documenti.length === 0 ? (
                            <EmptyState icon={FileText} title="Nessun documento" desc="Carica i documenti relativi a questa pratica" />
                        ) : (
                            <div className="space-y-2">
                                {documenti.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between gap-3 p-3 bg-petrolio border border-white/5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FileText size={14} className="text-nebbia/30 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-body text-sm text-nebbia truncate">{doc.nome_file}</p>
                                                <p className="font-body text-xs text-nebbia/30 mt-0.5">
                                                    {doc.autore ? `${doc.autore.nome} ${doc.autore.cognome}` : '—'} · {new Date(doc.created_at).toLocaleDateString('it-IT')}
                                                    {doc.dimensione && ` · ${(doc.dimensione / 1024 / 1024).toFixed(1)} MB`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => scaricaDocumento(doc)} className="text-nebbia/30 hover:text-oro transition-colors">
                                                <Download size={13} />
                                            </button>
                                            <button onClick={() => eliminaDocumento(doc)} className="text-nebbia/30 hover:text-red-400 transition-colors">
                                                <X size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Note interne */}
                    <div className="bg-slate border border-white/5 p-5">
                        <p className="section-label mb-3">Note interne (solo di questa pratica)</p>
                        <TextareaField rows={5} placeholder="Note interne sulla pratica..."
                            value={note} onChange={e => setNote(e.target.value)} />
                        <button onClick={salvaNote} disabled={salvandoNote} className="btn-primary text-sm mt-3">
                            {salvandoNote
                                ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                                : 'Salva note'
                            }
                        </button>
                        {pratica.aggiornatore && (
                            <p className="font-body text-xs text-nebbia/25 mt-2">
                                Ultima modifica: {pratica.aggiornatore.nome} {pratica.aggiornatore.cognome} · {new Date(pratica.updated_at).toLocaleDateString('it-IT')}
                            </p>
                        )}
                    </div>
                </div>

                {/* ── COLONNA DESTRA 40% ── */}
                <div className="flex-[2] min-w-0 bg-slate border border-white/5 flex flex-col sticky top-6"
                    style={{ maxHeight: 'calc(100vh - 120px)' }}>

                    {/* Header pannello */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                        <p className="section-label">Ricerche ({ricerche.length})</p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('/normativa')}
                                className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors flex items-center gap-1"
                            >
                                <Search size={11} /> Cerca in Normativa
                            </button>
                            <button
                                onClick={() => setMostraForm(!mostraFormRicerca)}
                                className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors"
                            >
                                <Plus size={11} /> Aggiungi
                            </button>
                        </div>
                    </div>

                    {/* Form nuova ricerca manuale */}
                    {mostraFormRicerca && (
                        <div className="px-4 py-3 border-b border-white/5 bg-petrolio/30 shrink-0 space-y-3">
                            <input
                                placeholder="Titolo ricerca (opzionale)..."
                                value={nuovaRicerca.titolo}
                                onChange={e => setNuovaRicerca(p => ({ ...p, titolo: e.target.value }))}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <textarea
                                rows={4}
                                placeholder="Scrivi il tuo ragionamento legale..."
                                value={nuovaRicerca.testo}
                                onChange={e => setNuovaRicerca(p => ({ ...p, testo: e.target.value }))}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                            />
                            {erroreRicerca && (
                                <p className="font-body text-xs text-red-400 flex items-center gap-1">
                                    <AlertCircle size={10} />{erroreRicerca}
                                </p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={salvaRicercaManuale}
                                    disabled={salvandoRicerca}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40"
                                >
                                    {salvandoRicerca
                                        ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                                        : <><Save size={11} /> Salva</>
                                    }
                                </button>
                                <button
                                    onClick={() => { setMostraForm(false); setNuovaRicerca({ titolo: '', testo: '' }); setErroreRicerca(null) }}
                                    className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Lista ricerche */}
                    <div className="flex-1 overflow-y-auto">
                        {loadingRicerche ? (
                            <div className="flex justify-center py-8">
                                <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                            </div>
                        ) : ricerche.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                <Sparkles size={20} className="text-nebbia/20 mb-2" />
                                <p className="font-body text-sm text-nebbia/30">Nessuna ricerca</p>
                                <p className="font-body text-xs text-nebbia/20 mt-1">
                                    Aggiungi una ricerca manuale o cerca in Normativa
                                </p>
                            </div>
                        ) : ricerche.map(r => (
                            <div key={r.id} className="border-b border-white/5 last:border-0 p-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {r.tipo === 'ricerca_ai'
                                            ? <Sparkles size={11} className="text-salvia shrink-0 mt-0.5" />
                                            : <Search size={11} className="text-oro shrink-0 mt-0.5" />
                                        }
                                        <p className="font-body text-xs font-medium text-nebbia/70">
                                            {r.metadati?.domanda ?? (r.tipo === 'ricerca_ai' ? 'Ricerca AI' : 'Ricerca manuale')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-body text-xs text-nebbia/25">
                                            {r.autore ? `${r.autore.nome} ${r.autore.cognome}` : '—'} · {new Date(r.created_at).toLocaleDateString('it-IT')}
                                        </span>
                                        <button onClick={() => eliminaRicerca(r.id)} className="text-nebbia/20 hover:text-red-400 transition-colors">
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                                <RicercaEspandibile testo={r.testo} id={r.id} tipo={r.tipo} onSalva={caricaRicerche} />
                                {r.tipo === 'ricerca_ai' && r.metadati?.sentenze && (
                                    <p className="font-body text-xs text-oro/50 ml-5">Giurisprudenza correlata disponibile</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Strategia Lex — sezione completa sotto le due colonne */}
            <div className="bg-slate border border-salvia/20">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-salvia" />
                        <p className="font-body text-base font-medium text-salvia">Strategia Lex</p>
                        <span className="font-body text-sm text-nebbia/30 ml-2">
                            Generata dall'AI sulla base delle ricerche di questa pratica
                        </span>
                    </div>
                    <button
                        onClick={generaStrategia}
                        disabled={generando || ricerche.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40"
                    >
                        {generando
                            ? <><span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> Lex sta elaborando...</>
                            : <><Sparkles size={13} /> {strategia ? 'Rigenera strategia' : 'Genera strategia'}</>
                        }
                    </button>
                </div>

                {ricerche.length === 0 && !generando && !strategia && (
                    <div className="px-5 py-8 text-center">
                        <Sparkles size={24} className="text-nebbia/20 mx-auto mb-2" />
                        <p className="font-body text-sm text-nebbia/30">Aggiungi almeno una ricerca per generare la strategia</p>
                        <p className="font-body text-xs text-nebbia/20 mt-1">Le ricerche normative e le sentenze alimentano il ragionamento di Lex</p>
                    </div>
                )}

                {erroreStrategia && (
                    <p className="font-body text-sm text-red-400 px-5 py-4 flex items-center gap-2">
                        <AlertCircle size={14} />{erroreStrategia}
                    </p>
                )}

                {generando && !strategia && (
                    <div className="px-5 py-8 text-center">
                        <span className="animate-spin w-6 h-6 border-2 border-salvia border-t-transparent rounded-full inline-block mb-3" />
                        <p className="font-body text-sm text-salvia/60">Lex sta analizzando le ricerche e costruendo la strategia...</p>
                    </div>
                )}

                {strategia && (
                    <div className="px-5 py-5 space-y-4">
                        <div className="font-body text-sm text-nebbia/80 leading-relaxed">
                            <ReactMarkdown
                                components={{
                                    h2: ({ children }) => <h2 className="font-display text-lg font-semibold text-nebbia mt-5 mb-2">{children}</h2>,
                                    h3: ({ children }) => <h3 className="font-body text-sm font-semibold text-nebbia/80 mt-3 mb-1">{children}</h3>,
                                    strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
                                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-nebbia/70 my-2">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-nebbia/70 my-2">{children}</ol>,
                                    li: ({ children }) => <li className="font-body text-sm">{children}</li>,
                                    p: ({ children }) => <p className="font-body text-sm text-nebbia/80 leading-relaxed mb-2">{children}</p>,
                                }}
                            >
                                {strategia}
                            </ReactMarkdown>
                        </div>
                        {strategiaSalvata ? (
                            <p className="font-body text-sm text-salvia flex items-center gap-2">
                                <Sparkles size={13} /> Strategia salvata nella pratica
                            </p>
                        ) : (
                            <button
                                onClick={salvaStrategia}
                                disabled={salvandoStrategia}
                                className="flex items-center gap-2 px-5 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40"
                            >
                                {salvandoStrategia
                                    ? <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
                                    : <><Save size={13} /> Salva strategia nella pratica</>
                                }
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}