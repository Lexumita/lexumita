// src/components/fisco/DelegheFiscali.jsx
//
// Registro delle deleghe al cassetto fiscale: chi l'ha data e quando scade.
// La scadenza vera la calcola il DB (fisco_scadenza_delega): delega unica
// dall'8 dicembre 2025 = 31 dicembre del quarto anno successivo; le deleghe
// precedenti tengono la loro scadenza, ma non oltre il 28 febbraio 2027.

import { useEffect, useState } from 'react'
import { KeyRound, Plus, Loader2, AlertTriangle, Trash2 } from 'lucide-react'
import { Badge, EmptyState } from '@/components/shared'
import { supabase } from '@/lib/supabase'
import { nomeClienteDoc, nomeDaProfilo, fmtData, oggiISO } from '@/lib/fisco'

const STATI = {
    attiva: { label: 'Attiva', variant: 'salvia' },
    in_scadenza: { label: 'In scadenza', variant: 'warning' },
    scaduta: { label: 'Scaduta', variant: 'red' },
    revocata: { label: 'Revocata', variant: 'gray' },
}

const INIZIO_DELEGA_UNICA = '2025-12-08'
const TETTO_VECCHIE = '2027-02-28'

const CAMPO = 'w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 transition-colors'
const ETICHETTA = 'block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-1.5'
const BOTTONE = 'flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 border border-white/10 text-nebbia/60 font-body text-sm hover:text-oro hover:border-oro/30 transition-colors'

// Solo anteprima mentre si compila: la regola vera è nel DB
function scadenzaPrevista(iso) {
    if (!iso) return null
    const [anno, mese, giorno] = iso.split('-')
    if (iso >= INIZIO_DELEGA_UNICA) return `${Number(anno) + 4}-12-31`
    const quattroAnni = `${Number(anno) + 4}-${mese}-${giorno}`
    return quattroAnni < TETTO_VECCHIE ? quattroAnni : TETTO_VECCHIE
}

export default function DelegheFiscali({ clienteId = null, clienti = [], meId }) {
    const [deleghe, setDeleghe] = useState([])
    const [loading, setLoading] = useState(true)
    const [aperto, setAperto] = useState(false)
    const [form, setForm] = useState({ cliente_id: clienteId ?? '', data_conferimento: oggiISO() })
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')

    async function carica() {
        let q = supabase.from('v_deleghe_fiscali').select('*').order('data_scadenza', { ascending: true })
        if (clienteId) q = q.eq('cliente_id', clienteId)
        const { data } = await q
        setDeleghe(data ?? [])
        setLoading(false)
    }

    useEffect(() => { carica() }, [clienteId])

    async function registra(e) {
        e.preventDefault()
        if (!form.cliente_id || !form.data_conferimento) return
        setSalvando(true)
        setErrore('')
        const { error } = await supabase.from('deleghe_fiscali').insert({
            cliente_id: form.cliente_id,
            professionista_id: meId,
            data_conferimento: form.data_conferimento,
        })
        setSalvando(false)
        if (error) {
            setErrore(error.code === '23505' ? 'Questa delega è già registrata.' : error.message)
            return
        }
        setAperto(false)
        setForm({ cliente_id: clienteId ?? '', data_conferimento: oggiISO() })
        carica()
    }

    async function aggiorna(id, campi) {
        setErrore('')
        const { error } = await supabase.from('deleghe_fiscali').update(campi).eq('id', id)
        if (error) setErrore(error.code === '23505' ? 'Esiste già una delega con questa data.' : error.message)
        carica()
    }

    async function elimina(d) {
        if (!confirm('Togliere questa delega dal registro?')) return
        await supabase.from('deleghe_fiscali').delete().eq('id', d.id)
        carica()
    }

    const vecchie = deleghe.filter(d => !d.revocata_il && d.data_conferimento < INIZIO_DELEGA_UNICA)
    const anteprima = scadenzaPrevista(form.data_conferimento)

    return (
        <div className="space-y-4">
            {vecchie.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-900/10 border border-amber-500/20">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="font-body text-sm text-amber-300/90 leading-relaxed">
                        {vecchie.length === 1 ? '1 delega è stata conferita' : `${vecchie.length} deleghe sono state conferite`} prima
                        dell'8 dicembre 2025: {vecchie.length === 1 ? 'scade' : 'scadono'} al più tardi il 28 febbraio 2027.
                        Rinnovale con la nuova delega unica, che vale fino al 31 dicembre del quarto anno successivo.
                    </p>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-body text-sm text-nebbia/40">
                    {deleghe.length > 0 && `${deleghe.length} ${deleghe.length === 1 ? 'delega' : 'deleghe'} al cassetto fiscale`}
                </p>
                {!aperto && (
                    <button type="button" onClick={() => setAperto(true)} className="btn-secondary text-sm">
                        <Plus size={14} /> Registra una delega
                    </button>
                )}
            </div>

            {aperto && (
                <form onSubmit={registra} className="bg-slate border border-oro/20 p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {!clienteId && (
                            <div>
                                <label className={ETICHETTA}>Cliente</label>
                                <select
                                    required
                                    className={CAMPO}
                                    value={form.cliente_id}
                                    onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
                                >
                                    <option value="">Scegli…</option>
                                    {clienti.map(c => <option key={c.id} value={c.id}>{nomeDaProfilo(c) || 'Cliente'}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className={ETICHETTA}>Conferita il</label>
                            <input
                                type="date"
                                required
                                max={oggiISO()}
                                className={CAMPO}
                                value={form.data_conferimento}
                                onChange={e => setForm(f => ({ ...f, data_conferimento: e.target.value }))}
                            />
                        </div>
                    </div>
                    {anteprima && <p className="font-body text-xs text-nebbia/50">Scade il {fmtData(anteprima)}.</p>}
                    {errore && <p className="font-body text-xs text-red-400">{errore}</p>}
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={salvando} className="btn-primary text-sm">
                            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Registra
                        </button>
                        <button type="button" onClick={() => { setAperto(false); setErrore('') }} className={BOTTONE}>
                            Annulla
                        </button>
                    </div>
                </form>
            )}

            {!aperto && errore && <p className="font-body text-xs text-red-400">{errore}</p>}

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 size={20} className="animate-spin text-oro" />
                </div>
            ) : deleghe.length === 0 ? (
                <EmptyState
                    icon={KeyRound}
                    title="Nessuna delega registrata"
                    desc="Tieni traccia delle deleghe al cassetto fiscale dei tuoi clienti e di quando scadono."
                />
            ) : (
                <div className="bg-slate border border-white/5 divide-y divide-white/5">
                    {deleghe.map(d => {
                        const st = STATI[d.stato] ?? STATI.attiva
                        const mia = d.professionista_id === meId
                        return (
                            <div key={d.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {!clienteId && (
                                            <p className="font-body text-sm text-nebbia break-words">{nomeClienteDoc(d) || 'Cliente'}</p>
                                        )}
                                        <Badge label={st.label} variant={st.variant} />
                                    </div>
                                    <p className="font-body text-xs text-nebbia/40 mt-1">
                                        Conferita il {fmtData(d.data_conferimento)} · {d.stato === 'revocata'
                                            ? `revocata il ${fmtData(d.revocata_il)}`
                                            : `scade il ${fmtData(d.data_scadenza)}`}
                                        {d.stato === 'in_scadenza' && ` (tra ${d.giorni_alla_scadenza} giorni)`}
                                    </p>
                                </div>
                                {mia && d.stato !== 'revocata' && (
                                    <div className="grid grid-cols-[1fr_1fr_auto] lg:flex gap-2">
                                        <button type="button" onClick={() => aggiorna(d.id, { data_conferimento: oggiISO(), scadenza_manuale: null })} className={BOTTONE}>
                                            Rinnovata oggi
                                        </button>
                                        <button type="button" onClick={() => aggiorna(d.id, { revocata_il: oggiISO() })} className={BOTTONE}>
                                            Revocata
                                        </button>
                                        <button type="button" onClick={() => elimina(d)} aria-label="Togli dal registro" className={`${BOTTONE} hover:!text-red-400 hover:!border-red-500/30`}>
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
