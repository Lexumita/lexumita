// src/components/commercialista/BoxRicercheMandato.jsx
//
// Box "Ricerche" del dettaglio mandato (port dal fiduciario CH).
// Mostra le ricerche del mandato (ricerca_ai / ricerca_manuale / chat_lex),
// permette di aggiungerne di manuali e linka alla Banca Dati.
//
// Le ricerche arrivano qui in due modi:
//   - dalla Banca Dati, salvate con "Salva in mandato" (AggiungiAPratica bifronte)
//   - aggiunte manualmente da questo box
//
// Props:
//   mandatoId  (string)  - mandato di cui mostrare le ricerche

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Sparkles, Save, AlertCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'

// ── Ricerca espandibile (identica alla pratica) ──
function RicercaEspandibile({ contenuto, id, tipo, onSalva }) {
    const [espansa, setEspansa] = useState(false)
    const [modifica, setModifica] = useState(false)
    const [contenutoEdit, setContenutoEdit] = useState(contenuto ?? '')
    const [salvando, setSalvando] = useState(false)

    async function salva() {
        setSalvando(true)
        await supabase.from('ricerche').update({ contenuto: contenutoEdit }).eq('id', id)
        setModifica(false)
        if (onSalva) await onSalva()
        setSalvando(false)
    }

    if (modifica) return (
        <div className="ml-5 space-y-2 mt-1">
            <textarea rows={5} value={contenutoEdit} onChange={e => setContenutoEdit(e.target.value)}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50 resize-none" />
            <div className="flex gap-2">
                <button onClick={salva} disabled={salvando}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40">
                    {salvando
                        ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                        : <><Save size={10} /> Salva</>}
                </button>
                <button onClick={() => { setModifica(false); setContenutoEdit(contenuto ?? '') }}
                    className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors">
                    Annulla
                </button>
            </div>
        </div>
    )

    return (
        <div className="ml-5 mt-1">
            {tipo === 'ricerca_ai' || tipo === 'chat_lex' ? (
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
                        {contenuto}
                    </ReactMarkdown>
                </div>
            ) : (
                <p className={`font-body text-xs text-nebbia/50 leading-relaxed ${espansa ? 'whitespace-pre-line' : 'line-clamp-3'}`}>
                    {contenuto}
                </p>
            )}
            <div className="flex items-center gap-3 mt-1">
                <button onClick={() => setEspansa(!espansa)}
                    className="font-body text-xs text-nebbia/25 hover:text-nebbia/50 transition-colors">
                    {espansa ? '▲ Riduci' : '▼ Espandi'}
                </button>
                {tipo === 'ricerca_manuale' && (
                    <button onClick={() => setModifica(true)}
                        className="font-body text-xs text-nebbia/25 hover:text-oro transition-colors">
                        Modifica
                    </button>
                )}
            </div>
        </div>
    )
}

// ── Box ricerche mandato ──
export default function BoxRicercheMandato({ mandatoId, refreshTrigger = 0 }) {
    const navigate = useNavigate()
    const [ricerche, setRicerche] = useState([])
    const [loading, setLoading] = useState(true)
    const [mostraForm, setMostraForm] = useState(false)
    const [nuova, setNuova] = useState({ titolo: '', contenuto: '' })
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState(null)

    useEffect(() => { carica() }, [mandatoId, refreshTrigger])

    async function carica() {
        setLoading(true)
        const { data } = await supabase
            .from('ricerche')
            .select('id, tipo, titolo, contenuto, metadati, created_at, autore:autore_id(nome, cognome)')
            .eq('mandato_id', mandatoId)
            .order('created_at', { ascending: false })
        setRicerche(data ?? [])
        setLoading(false)
    }

    async function salvaManuale() {
        setErrore(null)
        if (!nuova.contenuto.trim()) return setErrore('Il contenuto è obbligatorio.')
        setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('ricerche').insert({
                mandato_id: mandatoId,
                user_id: user.id,
                autore_id: user.id,
                tipo: 'ricerca_manuale',
                titolo: nuova.titolo.trim() || 'Ricerca manuale',
                contenuto: nuova.contenuto.trim(),
                metadati: { ts: new Date().toISOString() },
            })
            setNuova({ titolo: '', contenuto: '' })
            setMostraForm(false)
            await carica()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    async function elimina(ricercaId) {
        if (!confirm('Eliminare questa ricerca?')) return
        await supabase.from('ricerche').delete().eq('id', ricercaId)
        setRicerche(prev => prev.filter(r => r.id !== ricercaId))
    }

    return (
        <div className="bg-slate border border-white/5 flex flex-col h-[560px]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 flex-wrap gap-2">
                <p className="section-label">Ricerche ({ricerche.length})</p>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/banca-dati')}
                        className="font-body text-xs text-nebbia/40 hover:text-oro transition-colors flex items-center gap-1">
                        <Search size={11} /> Cerca in Banca Dati
                    </button>
                    <button onClick={() => setMostraForm(!mostraForm)}
                        className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors">
                        <Plus size={11} /> Aggiungi
                    </button>
                </div>
            </div>

            {/* Form aggiunta manuale */}
            {mostraForm && (
                <div className="px-4 py-3 border-b border-white/5 bg-petrolio/30 shrink-0 space-y-3">
                    <input placeholder="Titolo (opzionale)" value={nuova.titolo}
                        onChange={e => setNuova(p => ({ ...p, titolo: e.target.value }))}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                    <textarea rows={4} placeholder="Annotazione, riferimento normativo, nota di lavoro..." value={nuova.contenuto}
                        onChange={e => setNuova(p => ({ ...p, contenuto: e.target.value }))}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
                    {errore && (
                        <p className="font-body text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle size={10} />{errore}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <button onClick={salvaManuale} disabled={salvando}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors disabled:opacity-40">
                            {salvando
                                ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                                : <><Save size={11} /> Salva</>}
                        </button>
                        <button onClick={() => { setMostraForm(false); setNuova({ titolo: '', contenuto: '' }); setErrore(null) }}
                            className="px-3 py-1.5 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors">
                            Annulla
                        </button>
                    </div>
                </div>
            )}

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                    </div>
                ) : ricerche.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
                        <Sparkles size={20} className="text-nebbia/20 mb-2" />
                        <p className="font-body text-sm text-nebbia/30">Nessuna ricerca ancora</p>
                        <p className="font-body text-xs text-nebbia/20 mt-1">
                            Salva ricerche dalla Banca Dati o aggiungi una nota manuale.
                        </p>
                    </div>
                ) : ricerche.map(r => (
                    <div key={r.id} className="border-b border-white/5 last:border-0 p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {r.tipo === 'ricerca_ai' || r.tipo === 'chat_lex'
                                    ? <Sparkles size={11} className="text-salvia shrink-0 mt-0.5" />
                                    : <Search size={11} className="text-oro shrink-0 mt-0.5" />}
                                <p className="font-body text-xs font-medium text-nebbia/70">
                                    {r.titolo ?? (
                                        r.tipo === 'ricerca_ai' ? 'Ricerca AI'
                                            : r.tipo === 'chat_lex' ? 'Chat Lex' : 'Ricerca manuale'
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="font-body text-xs text-nebbia/25">
                                    {r.autore ? `${r.autore.nome} ${r.autore.cognome}` : '—'} · {new Date(r.created_at).toLocaleDateString('it-IT')}
                                </span>
                                <button onClick={() => elimina(r.id)} className="text-nebbia/20 hover:text-red-400 transition-colors">
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                        <RicercaEspandibile contenuto={r.contenuto} id={r.id} tipo={r.tipo} onSalva={carica} />
                        {(r.tipo === 'ricerca_ai' || r.tipo === 'chat_lex') && r.metadati?.sentenze && (
                            <p className="font-body text-xs text-oro/50 ml-5">Giurisprudenza correlata allegata</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
