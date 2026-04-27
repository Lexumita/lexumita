import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
    X, Save, Calendar, MapPin, User as UserIcon, Gavel,
    AlertCircle, Loader2, Trash2, FileText
} from 'lucide-react'

// Tipi udienza raggruppati per area
const TIPI_UDIENZA = {
    'Civile': [
        'Prima comparizione (art. 183 c.p.c.)',
        'Trattazione',
        'Istruttoria - prove orali',
        'Istruttoria - CTU',
        'Discussione orale',
        'Precisazione conclusioni',
        'Decisione',
    ],
    'Penale': [
        'Udienza preliminare (GUP)',
        'Convalida arresto/fermo',
        'Riesame',
        'Dibattimento',
        'Esame imputato',
        'Esame testi',
        'Discussione finale',
        'Lettura sentenza',
    ],
    'Lavoro': [
        'Discussione (rito Fornero)',
        'Tentativo di conciliazione',
        'Istruttoria',
    ],
    'Amministrativo/Tributario': [
        'Camera di consiglio',
        'Udienza pubblica',
        'Cautelare (sospensiva)',
        'Pubblica discussione',
    ],
    'Famiglia/Minori': [
        'Comparizione personale parti',
        'Audizione minore',
        'Camera di consiglio (famiglia)',
    ],
    'Esecuzioni/Fallimentare': [
        'Esecutiva immobiliare',
        'Esecutiva mobiliare',
        'Verifica crediti',
        'Dichiarazione fallimento',
        'Adunanza creditori',
    ],
    'Arbitrato/Mediazione': [
        'Mediazione',
        'Arbitrato',
        'Conciliazione',
    ],
}

const STATI = [
    { value: 'programmata', label: 'Programmata', color: 'salvia' },
    { value: 'svolta', label: 'Svolta', color: 'oro' },
    { value: 'rinviata', label: 'Rinviata', color: 'amber' },
    { value: 'annullata', label: 'Annullata', color: 'red' },
]

const STATO_COLORS = {
    salvia: 'bg-salvia/10 border-salvia/30 text-salvia',
    oro: 'bg-oro/10 border-oro/30 text-oro',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
}

/**
 * Modale per creare o modificare un'udienza.
 *
 * Props:
 * - praticaId: UUID della pratica
 * - praticaTitolo: titolo per descrizione appuntamento sincronizzato
 * - clienteId: opzionale, per popolare appuntamento
 * - udienza: oggetto udienza esistente (null per nuova)
 * - onClose: callback quando chiude (con o senza salvataggio)
 * - onSaved: callback dopo salvataggio riuscito
 * - onDeleted: callback dopo eliminazione
 */
export default function UdienzaModal({
    praticaId, praticaTitolo, clienteId,
    udienza, onClose, onSaved, onDeleted,
}) {
    const isNew = !udienza?.id

    // ── Stato form ──
    const [form, setForm] = useState({
        data: udienza?.data_ora?.slice(0, 10) ?? '',
        ora: udienza?.data_ora?.slice(11, 16) ?? '09:00',
        durata_minuti: udienza?.durata_minuti ?? 120,
        tipo: udienza?.tipo ?? '',
        tipo_libero: '',
        oggetto: udienza?.oggetto ?? '',
        tribunale: udienza?.tribunale ?? '',
        sezione: udienza?.sezione ?? '',
        aula: udienza?.aula ?? '',
        giudice: udienza?.giudice ?? '',
        stato: udienza?.stato ?? 'programmata',
        esito: udienza?.esito ?? '',
        data_rinvio: udienza?.data_rinvio?.slice(0, 10) ?? '',
        note_preparazione: udienza?.note_preparazione ?? '',
    })

    // Se il tipo esistente non è nella lista predefinita, è "Altro"
    const tipiTutti = Object.values(TIPI_UDIENZA).flat()
    const tipoEAltro = udienza?.tipo && !tipiTutti.includes(udienza.tipo)

    const [usaTipoLibero, setUsaTipoLibero] = useState(tipoEAltro)
    useEffect(() => {
        if (tipoEAltro) setForm(f => ({ ...f, tipo_libero: udienza.tipo }))
    }, [])

    // ── Tracking dirty ──
    const valoriIniziali = useRef(JSON.stringify(form))
    const [dirty, setDirty] = useState(false)

    useEffect(() => {
        setDirty(JSON.stringify(form) !== valoriIniziali.current)
    }, [form])

    // ── Salvataggio / errore ──
    const [salvando, setSalvando] = useState(false)
    const [eliminando, setEliminando] = useState(false)
    const [errore, setErrore] = useState('')
    const [confermaUscita, setConfermaUscita] = useState(false)
    const [confermaElimina, setConfermaElimina] = useState(false)

    function aggiorna(campo, valore) {
        setForm(prev => ({ ...prev, [campo]: valore }))
    }

    // Chiusura con dirty check
    function tentativoChiusura() {
        if (dirty) setConfermaUscita(true)
        else onClose()
    }

    // Listener Esc
    useEffect(() => {
        function handleEsc(e) {
            if (e.key === 'Escape') tentativoChiusura()
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [dirty])

    // ── Validazione + salvataggio ──
    async function salva() {
        setErrore('')

        // Validazioni base
        if (!form.data) return setErrore('La data è obbligatoria')
        const tipoFinale = usaTipoLibero ? form.tipo_libero.trim() : form.tipo
        if (!tipoFinale) return setErrore('Seleziona o specifica un tipo di udienza')
        if (form.stato === 'rinviata' && !form.data_rinvio) {
            return setErrore('Per le udienze rinviate, indica la data di rinvio')
        }

        setSalvando(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            // Costruisci data_ora
            const dataOra = new Date(`${form.data}T${form.ora || '09:00'}:00`)

            const payload = {
                pratica_id: praticaId,
                data_ora: dataOra.toISOString(),
                durata_minuti: parseInt(form.durata_minuti) || 120,
                tipo: tipoFinale,
                oggetto: form.oggetto || null,
                tribunale: form.tribunale || null,
                sezione: form.sezione || null,
                aula: form.aula || null,
                giudice: form.giudice || null,
                stato: form.stato,
                esito: form.esito || null,
                data_rinvio: form.stato === 'rinviata' && form.data_rinvio
                    ? new Date(`${form.data_rinvio}T09:00:00`).toISOString()
                    : null,
                note_preparazione: form.note_preparazione || null,
            }

            let udienzaId = udienza?.id
            let appuntamentoId = udienza?.appuntamento_id

            if (isNew) {
                payload.creato_da = user.id
                const { data, error } = await supabase
                    .from('udienze')
                    .insert(payload)
                    .select('id')
                    .single()
                if (error) throw new Error(error.message)
                udienzaId = data.id
            } else {
                const { error } = await supabase
                    .from('udienze')
                    .update(payload)
                    .eq('id', udienza.id)
                if (error) throw new Error(error.message)
            }

            // ── Sync con appuntamenti (calendario) ──
            // Solo se stato = programmata (non sincronizziamo annullate/svolte)
            if (form.stato === 'programmata') {
                const fineCalc = new Date(dataOra.getTime() + (parseInt(form.durata_minuti) || 120) * 60000)
                const titoloApp = `Udienza — ${tipoFinale}${praticaTitolo ? ` (${praticaTitolo})` : ''}`

                const appPayload = {
                    avvocato_id: user.id,
                    pratica_id: praticaId,
                    cliente_id: clienteId ?? null,
                    tipo: 'udienza',
                    titolo: titoloApp,
                    stato: 'programmato',
                    data_ora_inizio: dataOra.toISOString(),
                    data_ora_fine: fineCalc.toISOString(),
                    luogo: [form.tribunale, form.sezione, form.aula].filter(Boolean).join(' - ') || null,
                    note: form.oggetto || null,
                }

                if (appuntamentoId) {
                    await supabase.from('appuntamenti').update(appPayload).eq('id', appuntamentoId)
                } else {
                    const { data: newApp } = await supabase
                        .from('appuntamenti')
                        .insert(appPayload)
                        .select('id')
                        .single()
                    if (newApp) {
                        appuntamentoId = newApp.id
                        await supabase.from('udienze').update({ appuntamento_id: newApp.id }).eq('id', udienzaId)
                    }
                }
            } else if (appuntamentoId) {
                // Stato non programmata: rimuovi l'appuntamento dal calendario
                await supabase.from('appuntamenti').delete().eq('id', appuntamentoId)
                await supabase.from('udienze').update({ appuntamento_id: null }).eq('id', udienzaId)
            }

            // OK: chiudi la modale
            valoriIniziali.current = JSON.stringify(form)
            setDirty(false)
            if (onSaved) await onSaved()
            onClose()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    async function elimina() {
        if (!udienza?.id) return
        setEliminando(true)
        try {
            // Cancella anche l'appuntamento collegato
            if (udienza.appuntamento_id) {
                await supabase.from('appuntamenti').delete().eq('id', udienza.appuntamento_id)
            }
            const { error } = await supabase.from('udienze').delete().eq('id', udienza.id)
            if (error) throw new Error(error.message)
            if (onDeleted) await onDeleted()
            onClose()
        } catch (e) {
            setErrore(e.message)
            setEliminando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center px-4 py-8 overflow-y-auto"
            onClick={tentativoChiusura}>
            <div className="bg-slate border border-white/10 max-w-2xl w-full my-auto"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Gavel size={16} className="text-oro" />
                        <p className="font-display text-lg font-medium text-nebbia">
                            {isNew ? 'Nuova udienza' : 'Modifica udienza'}
                        </p>
                        {dirty && (
                            <span className="font-body text-xs text-amber-400 border border-amber-500/30 px-2 py-0.5">
                                Modifiche non salvate
                            </span>
                        )}
                    </div>
                    <button onClick={tentativoChiusura} className="text-nebbia/40 hover:text-nebbia transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

                    {/* Stato udienza */}
                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Stato</label>
                        <div className="flex flex-wrap gap-2">
                            {STATI.map(s => (
                                <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => aggiorna('stato', s.value)}
                                    className={`px-3 py-1.5 font-body text-xs border transition-colors ${form.stato === s.value
                                            ? STATO_COLORS[s.color]
                                            : 'border-white/10 text-nebbia/40 hover:border-white/20 hover:text-nebbia/60'
                                        }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Data + ora + durata */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Data *</label>
                            <input
                                type="date"
                                value={form.data}
                                onChange={e => aggiorna('data', e.target.value)}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                        </div>
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Ora</label>
                            <input
                                type="time"
                                value={form.ora}
                                onChange={e => aggiorna('ora', e.target.value)}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                        </div>
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Durata (min)</label>
                            <input
                                type="number"
                                min="15"
                                step="15"
                                value={form.durata_minuti}
                                onChange={e => aggiorna('durata_minuti', e.target.value)}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                        </div>
                    </div>

                    {/* Tipo udienza */}
                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Tipo udienza *</label>
                        {!usaTipoLibero ? (
                            <select
                                value={form.tipo}
                                onChange={e => {
                                    if (e.target.value === '__altro__') {
                                        setUsaTipoLibero(true)
                                        aggiorna('tipo', '')
                                    } else {
                                        aggiorna('tipo', e.target.value)
                                    }
                                }}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            >
                                <option value="">— Seleziona tipo —</option>
                                {Object.entries(TIPI_UDIENZA).map(([gruppo, tipi]) => (
                                    <optgroup key={gruppo} label={gruppo}>
                                        {tipi.map(t => <option key={t} value={t}>{t}</option>)}
                                    </optgroup>
                                ))}
                                <option value="__altro__">+ Altro (specifica)</option>
                            </select>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={form.tipo_libero}
                                    onChange={e => aggiorna('tipo_libero', e.target.value)}
                                    placeholder="Specifica tipo udienza..."
                                    className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                                />
                                <button
                                    onClick={() => { setUsaTipoLibero(false); aggiorna('tipo_libero', '') }}
                                    className="px-3 py-2 border border-white/10 text-nebbia/40 font-body text-xs hover:text-nebbia transition-colors"
                                >
                                    Lista
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Oggetto */}
                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Oggetto</label>
                        <input
                            type="text"
                            value={form.oggetto}
                            onChange={e => aggiorna('oggetto', e.target.value)}
                            placeholder="Es. Discussione testimoniale, comparizione personale parti..."
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                    </div>

                    {/* Sede - tribunale + sezione + aula + giudice */}
                    <div>
                        <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <MapPin size={11} /> Sede
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={form.tribunale}
                                onChange={e => aggiorna('tribunale', e.target.value)}
                                placeholder="Tribunale (es. Milano)"
                                className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <input
                                type="text"
                                value={form.sezione}
                                onChange={e => aggiorna('sezione', e.target.value)}
                                placeholder="Sezione (es. III Civile)"
                                className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <input
                                type="text"
                                value={form.aula}
                                onChange={e => aggiorna('aula', e.target.value)}
                                placeholder="Aula"
                                className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <input
                                type="text"
                                value={form.giudice}
                                onChange={e => aggiorna('giudice', e.target.value)}
                                placeholder="Giudice / Magistrato"
                                className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                        </div>
                    </div>

                    {/* Note preparazione */}
                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <FileText size={11} /> Note preparazione
                        </label>
                        <textarea
                            rows={3}
                            value={form.note_preparazione}
                            onChange={e => aggiorna('note_preparazione', e.target.value)}
                            placeholder="Cosa dire, documenti da portare, punti da affrontare..."
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                        />
                    </div>

                    {/* Esito (solo se stato != programmata) */}
                    {form.stato !== 'programmata' && (
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Esito</label>
                            <textarea
                                rows={3}
                                value={form.esito}
                                onChange={e => aggiorna('esito', e.target.value)}
                                placeholder="Note sull'esito, decisioni assunte, prossimi passi..."
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25"
                            />
                        </div>
                    )}

                    {/* Data di rinvio (solo se stato = rinviata) */}
                    {form.stato === 'rinviata' && (
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Data di rinvio *</label>
                            <input
                                type="date"
                                value={form.data_rinvio}
                                onChange={e => aggiorna('data_rinvio', e.target.value)}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50"
                            />
                            <p className="font-body text-xs text-nebbia/30 mt-2">
                                Suggerimento: dopo aver salvato, crea una nuova udienza per la data di rinvio.
                            </p>
                        </div>
                    )}

                    {/* Errore */}
                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={13} /> {errore}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/5 bg-petrolio/30">
                    {!isNew ? (
                        <button
                            onClick={() => setConfermaElimina(true)}
                            className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={11} /> Elimina udienza
                        </button>
                    ) : <div />}

                    <div className="flex gap-2">
                        <button
                            onClick={tentativoChiusura}
                            className="px-4 py-2 border border-white/10 text-nebbia/50 font-body text-sm hover:text-nebbia transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={salva}
                            disabled={salvando || !dirty}
                            className="flex items-center gap-2 px-4 py-2 bg-oro text-petrolio font-body text-sm hover:bg-oro/90 transition-colors disabled:opacity-40"
                        >
                            {salvando
                                ? <><Loader2 size={13} className="animate-spin" /> Salvataggio...</>
                                : <><Save size={13} /> Salva udienza</>
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* Modale conferma uscita (sopra a quella principale) */}
            {confermaUscita && (
                <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4"
                    onClick={() => setConfermaUscita(false)}>
                    <div className="bg-slate border border-amber-500/30 max-w-sm p-5 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <AlertCircle size={18} className="text-amber-400 shrink-0" />
                            <p className="font-display text-base font-semibold text-nebbia">Modifiche non salvate</p>
                        </div>
                        <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                            Hai apportato modifiche a questa udienza. Se esci ora le perderai.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setConfermaUscita(false)}
                                className="flex-1 px-4 py-2 border border-white/10 text-nebbia/60 font-body text-sm hover:text-nebbia transition-colors">
                                Continua a modificare
                            </button>
                            <button onClick={() => { setConfermaUscita(false); onClose() }}
                                className="flex-1 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 font-body text-sm hover:bg-red-500/20 transition-colors">
                                Esci senza salvare
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modale conferma eliminazione */}
            {confermaElimina && (
                <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4"
                    onClick={() => setConfermaElimina(false)}>
                    <div className="bg-slate border border-red-500/30 max-w-sm p-5 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <Trash2 size={18} className="text-red-400 shrink-0" />
                            <p className="font-display text-base font-semibold text-nebbia">Eliminare l'udienza?</p>
                        </div>
                        <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                            L'udienza e l'eventuale appuntamento collegato nel calendario verranno eliminati. Questa azione non può essere annullata.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setConfermaElimina(false)}
                                className="flex-1 px-4 py-2 border border-white/10 text-nebbia/60 font-body text-sm hover:text-nebbia transition-colors">
                                Annulla
                            </button>
                            <button
                                onClick={elimina}
                                disabled={eliminando}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/15 border border-red-500/40 text-red-400 font-body text-sm hover:bg-red-500/25 transition-colors disabled:opacity-40"
                            >
                                {eliminando
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <><Trash2 size={13} /> Elimina</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}