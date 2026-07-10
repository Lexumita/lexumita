// src/components/commercialista/EntrateUscite.jsx
//
// Conto economico del cliente-azienda: entrate e uscite, con 3 contatori.
//   - Box 1: mese navigabile — entrate e uscite del mese selezionato
//   - Box 2: Totale Uscite dell'anno (costi registrati)
//   - Box 3: Totale Entrate dell'anno
//
// Port dal fiduciario CH, adattato IT (EUR). Gli STIPENDI dei dipendenti
// (che su CH entrano nei totali) arriveranno con la Fase 4: qui i totali
// girano sui soli movimenti registrati.
//
// Props:
//   clienteId  (string)       - cliente-azienda
//   mandatoId  (string|null)  - se presente, movimenti del mandato; altrimenti del cliente
//   anno       (number|null)  - anno di riferimento iniziale (dal mandato)
//   onMovimentiChange()       - notifica ai box collegati (budget, liquidità, report)

import { useState, useEffect } from 'react'
import {
    TrendingUp, TrendingDown, Plus, ChevronLeft, ChevronRight,
    Trash2, Edit2, AlertCircle, Scale, Paperclip, ShieldAlert, Users as UsersIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtEUR } from '@/lib/cassa'
import { costoPersonaleMeseAttivi, costoPersonaleProRataAnno, bonusDelMese, bonusDellAnnoX } from '@/lib/salariIT'
import FormMovimento from './FormMovimento'

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const sum = (arr) => arr.reduce((t, m) => t + (Number(m.importo) || 0), 0)

export default function EntrateUscite({ clienteId, mandatoId = null, anno = null, onMovimentiChange, refreshTrigger = 0 }) {
    const annoCorr = new Date().getFullYear()
    const [annoSel, setAnnoSel] = useState(anno ?? annoCorr)
    const [meseSel, setMeseSel] = useState((anno ?? annoCorr) === annoCorr ? new Date().getMonth() : 0)
    const [vista, setVista] = useState('effettivo')   // 'effettivo' | 'previsto'

    const [movimenti, setMovimenti] = useState([])
    const [dipendenti, setDipendenti] = useState([])
    const [bonus, setBonus] = useState([])
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')

    const [form, setForm] = useState(null)          // { tipo, movimento? } | null
    const [daEliminare, setDaEliminare] = useState(null)
    const [eliminando, setEliminando] = useState(false)

    useEffect(() => { carica() }, [clienteId, mandatoId, refreshTrigger])

    async function carica() {
        setLoading(true); setErrore('')
        let qMov = supabase.from('movimenti').select('*, documento:documento_id(titolo)')
        qMov = mandatoId ? qMov.eq('mandato_id', mandatoId) : qMov.eq('cliente_id', clienteId)
        // Il costo del personale (dipendenti/soci del cliente) entra nel conto economico
        // insieme ai movimenti: si carica sempre per cliente (i dipendenti non sono per-mandato).
        const [{ data: mov, error: errMov }, { data: dip }, { data: bon }] = await Promise.all([
            qMov.order('data', { ascending: false }),
            supabase.from('clienti_dipendenti').select('*').eq('cliente_id', clienteId),
            supabase.from('dipendenti_bonus').select('id, importo, data_bonus').eq('cliente_id', clienteId),
        ])
        if (errMov) { setErrore(errMov.message); setMovimenti([]) }
        else setMovimenti(mov ?? [])
        setDipendenti(dip ?? [])
        setBonus(bon ?? [])
        setLoading(false)
    }

    async function elimina() {
        if (!daEliminare) return
        setEliminando(true)
        const { error } = await supabase.from('movimenti').delete().eq('id', daEliminare.id)
        setEliminando(false)
        if (error) { setErrore(error.message); return }
        setDaEliminare(null)
        carica()
        onMovimentiChange?.()
    }

    // Filtri per anno + stato della vista
    const ePrevisto = vista === 'previsto'
    const eStato = (m) => (m.stato ?? 'effettivo') === vista
    const inMese = (m) => {
        const d = new Date(m.data)
        return d.getFullYear() === annoSel && d.getMonth() === meseSel
    }
    const movAnno = movimenti.filter(m => eStato(m) && new Date(m.data).getFullYear() === annoSel)
    const entrateAnnoList = movAnno.filter(m => m.tipo === 'entrata')
    const usciteAnnoList = movAnno.filter(m => m.tipo === 'uscita')

    // Costo del personale: entra solo nel consuntivo (i previsti sono un piano manuale;
    // la proiezione salari sul futuro la fa il motore di liquidità).
    const rilevantiN = dipendenti.filter(d => d.is_dipendente || d.is_socio).length
    const costoPersMese = ePrevisto ? 0 : costoPersonaleMeseAttivi(dipendenti, meseSel, annoSel)
    const bonusMese = ePrevisto ? 0 : bonusDelMese(bonus, meseSel, annoSel)
    const costoPersAnno = ePrevisto ? 0 : costoPersonaleProRataAnno(dipendenti, annoSel)
    const bonusAnno = ePrevisto ? 0 : bonusDellAnnoX(bonus, annoSel)
    const personaleAnno = costoPersAnno + bonusAnno

    // Box 1 — mese navigabile (costi movimenti + costo personale del mese + bonus)
    const entrateMese = sum(movimenti.filter(m => eStato(m) && m.tipo === 'entrata' && inMese(m)))
    const costiMovMese = sum(movimenti.filter(m => eStato(m) && m.tipo === 'uscita' && inMese(m)))
    const usciteMese = costiMovMese + costoPersMese + bonusMese
    const saldoMese = entrateMese - usciteMese

    // Box 2/3 — anno (uscite = costi movimenti + costo del personale annuo)
    const totaleUscite = sum(usciteAnnoList) + personaleAnno
    const totaleEntrate = sum(entrateAnnoList)
    const saldoAnno = totaleEntrate - totaleUscite

    // Anni disponibili
    const anniSet = new Set([annoCorr + 1, annoCorr, annoCorr - 1, annoCorr - 2, annoSel])
    if (anno) anniSet.add(anno)
    movimenti.forEach(m => anniSet.add(new Date(m.data).getFullYear()))
    const anniDisponibili = [...anniSet].sort((a, b) => b - a)

    return (
        <div className="bg-slate border border-white/5 p-6 space-y-5">
            {/* Intestazione + selettore anno */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Scale size={15} className="text-oro/60" />
                    <h2 className="font-display text-lg text-nebbia">Entrate e uscite</h2>
                    {mandatoId && <span className="font-body text-[10px] px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/40 uppercase tracking-wider">Mandato</span>}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex border border-white/10">
                        {[
                            { v: 'effettivo', label: 'Effettivo' },
                            { v: 'previsto', label: 'Previsto' },
                        ].map(({ v, label }) => (
                            <button key={v} onClick={() => setVista(v)}
                                className={`px-3 py-1.5 font-body text-xs transition-colors ${vista === v ? 'bg-oro/15 text-oro' : 'text-nebbia/40 hover:text-nebbia/70'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Anno</span>
                        <select value={annoSel} onChange={e => setAnnoSel(Number(e.target.value))}
                            className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-2.5 py-1.5 outline-none focus:border-oro/50">
                            {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* 3 contatori */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Box 1 — mese navigabile */}
                <div className="bg-slate border border-white/10 p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest truncate">
                            {MESI[meseSel]} {annoSel}{ePrevisto ? ' · previsto' : ''}
                        </p>
                        <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => setMeseSel(m => Math.max(0, m - 1))} disabled={meseSel === 0}
                                className="w-5 h-5 flex items-center justify-center text-nebbia/40 hover:text-oro disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="Mese precedente">
                                <ChevronLeft size={13} />
                            </button>
                            <button onClick={() => setMeseSel(m => Math.min(11, m + 1))} disabled={meseSel === 11}
                                className="w-5 h-5 flex items-center justify-center text-nebbia/40 hover:text-oro disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="Mese successivo">
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="font-body text-xs text-salvia/80 flex items-center gap-1"><TrendingUp size={11} /> Entrate</span>
                            <span className="font-display text-base text-salvia">€ {fmtEUR(entrateMese)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-body text-xs text-oro/80 flex items-center gap-1"><TrendingDown size={11} /> Uscite</span>
                            <span className="font-display text-base text-oro">€ {fmtEUR(usciteMese)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                            <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Saldo</span>
                            <span className={`font-display text-base ${saldoMese >= 0 ? 'text-salvia' : 'text-red-400'}`}>€ {fmtEUR(saldoMese)}</span>
                        </div>
                    </div>
                </div>

                {/* Box 2 — Totale Uscite anno */}
                <div className="bg-slate border border-oro/30 p-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <TrendingDown size={11} className="text-oro" />
                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{ePrevisto ? 'Uscite previste' : 'Uscite'} {annoSel}</p>
                    </div>
                    <p className="font-display text-2xl text-oro">€ {fmtEUR(totaleUscite)}</p>
                    <p className="font-body text-[10px] text-nebbia/25 mt-0.5">
                        {ePrevisto ? 'Costi pianificati dell’anno' : 'Somma dei costi registrati'}
                    </p>
                </div>

                {/* Box 3 — Totale Entrate anno */}
                <div className="bg-slate border border-salvia/30 p-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <TrendingUp size={11} className="text-salvia" />
                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">{ePrevisto ? 'Entrate previste' : 'Entrate'} {annoSel}</p>
                    </div>
                    <p className="font-display text-2xl text-salvia">€ {fmtEUR(totaleEntrate)}</p>
                    <p className="font-body text-[10px] text-nebbia/25 mt-0.5">
                        Saldo {annoSel}: <span className={saldoAnno >= 0 ? 'text-salvia' : 'text-red-400'}>€ {fmtEUR(saldoAnno)}</span>
                    </p>
                </div>
            </div>

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <SezioneMovimenti
                        titolo="Entrate" tipo="entrata" movimenti={entrateAnnoList}
                        onNuovo={() => setForm({ tipo: 'entrata', valoriIniziali: { stato: vista } })}
                        onModifica={(m) => setForm({ tipo: m.tipo, movimento: m })}
                        onElimina={setDaEliminare}
                    />
                    <SezioneMovimenti
                        titolo="Uscite" tipo="uscita" movimenti={usciteAnnoList}
                        onNuovo={() => setForm({ tipo: 'uscita', valoriIniziali: { stato: vista } })}
                        onModifica={(m) => setForm({ tipo: m.tipo, movimento: m })}
                        onElimina={setDaEliminare}
                        rigaTesta={ePrevisto || personaleAnno <= 0 ? null : (
                            <div className="flex items-start justify-between gap-3 p-3 bg-petrolio/60 border border-oro/15">
                                <div className="flex items-start gap-2.5 min-w-0">
                                    <UsersIcon size={14} className="text-oro/60 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="font-body text-sm text-nebbia">Costo del personale {annoSel}</p>
                                        <p className="font-body text-[11px] text-nebbia/30 mt-0.5">{rilevantiN} {rilevantiN === 1 ? 'persona' : 'persone'} · lordo + oneri + TFR{bonusAnno > 0 ? ` · € ${fmtEUR(bonusAnno)} di bonus` : ''}</p>
                                    </div>
                                </div>
                                <span className="font-display text-sm text-oro shrink-0">€ {fmtEUR(personaleAnno)}</span>
                            </div>
                        )}
                    />
                </div>
            )}

            {/* Modal nuovo/modifica */}
            {form && (
                <FormMovimento
                    tipo={form.tipo}
                    clienteId={clienteId}
                    mandatoId={mandatoId}
                    movimento={form.movimento ?? null}
                    valoriIniziali={form.valoriIniziali ?? null}
                    onClose={() => setForm(null)}
                    onSaved={() => { setForm(null); carica(); onMovimentiChange?.() }}
                />
            )}

            {/* Conferma eliminazione */}
            {daEliminare && (
                <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => { if (!eliminando) setDaEliminare(null) }}>
                    <div className="bg-slate border border-red-500/30 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 p-5 border-b border-white/8">
                            <Trash2 size={16} className="text-red-400" />
                            <h2 className="font-display text-lg text-nebbia">Elimina movimento</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                                Vuoi eliminare <span className="text-nebbia font-medium">{daEliminare.descrizione}</span> (€ {fmtEUR(daEliminare.importo)})? L'operazione non è reversibile.
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setDaEliminare(null)} disabled={eliminando}
                                    className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">
                                    Annulla
                                </button>
                                <button onClick={elimina} disabled={eliminando}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/15 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/25 transition-colors disabled:opacity-40">
                                    {eliminando
                                        ? <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
                                        : <><Trash2 size={14} /> Elimina</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Sezione lista (Entrate o Uscite)
function SezioneMovimenti({ titolo, tipo, movimenti, onNuovo, onModifica, onElimina, rigaTesta = null }) {
    const eEntrata = tipo === 'entrata'
    const accent = eEntrata ? 'text-salvia' : 'text-oro'
    const RICORR_LABEL = { mensile: 'mensile', trimestrale: 'trimestrale', annuale: 'annuale' }
    return (
        <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {eEntrata ? <TrendingUp size={14} className={accent} /> : <TrendingDown size={14} className={accent} />}
                    <p className="section-label !m-0">{titolo} ({movimenti.length})</p>
                </div>
                <button onClick={onNuovo}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/10 border border-oro/30 text-oro font-body text-xs hover:bg-oro/20 transition-colors">
                    <Plus size={11} /> {eEntrata ? 'Nuova entrata' : 'Nuovo costo'}
                </button>
            </div>

            <div className="space-y-2">
                {rigaTesta}
                {movimenti.length === 0 && !rigaTesta ? (
                    <div className="flex flex-col items-center justify-center py-8 text-nebbia/30 text-center bg-petrolio/40 border border-white/5">
                        {eEntrata ? <TrendingUp size={18} className="mb-2 text-nebbia/20" /> : <TrendingDown size={18} className="mb-2 text-nebbia/20" />}
                        <span className="font-body text-xs">{eEntrata ? 'Nessuna entrata registrata' : 'Nessun costo registrato'}</span>
                    </div>
                ) : movimenti.map(m => (
                    <div key={m.id} className="group flex items-start justify-between gap-3 p-3 bg-petrolio border border-white/5 hover:border-white/10 transition-colors">
                        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onModifica(m)}>
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-body text-sm text-nebbia truncate">{m.descrizione}</p>
                                {m.categoria && (
                                    <span className="font-body text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 text-nebbia/40">{m.categoria}</span>
                                )}
                                {m.ricorrenza && m.ricorrenza !== 'una_tantum' && (
                                    <span className="font-body text-[10px] px-1.5 py-0.5 border border-oro/20 text-oro/60" title="Movimento ricorrente">↻ {RICORR_LABEL[m.ricorrenza] ?? m.ricorrenza}</span>
                                )}
                                {m.origine === 'ocr' && !m.verificato && (
                                    <span className="inline-flex items-center gap-1 font-body text-[10px] px-1.5 py-0.5 border border-amber-400/30 text-amber-400" title="Movimento estratto automaticamente, da verificare">
                                        <ShieldAlert size={9} /> da verificare
                                    </span>
                                )}
                            </div>
                            <p className="font-body text-[11px] text-nebbia/30 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>{new Date(m.data).toLocaleDateString('it-IT')}</span>
                                {m.documento && (
                                    <span className="inline-flex items-center gap-1 text-nebbia/40"><Paperclip size={9} /> {m.documento.titolo}</span>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className={`font-display text-sm ${accent}`}>€ {fmtEUR(m.importo)}</span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onModifica(m)} title="Modifica"
                                    className="w-6 h-6 flex items-center justify-center text-nebbia/30 hover:text-oro transition-colors">
                                    <Edit2 size={12} />
                                </button>
                                <button onClick={() => onElimina(m)} title="Elimina"
                                    className="w-6 h-6 flex items-center justify-center text-nebbia/30 hover:text-red-400 transition-colors">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
