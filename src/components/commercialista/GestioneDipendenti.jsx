// src/components/commercialista/GestioneDipendenti.jsx
//
// Dipendenti e costo del personale del cliente-azienda. Lista il personale
// (clienti_dipendenti) con il COSTO AZIENDALE (lordo + oneri + TFR), crea/
// modifica via FormDipendente ed elimina. Port dal fiduciario CH adattato IT.
//
// Props:
//   clienteId (string) - cliente-azienda
//   anno      (number) - anno di riferimento (dal mandato)

import { useState, useEffect } from 'react'
import { Plus, Users, Trash2, Edit2, Briefcase, Building2, AlertCircle, Wallet, CalendarRange, Gift, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import FormDipendente from './FormDipendente'
import {
    fmtEUR, fmtSalario, costoAziendaMensile, eAttivoOggi, mesiLavoratiAnno,
    eAttivoNelMese, bonusDelMese, bonusDellAnnoX,
} from '@/lib/salariIT'

export default function GestioneDipendenti({ clienteId, anno = null }) {
    const annoRif = anno ?? new Date().getFullYear()
    const meseIniziale = annoRif === new Date().getFullYear() ? new Date().getMonth() : 0

    const [dipendenti, setDipendenti] = useState([])
    const [bonus, setBonus] = useState([])
    const [meseSel, setMeseSel] = useState(meseIniziale)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState('')
    const [modal, setModal] = useState(null)
    const [daEliminare, setDaEliminare] = useState(null)
    const [eliminando, setEliminando] = useState(false)

    useEffect(() => { carica() }, [clienteId])

    async function carica() {
        setLoading(true); setErrore('')
        const [{ data: dip, error: errDip }, { data: bon }] = await Promise.all([
            supabase.from('clienti_dipendenti').select('*').eq('cliente_id', clienteId).order('cognome', { ascending: true }),
            supabase.from('dipendenti_bonus').select('id, dipendente_id, importo, data_bonus').eq('cliente_id', clienteId),
        ])
        if (errDip) setErrore(errDip.message)
        setDipendenti(dip ?? [])
        setBonus(bon ?? [])
        setLoading(false)
    }

    async function eliminaConferma() {
        if (!daEliminare) return
        setEliminando(true)
        const { error } = await supabase.from('clienti_dipendenti').delete().eq('id', daEliminare.id)
        setEliminando(false)
        if (error) { setErrore(error.message); return }
        setDaEliminare(null)
        carica()
    }

    const nDipendenti = dipendenti.filter(d => d.is_dipendente && eAttivoOggi(d)).length
    const nSoci = dipendenti.filter(d => d.is_socio).length
    const rilevanti = dipendenti.filter(d => d.is_dipendente || d.is_socio)

    // Costo aziendale fisso mensile (attivi oggi, nessun bonus)
    const costoFissoMensile = rilevanti.filter(eAttivoOggi).reduce((t, d) => t + costoAziendaMensile(d), 0)
    // Costo del mese selezionato + bonus del mese
    const costoMeseSel = rilevanti.filter(d => eAttivoNelMese(d, meseSel, annoRif)).reduce((t, d) => t + costoAziendaMensile(d), 0)
    const bonusMeseSel = bonusDelMese(bonus, meseSel, annoRif)
    const uscitaMeseSel = costoMeseSel + bonusMeseSel
    // Costo annuo pro-rata + bonus dell'anno
    const uscitaAnnua = rilevanti.reduce((t, d) => t + costoAziendaMensile(d) * mesiLavoratiAnno(d, annoRif), 0) + bonusDellAnnoX(bonus, annoRif)
    const bonusAnno = bonusDellAnnoX(bonus, annoRif)

    const nomeMeseSel = new Date(annoRif, meseSel, 1).toLocaleDateString('it-IT', { month: 'long' })

    return (
        <div className="space-y-4">
            {/* Intestazione + azione */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="font-body text-sm text-nebbia/40">
                    {dipendenti.length} {dipendenti.length === 1 ? 'persona' : 'persone'}
                    {dipendenti.length > 0 && <span className="ml-2 text-nebbia/25">· {nDipendenti} dipendenti, {nSoci} soci</span>}
                </p>
                <button onClick={() => setModal({ mode: 'nuovo' })} className="btn-primary text-sm flex items-center gap-2"><Plus size={14} /> Aggiungi</button>
            </div>

            {/* Contatori */}
            {dipendenti.length > 0 && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate border border-white/5 p-4">
                            <div className="flex items-center gap-1.5 mb-1.5"><Briefcase size={11} className="text-oro/60" /><p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Dipendenti attivi</p></div>
                            <p className="font-display text-2xl text-nebbia">{nDipendenti}</p>
                        </div>
                        <div className="bg-slate border border-white/5 p-4">
                            <div className="flex items-center gap-1.5 mb-1.5"><Building2 size={11} className="text-salvia/60" /><p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Soci</p></div>
                            <p className="font-display text-2xl text-nebbia">{nSoci}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {/* Costo mese selezionato */}
                        <div className="bg-slate border border-oro/30 p-4">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <Wallet size={11} className="text-oro shrink-0" />
                                    <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest truncate capitalize">{nomeMeseSel} {annoRif}</p>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                    <button onClick={() => setMeseSel(m => Math.max(0, m - 1))} disabled={meseSel === 0} className="w-5 h-5 flex items-center justify-center text-nebbia/40 hover:text-oro disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={13} /></button>
                                    <button onClick={() => setMeseSel(m => Math.min(11, m + 1))} disabled={meseSel === 11} className="w-5 h-5 flex items-center justify-center text-nebbia/40 hover:text-oro disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ChevronRight size={13} /></button>
                                </div>
                            </div>
                            <p className="font-display text-2xl text-oro">{fmtEUR(uscitaMeseSel)}</p>
                            <p className="font-body text-[10px] text-nebbia/25 mt-0.5">{bonusMeseSel > 0 ? `di cui ${fmtEUR(bonusMeseSel)} di bonus` : 'costo aziendale del mese'}</p>
                        </div>

                        {/* Costo fisso mensile */}
                        <div className="bg-slate border border-white/10 p-4">
                            <div className="flex items-center gap-1.5 mb-1.5"><CalendarRange size={11} className="text-nebbia/50" /><p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Costo fisso mensile</p></div>
                            <p className="font-display text-2xl text-nebbia">{fmtEUR(costoFissoMensile)}</p>
                            <p className="font-body text-[10px] text-nebbia/25 mt-0.5">lordo + oneri + TFR, attivi oggi</p>
                        </div>

                        {/* Costo annuo */}
                        <div className="bg-slate border border-oro/30 p-4">
                            <div className="flex items-center gap-1.5 mb-1.5"><Gift size={11} className="text-oro" /><p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Costo personale {annoRif}</p></div>
                            <p className="font-display text-2xl text-oro">{fmtEUR(uscitaAnnua)}</p>
                            <p className="font-body text-[10px] text-nebbia/25 mt-0.5">{bonusAnno > 0 ? `di cui ${fmtEUR(bonusAnno)} di bonus` : 'costo aziendale pro-rata annuo'}</p>
                        </div>
                    </div>
                </div>
            )}

            {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>}

            {/* Lista */}
            {loading ? (
                <div className="flex items-center justify-center py-12"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
            ) : dipendenti.length === 0 ? (
                <div className="bg-slate border border-white/5 p-12 flex flex-col items-center text-center gap-3">
                    <Users size={32} className="text-nebbia/15" />
                    <div>
                        <p className="font-body text-sm text-nebbia/40">Nessun dipendente registrato</p>
                        <p className="font-body text-xs text-nebbia/25 mt-1">Aggiungi il personale del cliente-azienda per calcolare il costo del lavoro.</p>
                    </div>
                </div>
            ) : (
                <div className="bg-slate border border-white/5 overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Nominativo', 'Mansione', 'Tipo', 'Impiego', 'Costo azienda/mese', 'Qualifica', ''].map((h, i) => (
                                    <th key={i} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dipendenti.map(d => {
                                const cessato = d.data_fine && new Date(d.data_fine) < new Date()
                                return (
                                    <tr key={d.id} onClick={() => setModal({ mode: 'modifica', dipendente: d })}
                                        className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-body text-sm font-medium text-nebbia">{d.nome} {d.cognome}</span>
                                                {cessato && <span className="font-body text-[10px] px-1.5 py-0.5 border border-white/10 text-nebbia/30">cessato</span>}
                                            </div>
                                            {d.codice_fiscale && <p className="font-body text-[10px] text-nebbia/25 mt-0.5 font-mono">{d.codice_fiscale}</p>}
                                        </td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/50">{d.ruolo ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {d.is_dipendente && <span className="inline-flex items-center gap-1 font-body text-[10px] px-1.5 py-0.5 border border-oro/30 text-oro"><Briefcase size={9} /> Dipendente</span>}
                                                {d.is_socio && <span className="inline-flex items-center gap-1 font-body text-[10px] px-1.5 py-0.5 border border-salvia/30 text-salvia"><Building2 size={9} /> Socio{d.quota_partecipazione ? ` ${d.quota_partecipazione}%` : ''}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/50">{d.percentuale_impiego ? `${d.percentuale_impiego}%` : '—'}</td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/70 whitespace-nowrap">{d.is_dipendente && d.salario ? fmtEUR(costoAziendaMensile(d)) : (fmtSalario(d) ?? '—')}</td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/50 capitalize">{d.qualifica ?? '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <button onClick={e => { e.stopPropagation(); setModal({ mode: 'modifica', dipendente: d }) }} title="Modifica" className="inline-flex items-center justify-center w-7 h-7 text-nebbia/30 hover:text-oro hover:bg-oro/10 transition-colors"><Edit2 size={13} /></button>
                                                <button onClick={e => { e.stopPropagation(); setDaEliminare(d) }} title="Elimina" className="inline-flex items-center justify-center w-7 h-7 text-nebbia/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {modal && (
                <FormDipendente clienteId={clienteId} dipendente={modal.mode === 'modifica' ? modal.dipendente : null}
                    onClose={() => setModal(null)} onSaved={() => { setModal(null); carica() }} onBonusCambiato={carica} />
            )}

            {daEliminare && (
                <div className="fixed inset-0 z-50 bg-petrolio/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { if (!eliminando) setDaEliminare(null) }}>
                    <div className="bg-slate border border-red-500/30 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 p-5 border-b border-white/8"><Trash2 size={16} className="text-red-400" /><h2 className="font-display text-lg text-nebbia">Elimina dipendente</h2></div>
                        <div className="p-6 space-y-4">
                            <p className="font-body text-sm text-nebbia/60 leading-relaxed">Vuoi eliminare <span className="text-nebbia font-medium">{daEliminare.nome} {daEliminare.cognome}</span>? Verranno rimossi anche i bonus collegati.</p>
                            <div className="flex gap-2">
                                <button onClick={() => setDaEliminare(null)} disabled={eliminando} className="font-body text-sm text-nebbia/60 hover:text-nebbia border border-white/10 px-4 py-2.5 disabled:opacity-40">Annulla</button>
                                <button onClick={eliminaConferma} disabled={eliminando} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/15 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/25 transition-colors disabled:opacity-40">
                                    {eliminando ? <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" /> : <><Trash2 size={14} /> Elimina</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
