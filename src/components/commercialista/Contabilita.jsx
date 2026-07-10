// src/components/commercialista/Contabilita.jsx
//
// Contabilità in partita doppia (mastro unico):
//   - Piano dei conti per cliente (inizializzabile dallo standard italiano, editabile)
//   - Libro giornale: registrazioni con righe dare/avere bilanciate (incl. conti IVA)
//   - Report (bilancio/CE/verifica/IVA) e imputazioni categoria→conto
//
// Props:
//   clienteId  (string)       - cliente-azienda
//   mandatoId  (string|null)  - mandato opzionale a cui taggare le scritture

import { useState, useEffect } from 'react'
import { BookOpen, Plus, Trash2, Loader2, AlertCircle, X, ListTree, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtEUR } from '@/lib/cassa'
import { righeSeedPiano, NOME_CLASSE } from '@/lib/pianoContiItaliano'
import ReportContabili from './ReportContabili'
import Imputazioni from './Imputazioni'

const num = (v) => { const x = Number(String(v ?? '').replace(',', '.')); return isNaN(x) ? 0 : x }
const oggiISO = () => new Date().toISOString().slice(0, 10)
const TIPO_REG = { ordinaria: 'Ordinaria', apertura: 'Apertura', rettifica: 'Rettifica', chiusura: 'Chiusura' }

export default function Contabilita({ clienteId, mandatoId = null }) {
    const [conti, setConti] = useState([])
    const [registrazioni, setRegistrazioni] = useState([])
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')
    const [inizializzando, setInizializzando] = useState(false)
    const [vista, setVista] = useState('giornale')   // giornale | conti | report | imputazioni
    const [form, setForm] = useState(false)
    const [daEliminare, setDaEliminare] = useState(null)

    useEffect(() => { carica() }, [clienteId])

    async function carica() {
        setLoading(true); setErrore('')
        const [{ data: pc }, { data: reg }] = await Promise.all([
            supabase.from('piano_conti').select('id, numero, nome, classe, tipo, attivo').eq('cliente_id', clienteId).order('numero'),
            supabase.from('registrazioni')
                .select('id, data, descrizione, tipo, numero, righe:righe_registrazione(id, dare, avere, descrizione, conto:conto_id(numero, nome))')
                .eq('cliente_id', clienteId).order('data', { ascending: false }).limit(100),
        ])
        setConti(pc ?? [])
        setRegistrazioni(reg ?? [])
        setLoading(false)
    }

    async function inizializzaPiano() {
        setInizializzando(true); setErrore('')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setErrore('Sessione scaduta.'); setInizializzando(false); return }
        const { data: profilo } = await supabase.from('profiles').select('studio_id').eq('id', user.id).single()
        const righe = righeSeedPiano().map(r => ({
            ...r, cliente_id: clienteId, avvocato_id: user.id, studio_id: profilo?.studio_id ?? null,
            creato_da: user.id, aggiornato_da: user.id,
        }))
        const { error } = await supabase.from('piano_conti').insert(righe)
        setInizializzando(false)
        if (error) { setErrore(error.message); return }
        carica()
    }

    async function elimina() {
        if (!daEliminare) return
        const { error } = await supabase.from('registrazioni').delete().eq('id', daEliminare.id)
        if (error) { setErrore(error.message); return }
        setDaEliminare(null)
        carica()
    }

    const totaleRiga = (righe) => (righe ?? []).reduce((t, r) => t + Number(r.dare || 0), 0)

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-oro/60" />
                    <h2 className="font-display text-lg text-nebbia">Contabilità</h2>
                    <span className="font-body text-[10px] px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/40 uppercase tracking-wider">Partita doppia</span>
                </div>
                {conti.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="flex border border-white/10">
                            {[['giornale', 'Giornale'], ['conti', 'Piano conti'], ['report', 'Report'], ['imputazioni', 'Imputazioni']].map(([v, l]) => (
                                <button key={v} onClick={() => setVista(v)}
                                    className={`px-3 py-1.5 font-body text-xs transition-colors ${vista === v ? 'bg-oro/15 text-oro' : 'text-nebbia/40 hover:text-nebbia/70'}`}>{l}</button>
                            ))}
                        </div>
                        {vista === 'giornale' && (
                            <button onClick={() => setForm(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors">
                                <Plus size={11} /> Nuova registrazione
                            </button>
                        )}
                    </div>
                )}
            </div>

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : conti.length === 0 ? (
                <div className="bg-petrolio/40 border border-white/5 p-10 text-center">
                    <ListTree size={28} className="text-nebbia/15 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/40">Contabilità non ancora attivata</p>
                    <p className="font-body text-xs text-nebbia/25 mt-1 mb-4">Inizializza il piano dei conti italiano di base per questo cliente: potrai poi modificarlo.</p>
                    <button onClick={inizializzaPiano} disabled={inizializzando}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40">
                        {inizializzando ? <Loader2 size={14} className="animate-spin" /> : <ListTree size={14} />} Inizializza piano dei conti
                    </button>
                </div>
            ) : vista === 'report' ? (
                <ReportContabili clienteId={clienteId} conti={conti} />
            ) : vista === 'imputazioni' ? (
                <Imputazioni clienteId={clienteId} conti={conti} />
            ) : vista === 'conti' ? (
                <PianoContiVista conti={conti} />
            ) : (
                <div className="space-y-2">
                    {registrazioni.length === 0 ? (
                        <div className="bg-petrolio/40 border border-white/5 p-8 text-center font-body text-xs text-nebbia/30">
                            Nessuna registrazione a giornale. Le scritture nascono dall'imputazione dei movimenti o inserendole a mano.
                        </div>
                    ) : registrazioni.map(r => (
                        <div key={r.id} className="bg-slate border border-white/5 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-body text-sm text-nebbia">{new Date(r.data).toLocaleDateString('it-IT')}</span>
                                        <span className="font-body text-sm text-nebbia/70 truncate">{r.descrizione}</span>
                                        {r.tipo !== 'ordinaria' && (
                                            <span className="font-body text-[10px] px-1.5 py-0.5 border border-white/10 text-nebbia/40 uppercase tracking-wider">{TIPO_REG[r.tipo] ?? r.tipo}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-display text-sm text-oro">€ {fmtEUR(totaleRiga(r.righe))}</span>
                                    <button onClick={() => setDaEliminare(r)} title="Elimina registrazione"
                                        className="w-6 h-6 flex items-center justify-center text-nebbia/30 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                                </div>
                            </div>
                            <div className="mt-2 border-t border-white/5 pt-2 space-y-0.5">
                                {(r.righe ?? []).map(rg => (
                                    <div key={rg.id} className="grid grid-cols-[1fr_auto_auto] gap-3 font-body text-xs">
                                        <span className="text-nebbia/60 truncate">{rg.conto ? `${rg.conto.numero} · ${rg.conto.nome}` : '—'}</span>
                                        <span className="text-right text-nebbia/70 w-28">{Number(rg.dare) ? `€ ${fmtEUR(rg.dare)}` : ''}</span>
                                        <span className="text-right text-nebbia/70 w-28">{Number(rg.avere) ? `€ ${fmtEUR(rg.avere)}` : ''}</span>
                                    </div>
                                ))}
                                <div className="grid grid-cols-[1fr_auto_auto] gap-3 font-body text-[10px] text-nebbia/30 uppercase tracking-widest pt-1">
                                    <span></span><span className="text-right w-28">Dare</span><span className="text-right w-28">Avere</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {form && (
                <FormRegistrazione
                    clienteId={clienteId} mandatoId={mandatoId} conti={conti}
                    onClose={() => setForm(false)}
                    onSaved={() => { setForm(false); carica() }}
                />
            )}

            {daEliminare && (
                <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDaEliminare(null)}>
                    <div className="bg-slate border border-red-500/30 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 p-5 border-b border-white/8">
                            <Trash2 size={16} className="text-red-400" />
                            <h2 className="font-display text-lg text-nebbia">Elimina registrazione</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="font-body text-sm text-nebbia/60">
                                Vuoi eliminare la registrazione <span className="text-nebbia">{daEliminare.descrizione}</span> del {new Date(daEliminare.data).toLocaleDateString('it-IT')}?
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setDaEliminare(null)} className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5">Annulla</button>
                                <button onClick={elimina} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/15 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/25 transition-colors"><Trash2 size={14} /> Elimina</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Vista piano dei conti (raggruppato per classe) ───
function PianoContiVista({ conti }) {
    const classi = [...new Set(conti.map(c => c.classe))].sort((a, b) => a - b)
    return (
        <div className="space-y-4">
            {classi.map(cl => (
                <div key={cl} className="bg-slate border border-white/5">
                    <div className="px-4 py-2 border-b border-white/5">
                        <p className="section-label !m-0">{cl} — {NOME_CLASSE[cl] ?? 'Altro'}</p>
                    </div>
                    <div className="divide-y divide-white/5">
                        {conti.filter(c => c.classe === cl).map(c => (
                            <div key={c.id} className="flex items-center gap-3 px-4 py-1.5">
                                <span className="font-mono text-xs text-oro/70 w-12">{c.numero}</span>
                                <span className="font-body text-sm text-nebbia/70 flex-1">{c.nome}</span>
                                {!c.attivo && <span className="font-body text-[10px] text-nebbia/25">disattivo</span>}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─── Form nuova registrazione (libro giornale) ───
function FormRegistrazione({ clienteId, mandatoId, conti, onClose, onSaved }) {
    const [data, setData] = useState(oggiISO())
    const [descrizione, setDescrizione] = useState('')
    const [tipo, setTipo] = useState('ordinaria')
    const [righe, setRighe] = useState([{ conto_id: '', dare: '', avere: '' }, { conto_id: '', dare: '', avere: '' }])
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape' && !salvando) onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose, salvando])

    const setRiga = (i, campo, val) => setRighe(rs => rs.map((r, j) => j === i ? { ...r, [campo]: val } : r))
    const addRiga = () => setRighe(rs => [...rs, { conto_id: '', dare: '', avere: '' }])
    const rmRiga = (i) => setRighe(rs => rs.length > 2 ? rs.filter((_, j) => j !== i) : rs)

    const totDare = righe.reduce((t, r) => t + num(r.dare), 0)
    const totAvere = righe.reduce((t, r) => t + num(r.avere), 0)
    const diff = Math.round((totDare - totAvere) * 100) / 100
    const valide = righe.filter(r => r.conto_id && (num(r.dare) > 0 || num(r.avere) > 0))
    const bilanciato = diff === 0 && totDare > 0 && valide.length >= 2

    async function salva() {
        if (!descrizione.trim()) { setErrore('La descrizione è obbligatoria.'); return }
        if (!bilanciato) { setErrore('La registrazione deve essere bilanciata (dare = avere).'); return }
        setSalvando(true); setErrore('')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setErrore('Sessione scaduta.'); setSalvando(false); return }
        const { data: profilo } = await supabase.from('profiles').select('studio_id').eq('id', user.id).single()

        const { data: reg, error: errReg } = await supabase.from('registrazioni').insert({
            cliente_id: clienteId, mandato_id: mandatoId ?? null, data, descrizione: descrizione.trim(), tipo,
            avvocato_id: user.id, studio_id: profilo?.studio_id ?? null, creato_da: user.id, aggiornato_da: user.id,
        }).select('id').single()
        if (errReg) { setErrore(errReg.message); setSalvando(false); return }

        const payload = valide.map((r, i) => ({
            registrazione_id: reg.id, conto_id: r.conto_id,
            dare: num(r.dare), avere: num(r.avere), ordine: i,
        }))
        const { error: errRighe } = await supabase.from('righe_registrazione').insert(payload)
        setSalvando(false)
        if (errRighe) {
            // rollback testata se le righe falliscono (es. sbilanciamento dal trigger DB)
            await supabase.from('registrazioni').delete().eq('id', reg.id)
            setErrore(errRighe.message)
            return
        }
        onSaved()
    }

    const inputCls = "w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-2.5 py-1.5 outline-none focus:border-oro/50"

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm" onClick={() => { if (!salvando) onClose() }}>
            <div className="bg-slate border border-white/10 w-full max-w-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-oro" />
                        <p className="font-display text-lg text-nebbia">Nuova registrazione</p>
                    </div>
                    <button onClick={onClose} disabled={salvando} className="p-1 hover:bg-white/5 transition-colors disabled:opacity-40"><X size={18} className="text-nebbia/60" /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="grid grid-cols-[140px_1fr_150px] gap-3">
                        <div>
                            <label className="block font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">Data</label>
                            <input type="date" value={data} onChange={e => setData(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className="block font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">Descrizione</label>
                            <input value={descrizione} onChange={e => setDescrizione(e.target.value)} placeholder="es. Fattura n. 12 - cliente Alfa" className={inputCls} autoFocus />
                        </div>
                        <div>
                            <label className="block font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">Tipo</label>
                            <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputCls}>
                                <option value="ordinaria">Ordinaria</option>
                                <option value="apertura">Apertura</option>
                                <option value="rettifica">Rettifica</option>
                                <option value="chiusura">Chiusura</option>
                            </select>
                        </div>
                    </div>

                    {/* Righe dare/avere */}
                    <div>
                        <div className="grid grid-cols-[1fr_120px_120px_28px] gap-2 font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1.5 px-1">
                            <span>Conto</span><span className="text-right">Dare</span><span className="text-right">Avere</span><span></span>
                        </div>
                        <div className="space-y-1.5">
                            {righe.map((r, i) => (
                                <div key={i} className="grid grid-cols-[1fr_120px_120px_28px] gap-2 items-center">
                                    <select value={r.conto_id} onChange={e => setRiga(i, 'conto_id', e.target.value)} className={inputCls}>
                                        <option value="">Scegli conto…</option>
                                        {conti.filter(c => c.attivo).map(c => (
                                            <option key={c.id} value={c.id}>{c.numero} · {c.nome}</option>
                                        ))}
                                    </select>
                                    <input value={r.dare} onChange={e => setRiga(i, 'dare', e.target.value)} onFocus={() => r.avere && setRiga(i, 'avere', '')}
                                        inputMode="decimal" placeholder="0,00" className={`${inputCls} text-right`} />
                                    <input value={r.avere} onChange={e => setRiga(i, 'avere', e.target.value)} onFocus={() => r.dare && setRiga(i, 'dare', '')}
                                        inputMode="decimal" placeholder="0,00" className={`${inputCls} text-right`} />
                                    <button onClick={() => rmRiga(i)} disabled={righe.length <= 2}
                                        className="w-7 h-7 flex items-center justify-center text-nebbia/30 hover:text-red-400 disabled:opacity-20 transition-colors"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                        <button onClick={addRiga} className="mt-2 flex items-center gap-1.5 font-body text-xs text-nebbia/50 hover:text-oro transition-colors">
                            <Plus size={12} /> Aggiungi riga
                        </button>
                    </div>

                    {/* Totali + bilanciamento */}
                    <div className="grid grid-cols-[1fr_120px_120px_28px] gap-2 border-t border-white/10 pt-2 font-body text-sm">
                        <span className={`${bilanciato ? 'text-salvia' : 'text-nebbia/40'} flex items-center gap-1.5`}>
                            {bilanciato ? <><Check size={13} /> Registrazione bilanciata</> : diff !== 0 ? `Sbilancio di € ${fmtEUR(Math.abs(diff))}` : 'Inserisci le righe dare/avere'}
                        </span>
                        <span className="text-right text-nebbia">€ {fmtEUR(totDare)}</span>
                        <span className="text-right text-nebbia">€ {fmtEUR(totAvere)}</span>
                        <span></span>
                    </div>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 shrink-0">
                    <button onClick={onClose} disabled={salvando} className="font-body text-sm text-nebbia/60 hover:text-nebbia px-4 py-2 disabled:opacity-40">Annulla</button>
                    <button onClick={salva} disabled={salvando || !bilanciato}
                        className="flex items-center gap-2 px-5 py-2 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {salvando ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : 'Registra'}
                    </button>
                </div>
            </div>
        </div>
    )
}
