// src/components/commercialista/FormDipendente.jsx
//
// Modal per creare o modificare un dipendente/socio di un cliente-azienda.
// Port dal fiduciario CH adattato IT: anagrafica italiana (codice fiscale),
// inquadramento (qualifica/contratto/CCNL) e aliquote per il COSTO AZIENDALE
// (INPS datore, INAIL, TFR) impostate sul dipendente, con anteprima del costo.
//
// Props:
//   clienteId   (string)      - cliente-azienda (obbligatorio)
//   dipendente  (object|null) - se passato, modalità modifica; altrimenti crea
//   onClose(), onSaved(), onBonusCambiato()

import { useState, useEffect } from 'react'
import { X, User, Briefcase, Building2, Percent, Loader2, AlertCircle, Plus, Trash2, Gift, Check, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { lordoMensile, oneriMensili, costoAziendaMensile, fmtEUR } from '@/lib/salariIT'

const QUALIFICHE = ['operaio', 'impiegato', 'quadro', 'dirigente', 'apprendista']
const CONTRATTI = ['indeterminato', 'determinato', 'apprendistato', 'somministrazione', 'collaborazione']

export default function FormDipendente({ clienteId, dipendente = null, onClose, onSaved, onBonusCambiato = null }) {
    const isModifica = !!dipendente

    // Anagrafica
    const [nome, setNome] = useState(dipendente?.nome ?? '')
    const [cognome, setCognome] = useState(dipendente?.cognome ?? '')
    const [dataNascita, setDataNascita] = useState(dipendente?.data_nascita ?? '')
    const [codiceFiscale, setCodiceFiscale] = useState(dipendente?.codice_fiscale ?? '')

    // Ruolo in azienda
    const [isSocio, setIsSocio] = useState(dipendente?.is_socio ?? false)
    const [isDipendente, setIsDipendente] = useState(dipendente?.is_dipendente ?? true)
    const [ruolo, setRuolo] = useState(dipendente?.ruolo ?? '')
    const [quota, setQuota] = useState(dipendente?.quota_partecipazione ?? '')

    // Rapporto di lavoro
    const [dataAssunzione, setDataAssunzione] = useState(dipendente?.data_assunzione ?? '')
    const [dataFine, setDataFine] = useState(dipendente?.data_fine ?? '')
    const [percentuale, setPercentuale] = useState(dipendente?.percentuale_impiego ?? '')
    const [salario, setSalario] = useState(dipendente?.salario ?? '')
    const [salarioPeriodicita, setSalarioPeriodicita] = useState(dipendente?.salario_periodicita ?? 'annuo')

    // Inquadramento IT
    const [qualifica, setQualifica] = useState(dipendente?.qualifica ?? '')
    const [tipoContratto, setTipoContratto] = useState(dipendente?.tipo_contratto ?? '')
    const [livelloCcnl, setLivelloCcnl] = useState(dipendente?.livello_ccnl ?? '')

    // Aliquote costo aziendale
    const [inps, setInps] = useState(dipendente?.aliquota_inps_datore ?? 30)
    const [inail, setInail] = useState(dipendente?.aliquota_inail ?? 1)
    const [tfr, setTfr] = useState(dipendente?.aliquota_tfr ?? 6.91)

    // Note
    const [note, setNote] = useState(dipendente?.note ?? '')

    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState(null)
    const [toast, setToast] = useState(false)

    // Bonus (solo in modifica)
    const [bonus, setBonus] = useState([])
    const [caricandoBonus, setCaricandoBonus] = useState(false)
    const [nuovoBonusImporto, setNuovoBonusImporto] = useState('')
    const [nuovoBonusData, setNuovoBonusData] = useState('')
    const [nuovoBonusDescr, setNuovoBonusDescr] = useState('')
    const [salvandoBonus, setSalvandoBonus] = useState(false)

    useEffect(() => { if (dipendente?.id) caricaBonus() }, [dipendente?.id])

    async function caricaBonus() {
        if (!dipendente?.id) return
        setCaricandoBonus(true)
        const { data } = await supabase.from('dipendenti_bonus')
            .select('id, importo, data_bonus, descrizione')
            .eq('dipendente_id', dipendente.id)
            .order('data_bonus', { ascending: false })
        setBonus(data ?? [])
        setCaricandoBonus(false)
    }

    async function aggiungiBonus() {
        const imp = Number(nuovoBonusImporto)
        if (!imp || imp <= 0 || !nuovoBonusData) { setErrore('Inserisci importo e data del bonus.'); return }
        setSalvandoBonus(true); setErrore(null)
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profilo } = await supabase.from('profiles').select('studio_id').eq('id', user.id).single()
        const { error } = await supabase.from('dipendenti_bonus').insert({
            dipendente_id: dipendente.id, cliente_id: clienteId, avvocato_id: user.id,
            studio_id: profilo?.studio_id ?? null, importo: imp, data_bonus: nuovoBonusData,
            descrizione: nuovoBonusDescr.trim() || null, creato_da: user.id,
        })
        setSalvandoBonus(false)
        if (error) { setErrore(error.message); return }
        setNuovoBonusImporto(''); setNuovoBonusData(''); setNuovoBonusDescr('')
        caricaBonus(); onBonusCambiato?.()
    }

    async function eliminaBonus(id) {
        setSalvandoBonus(true)
        await supabase.from('dipendenti_bonus').delete().eq('id', id)
        setSalvandoBonus(false)
        caricaBonus(); onBonusCambiato?.()
    }

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape' && !salvando) onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose, salvando])

    const puoSalvare = nome.trim() && cognome.trim() && (isSocio || isDipendente)

    // Anteprima costo aziendale mensile con le aliquote correnti
    const anteprima = (() => {
        const d = { salario, salario_periodicita: salarioPeriodicita, aliquota_inps_datore: inps, aliquota_inail: inail, aliquota_tfr: tfr }
        const lordo = lordoMensile(d)
        if (!lordo) return null
        return { lordo, oneri: oneriMensili(d), costo: costoAziendaMensile(d) }
    })()

    async function salva() {
        if (!puoSalvare) { setErrore('Nome, cognome e almeno un ruolo (dipendente o socio) sono obbligatori.'); return }
        setSalvando(true); setErrore(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setErrore('Sessione scaduta.'); setSalvando(false); return }
        const { data: profilo } = await supabase.from('profiles').select('studio_id').eq('id', user.id).single()

        const num = v => { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return isNaN(n) ? null : n }
        const txt = v => (v?.toString().trim() ? v.toString().trim() : null)

        const payload = {
            cliente_id: clienteId,
            nome: nome.trim(), cognome: cognome.trim(),
            data_nascita: dataNascita || null,
            codice_fiscale: txt(codiceFiscale),
            is_socio: isSocio, is_dipendente: isDipendente,
            ruolo: txt(ruolo),
            quota_partecipazione: isSocio ? num(quota) : null,
            data_assunzione: isDipendente ? (dataAssunzione || null) : null,
            data_fine: isDipendente ? (dataFine || null) : null,
            percentuale_impiego: isDipendente ? num(percentuale) : null,
            salario: isDipendente ? num(salario) : null,
            salario_periodicita: isDipendente ? salarioPeriodicita : 'annuo',
            qualifica: isDipendente ? (qualifica || null) : null,
            tipo_contratto: isDipendente ? (tipoContratto || null) : null,
            livello_ccnl: isDipendente ? txt(livelloCcnl) : null,
            aliquota_inps_datore: num(inps) ?? 30,
            aliquota_inail: num(inail) ?? 1,
            aliquota_tfr: num(tfr) ?? 6.91,
            note: txt(note),
            aggiornato_da: user.id,
        }

        let error
        if (isModifica) {
            ({ error } = await supabase.from('clienti_dipendenti').update(payload).eq('id', dipendente.id))
        } else {
            ({ error } = await supabase.from('clienti_dipendenti').insert({
                ...payload, avvocato_id: user.id, studio_id: profilo?.studio_id ?? null, creato_da: user.id,
            }))
        }

        setSalvando(false)
        if (error) { setErrore(error.message); return }
        setToast(true)
        setTimeout(() => onSaved(), 900)
    }

    const inputCls = "w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
    const labelCls = "block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2"

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm" onClick={() => { if (!salvando) onClose() }}>
            <div className="bg-slate border border-white/10 w-full max-w-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] relative" onClick={e => e.stopPropagation()}>
                {toast && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-salvia/20 border border-salvia/40 text-salvia font-body text-sm shadow-lg">
                        <Check size={14} /> Salvato
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                    <div>
                        <p className="font-display text-lg text-nebbia">{isModifica ? 'Modifica dipendente' : 'Nuovo dipendente'}</p>
                        <p className="font-body text-xs text-nebbia/40 mt-0.5">Anagrafica, inquadramento e costo aziendale</p>
                    </div>
                    <button onClick={onClose} disabled={salvando} className="p-1 hover:bg-white/5 transition-colors disabled:opacity-40"><X size={18} className="text-nebbia/60" /></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* ANAGRAFICA */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2"><User size={13} className="text-oro" /><p className="section-label !m-0">Anagrafica</p></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>Nome</label><input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Cognome</label><input value={cognome} onChange={e => setCognome(e.target.value)} className={inputCls} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>Data di nascita</label><input type="date" value={dataNascita} onChange={e => setDataNascita(e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Codice fiscale</label><input value={codiceFiscale} onChange={e => setCodiceFiscale(e.target.value.toUpperCase())} placeholder="RSSMRA80A01H501U" className={inputCls} /></div>
                        </div>
                    </div>

                    {/* RUOLO IN AZIENDA */}
                    <div className="space-y-4 border-t border-white/8 pt-5">
                        <div className="flex items-center gap-2"><Building2 size={13} className="text-oro" /><p className="section-label !m-0">Ruolo in azienda</p></div>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={isDipendente} onChange={e => setIsDipendente(e.target.checked)} className="accent-oro w-4 h-4" />
                                <span className="font-body text-sm text-nebbia/80">Dipendente</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={isSocio} onChange={e => setIsSocio(e.target.checked)} className="accent-oro w-4 h-4" />
                                <span className="font-body text-sm text-nebbia/80">Socio</span>
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>Mansione</label><input value={ruolo} onChange={e => setRuolo(e.target.value)} placeholder="es. Responsabile vendite" className={inputCls} /></div>
                            {isSocio && (
                                <div><label className={labelCls}>Quota %</label><input type="number" step="0.01" min="0" max="100" value={quota} onChange={e => setQuota(e.target.value)} placeholder="es. 50" className={inputCls} /></div>
                            )}
                        </div>
                    </div>

                    {/* RAPPORTO DI LAVORO + INQUADRAMENTO (solo dipendente) */}
                    {isDipendente && (
                        <>
                            <div className="space-y-4 border-t border-white/8 pt-5">
                                <div className="flex items-center gap-2"><Briefcase size={13} className="text-oro" /><p className="section-label !m-0">Rapporto di lavoro</p></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelCls}>Data assunzione</label><input type="date" value={dataAssunzione} onChange={e => setDataAssunzione(e.target.value)} className={inputCls} /></div>
                                    <div><label className={labelCls}>Data cessazione <span className="text-nebbia/25 normal-case tracking-normal">(se cessato)</span></label><input type="date" value={dataFine} onChange={e => setDataFine(e.target.value)} className={inputCls} /></div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div><label className={labelCls}>Impiego %</label><input type="number" step="1" min="0" max="100" value={percentuale} onChange={e => setPercentuale(e.target.value)} placeholder="100" className={inputCls} /></div>
                                    <div><label className={labelCls}>Retribuzione lorda</label><input type="number" step="0.01" min="0" value={salario} onChange={e => setSalario(e.target.value)} placeholder="0,00" className={inputCls} /></div>
                                    <div><label className={labelCls}>Periodicità</label>
                                        <select value={salarioPeriodicita} onChange={e => setSalarioPeriodicita(e.target.value)} className={inputCls}>
                                            <option value="annuo">Annua (RAL)</option>
                                            <option value="mensile">Mensile</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div><label className={labelCls}>Qualifica</label>
                                        <select value={qualifica} onChange={e => setQualifica(e.target.value)} className={inputCls}>
                                            <option value="">—</option>
                                            {QUALIFICHE.map(q => <option key={q} value={q}>{q.charAt(0).toUpperCase() + q.slice(1)}</option>)}
                                        </select>
                                    </div>
                                    <div><label className={labelCls}>Tipo contratto</label>
                                        <select value={tipoContratto} onChange={e => setTipoContratto(e.target.value)} className={inputCls}>
                                            <option value="">—</option>
                                            {CONTRATTI.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                                        </select>
                                    </div>
                                    <div><label className={labelCls}>Livello CCNL</label><input value={livelloCcnl} onChange={e => setLivelloCcnl(e.target.value)} placeholder="es. 5° livello" className={inputCls} /></div>
                                </div>
                            </div>

                            {/* COSTO AZIENDALE — aliquote + anteprima */}
                            <div className="space-y-4 border-t border-white/8 pt-5">
                                <div className="flex items-center gap-2"><Percent size={13} className="text-oro" /><p className="section-label !m-0">Costo aziendale</p></div>
                                <p className="font-body text-[11px] text-nebbia/30 -mt-2">Aliquote a carico dell'azienda, da adeguare al CCNL/inquadramento del dipendente.</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div><label className={labelCls}>INPS datore %</label><input type="number" step="0.01" min="0" value={inps} onChange={e => setInps(e.target.value)} className={inputCls} /></div>
                                    <div><label className={labelCls}>INAIL %</label><input type="number" step="0.01" min="0" value={inail} onChange={e => setInail(e.target.value)} className={inputCls} /></div>
                                    <div><label className={labelCls}>TFR %</label><input type="number" step="0.01" min="0" value={tfr} onChange={e => setTfr(e.target.value)} className={inputCls} /></div>
                                </div>
                                {anteprima && (
                                    <div className="bg-petrolio/50 border border-oro/20 p-4 space-y-1.5">
                                        <div className="flex items-center justify-between"><span className="font-body text-xs text-nebbia/50">Lordo mensile</span><span className="font-body text-sm text-nebbia">{fmtEUR(anteprima.lordo)}</span></div>
                                        <div className="flex items-center justify-between"><span className="font-body text-xs text-nebbia/50">Oneri INPS + INAIL + TFR</span><span className="font-body text-sm text-nebbia/70">{fmtEUR(anteprima.oneri.totale)}</span></div>
                                        <div className="flex items-center justify-between pt-1.5 border-t border-white/10"><span className="font-body text-xs text-oro/80 uppercase tracking-widest">Costo azienda / mese</span><span className="font-display text-lg text-oro">{fmtEUR(anteprima.costo)}</span></div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* NOTE */}
                    <div className="border-t border-white/8 pt-5">
                        <label className={labelCls}>Note <span className="text-nebbia/25 normal-case tracking-normal">(opzionale)</span></label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Annotazioni sul rapporto di lavoro..." className={`${inputCls} resize-none`} />
                    </div>

                    {/* BONUS */}
                    <div className="border-t border-white/8 pt-5 space-y-3">
                        <div className="flex items-center gap-2"><Gift size={13} className="text-oro" /><p className="section-label !m-0">Premi e bonus</p></div>
                        {isModifica ? (
                            <>
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-3"><label className={labelCls}>Importo</label><input type="number" step="0.01" min="0" value={nuovoBonusImporto} onChange={e => setNuovoBonusImporto(e.target.value)} placeholder="0,00" className={inputCls} /></div>
                                    <div className="col-span-3"><label className={labelCls}>Data</label><input type="date" value={nuovoBonusData} onChange={e => setNuovoBonusData(e.target.value)} className={inputCls} /></div>
                                    <div className="col-span-4"><label className={labelCls}>Descrizione</label><input value={nuovoBonusDescr} onChange={e => setNuovoBonusDescr(e.target.value)} placeholder="es. Premio produzione" className={inputCls} /></div>
                                    <div className="col-span-2">
                                        <button type="button" onClick={aggiungiBonus} disabled={salvandoBonus}
                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-oro/10 border border-oro/30 text-oro hover:bg-oro/20 font-body text-xs transition-colors disabled:opacity-40">
                                            {salvandoBonus ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={12} /> Aggiungi</>}
                                        </button>
                                    </div>
                                </div>
                                {caricandoBonus ? (
                                    <div className="flex items-center justify-center py-3"><Loader2 size={16} className="animate-spin text-oro" /></div>
                                ) : bonus.length > 0 && (
                                    <div className="border border-white/8 divide-y divide-white/5">
                                        {bonus.map(b => (
                                            <div key={b.id} className="flex items-center gap-2 px-3 py-2 group">
                                                <Gift size={12} className="text-oro/50 shrink-0" />
                                                <span className="font-body text-sm text-oro font-medium shrink-0">{fmtEUR(b.importo)}</span>
                                                <span className="font-body text-xs text-nebbia/40 flex items-center gap-1 shrink-0"><Calendar size={10} /> {new Date(b.data_bonus).toLocaleDateString('it-IT')}</span>
                                                {b.descrizione && <span className="font-body text-xs text-nebbia/40 truncate flex-1">{b.descrizione}</span>}
                                                <button type="button" onClick={() => eliminaBonus(b.id)} disabled={salvandoBonus} className="ml-auto text-nebbia/25 hover:text-red-400 transition-colors shrink-0 disabled:opacity-40" title="Elimina bonus"><Trash2 size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p className="font-body text-[11px] text-nebbia/25 italic">I bonus confluiscono nel costo del personale del mese in cui cadono.</p>
                            </>
                        ) : (
                            <p className="font-body text-xs text-nebbia/40 bg-petrolio/40 border border-white/5 p-3 leading-relaxed">Salva prima il dipendente per aggiungere premi e bonus.</p>
                        )}
                    </div>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 shrink-0">
                    <button onClick={onClose} disabled={salvando} className="font-body text-sm text-nebbia/60 hover:text-nebbia px-4 py-2 transition-colors disabled:opacity-40">Annulla</button>
                    <button onClick={salva} disabled={!puoSalvare || salvando}
                        className="flex items-center gap-2 px-5 py-2 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {salvando ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : (isModifica ? 'Salva modifiche' : 'Aggiungi')}
                    </button>
                </div>
            </div>
        </div>
    )
}
