// src/components/ContropartiBox.jsx
// Componente CRUD per gestire le controparti di una pratica.
// Va inserito dentro PraticaDettaglio.jsx nella colonna sinistra.

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Plus, X, Edit2, Trash2, Check, AlertCircle,
    User, Building2, ChevronDown, ChevronRight,
    Scale
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
const RUOLI = [
    { v: '', l: '— Seleziona ruolo —' },
    { v: 'convenuto', l: 'Convenuto' },
    { v: 'co_convenuto', l: 'Co-convenuto' },
    { v: 'attore', l: 'Attore' },
    { v: 'co_attore', l: 'Co-attore' },
    { v: 'imputato', l: 'Imputato' },
    { v: 'co_imputato', l: 'Co-imputato' },
    { v: 'parte_civile', l: 'Parte civile' },
    { v: 'persona_offesa', l: 'Persona offesa' },
    { v: 'ricorrente', l: 'Ricorrente' },
    { v: 'resistente', l: 'Resistente' },
    { v: 'opponente', l: 'Opponente' },
    { v: 'opposto', l: 'Opposto' },
    { v: 'terzo_chiamato', l: 'Terzo chiamato' },
    { v: 'litisconsorte', l: 'Litisconsorte' },
    { v: 'altro', l: 'Altro' },
]

function labelRuolo(v) {
    return RUOLI.find(r => r.v === v)?.l ?? v
}

// ─────────────────────────────────────────────────────────────
// SWITCHER PF / PG (riusabile, simile a Clienti.jsx)
// ─────────────────────────────────────────────────────────────
function SwitcherTipo({ value, onChange }) {
    return (
        <div className="flex gap-1 bg-petrolio border border-white/10 p-1 w-fit">
            <button type="button"
                onClick={() => onChange('persona_fisica')}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-body text-xs transition-colors ${value === 'persona_fisica'
                    ? 'bg-oro/10 text-oro border border-oro/30'
                    : 'text-nebbia/40 hover:text-nebbia'}`}>
                <User size={11} /> Persona fisica
            </button>
            <button type="button"
                onClick={() => onChange('persona_giuridica')}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-body text-xs transition-colors ${value === 'persona_giuridica'
                    ? 'bg-oro/10 text-oro border border-oro/30'
                    : 'text-nebbia/40 hover:text-nebbia'}`}>
                <Building2 size={11} /> Persona giuridica
            </button>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// FORM (usato sia per nuovo che per modifica)
// ─────────────────────────────────────────────────────────────
function FormControparte({ controparte, praticaId, onSalvato, onAnnulla }) {
    const isEdit = !!controparte?.id

    const [tipo, setTipo] = useState(controparte?.tipo_soggetto ?? 'persona_fisica')
    const [form, setForm] = useState({
        ruolo: controparte?.ruolo ?? '',
        // PF
        nome: controparte?.nome ?? '',
        cognome: controparte?.cognome ?? '',
        cf: controparte?.cf ?? '',
        data_nascita: controparte?.data_nascita ?? '',
        luogo_nascita: controparte?.luogo_nascita ?? '',
        // PG
        ragione_sociale: controparte?.ragione_sociale ?? '',
        partita_iva: controparte?.partita_iva ?? '',
        sede_legale: controparte?.sede_legale ?? '',
        rappr_nome: controparte?.rappr_nome ?? '',
        rappr_cognome: controparte?.rappr_cognome ?? '',
        rappr_cf: controparte?.rappr_cf ?? '',
        rappr_carica: controparte?.rappr_carica ?? '',
        // Contatti
        email: controparte?.email ?? '',
        telefono: controparte?.telefono ?? '',
        pec: controparte?.pec ?? '',
        // Indirizzo
        indirizzo: controparte?.indirizzo ?? '',
        comune: controparte?.comune ?? '',
        provincia: controparte?.provincia ?? '',
        cap: controparte?.cap ?? '',
        // Legale avversario
        legale_nome: controparte?.legale_nome ?? '',
        legale_cognome: controparte?.legale_cognome ?? '',
        legale_foro: controparte?.legale_foro ?? '',
        legale_pec: controparte?.legale_pec ?? '',
        legale_albo: controparte?.legale_albo ?? '',
        // Note
        note: controparte?.note ?? '',
    })
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')
    const [mostraLegale, setMostraLegale] = useState(
        !!(controparte?.legale_nome || controparte?.legale_cognome || controparte?.legale_foro)
    )

    const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

    async function handleSalva() {
        setErrore('')
        if (tipo === 'persona_fisica') {
            if (!form.nome.trim()) return setErrore('Nome obbligatorio')
            if (!form.cognome.trim()) return setErrore('Cognome obbligatorio')
        } else {
            if (!form.ragione_sociale.trim()) return setErrore('Ragione sociale obbligatoria')
        }

        setSalvando(true)
        try {
            const payload = {
                pratica_id: praticaId,
                tipo_soggetto: tipo,
                ruolo: form.ruolo || null,
                cf: form.cf?.trim() || null,
                indirizzo: form.indirizzo?.trim() || null,
                comune: form.comune?.trim() || null,
                provincia: form.provincia?.trim().toUpperCase() || null,
                cap: form.cap?.trim() || null,
                email: form.email?.trim() || null,
                telefono: form.telefono?.trim() || null,
                pec: form.pec?.trim() || null,
                legale_nome: form.legale_nome?.trim() || null,
                legale_cognome: form.legale_cognome?.trim() || null,
                legale_foro: form.legale_foro?.trim() || null,
                legale_pec: form.legale_pec?.trim() || null,
                legale_albo: form.legale_albo?.trim() || null,
                note: form.note?.trim() || null,
            }

            if (tipo === 'persona_fisica') {
                payload.nome = form.nome.trim()
                payload.cognome = form.cognome.trim()
                payload.data_nascita = form.data_nascita || null
                payload.luogo_nascita = form.luogo_nascita?.trim() || null
                // Pulisci campi PG
                payload.ragione_sociale = null
                payload.partita_iva = null
                payload.sede_legale = null
                payload.rappr_nome = null
                payload.rappr_cognome = null
                payload.rappr_cf = null
                payload.rappr_carica = null
            } else {
                payload.ragione_sociale = form.ragione_sociale.trim()
                payload.partita_iva = form.partita_iva?.trim() || null
                payload.sede_legale = form.sede_legale?.trim() || null
                payload.rappr_nome = form.rappr_nome?.trim() || null
                payload.rappr_cognome = form.rappr_cognome?.trim() || null
                payload.rappr_cf = form.rappr_cf?.trim() || null
                payload.rappr_carica = form.rappr_carica?.trim() || null
                // Pulisci campi PF
                payload.nome = null
                payload.cognome = null
                payload.data_nascita = null
                payload.luogo_nascita = null
            }

            if (isEdit) {
                const { error } = await supabase.from('controparti').update(payload).eq('id', controparte.id)
                if (error) throw new Error(error.message)
            } else {
                const { error } = await supabase.from('controparti').insert(payload)
                if (error) throw new Error(error.message)
            }

            onSalvato()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvando(false)
        }
    }

    function Field({ label, type = 'text', placeholder = '', name, colSpan = 1 }) {
        return (
            <div style={{ gridColumn: `span ${colSpan}` }}>
                <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1.5">{label}</label>
                <input type={type} placeholder={placeholder} {...f(name)}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
            </div>
        )
    }

    return (
        <div className="bg-petrolio/40 border border-oro/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
                <p className="font-body text-sm font-medium text-oro">
                    {isEdit ? 'Modifica controparte' : 'Nuova controparte'}
                </p>
                <button onClick={onAnnulla} className="text-nebbia/30 hover:text-nebbia transition-colors">
                    <X size={14} />
                </button>
            </div>

            {/* Tipo soggetto */}
            <SwitcherTipo value={tipo} onChange={setTipo} />

            {/* Ruolo processuale */}
            <div>
                <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1.5">Ruolo processuale</label>
                <select value={form.ruolo} onChange={e => setForm(p => ({ ...p, ruolo: e.target.value }))}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50">
                    {RUOLI.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                </select>
            </div>

            {/* Anagrafici condizionali */}
            {tipo === 'persona_fisica' ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Nome *" name="nome" placeholder="Tizio" />
                        <Field label="Cognome *" name="cognome" placeholder="Caio" />
                    </div>
                    <Field label="Codice fiscale" name="cf" placeholder="TZICAI70A01H501Z" />
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Data nascita" type="date" name="data_nascita" />
                        <Field label="Luogo nascita" name="luogo_nascita" placeholder="Roma" />
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <Field label="Ragione sociale *" name="ragione_sociale" placeholder="Alfa Srl" />
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Partita IVA" name="partita_iva" placeholder="12345678901" />
                        <Field label="Codice fiscale" name="cf" placeholder="se diverso da P.IVA" />
                    </div>
                    <Field label="Sede legale" name="sede_legale" placeholder="Via Roma 1, Milano" />
                    <div className="border-t border-white/8 pt-3 space-y-3">
                        <p className="font-body text-[10px] text-nebbia/40 tracking-widest uppercase">Rappresentante legale</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Nome" name="rappr_nome" />
                            <Field label="Cognome" name="rappr_cognome" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="CF rappresentante" name="rappr_cf" />
                            <Field label="Carica" name="rappr_carica" placeholder="Es. Amministratore Unico" />
                        </div>
                    </div>
                </div>
            )}

            {/* Indirizzo */}
            <div className="border-t border-white/8 pt-3 space-y-3">
                <p className="font-body text-[10px] text-nebbia/40 tracking-widest uppercase">Indirizzo</p>
                <Field label="Indirizzo" name="indirizzo" placeholder="Via Garibaldi 5" />
                <div className="grid grid-cols-3 gap-3">
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1.5">Comune</label>
                        <input {...f('comune')} placeholder="Milano"
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                    </div>
                    <div>
                        <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1.5">Prov.</label>
                        <input {...f('provincia')} maxLength={2} placeholder="MI"
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25 uppercase" />
                    </div>
                </div>
                <Field label="CAP" name="cap" placeholder="20100" />
            </div>

            {/* Contatti */}
            <div className="border-t border-white/8 pt-3 space-y-3">
                <p className="font-body text-[10px] text-nebbia/40 tracking-widest uppercase">Contatti</p>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Email" type="email" name="email" />
                    <Field label="Telefono" name="telefono" />
                </div>
                <Field label="PEC" type="email" name="pec" placeholder="esempio@pec.it" />
            </div>

            {/* Legale avversario (collassabile) */}
            <div className="border-t border-white/8 pt-3">
                <button type="button" onClick={() => setMostraLegale(v => !v)}
                    className="flex items-center gap-2 font-body text-xs text-nebbia/50 hover:text-oro transition-colors w-full">
                    {mostraLegale ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Scale size={11} />
                    <span className="tracking-widest uppercase">Legale avversario</span>
                    <span className="text-nebbia/30 normal-case tracking-normal">— se noto</span>
                </button>
                {mostraLegale && (
                    <div className="space-y-3 mt-3 pl-2">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Nome" name="legale_nome" />
                            <Field label="Cognome" name="legale_cognome" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Foro" name="legale_foro" placeholder="Foro di Milano" />
                            <Field label="N. albo" name="legale_albo" />
                        </div>
                        <Field label="PEC legale" type="email" name="legale_pec" />
                    </div>
                )}
            </div>

            {/* Note */}
            <div className="border-t border-white/8 pt-3">
                <label className="block font-body text-[10px] text-nebbia/40 tracking-widest uppercase mb-1.5">Note</label>
                <textarea rows={2} {...f('note')}
                    placeholder="Note libere sulla controparte..."
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
            </div>

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={13} /> {errore}
                </div>
            )}

            <div className="flex gap-2">
                <button onClick={handleSalva} disabled={salvando}
                    className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40">
                    {salvando
                        ? <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
                        : <><Check size={13} /> {isEdit ? 'Salva modifiche' : 'Aggiungi controparte'}</>
                    }
                </button>
                <button onClick={onAnnulla} className="px-4 py-2 border border-white/10 text-nebbia/40 font-body text-sm hover:text-nebbia transition-colors">
                    Annulla
                </button>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// CARD CONTROPARTE (vista compatta)
// ─────────────────────────────────────────────────────────────
function CardControparte({ c, onModifica, onElimina }) {
    const isPF = c.tipo_soggetto === 'persona_fisica'
    const nomeMostrato = isPF
        ? `${c.nome ?? ''} ${c.cognome ?? ''}`.trim()
        : (c.ragione_sociale ?? '—')

    const indirizzoMostrato = [
        c.indirizzo,
        [c.cap, c.comune].filter(Boolean).join(' '),
        c.provincia ? `(${c.provincia})` : null
    ].filter(Boolean).join(', ')

    return (
        <div className="bg-petrolio/40 border border-white/8 p-3 group hover:border-white/15 transition-colors">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isPF
                            ? <User size={11} className="text-nebbia/40 shrink-0" />
                            : <Building2 size={11} className="text-nebbia/40 shrink-0" />
                        }
                        <p className="font-body text-sm font-medium text-nebbia">{nomeMostrato}</p>
                        {c.ruolo && (
                            <span className="font-body text-[10px] text-nebbia/50 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">
                                {labelRuolo(c.ruolo)}
                            </span>
                        )}
                    </div>

                    {(c.cf || c.partita_iva) && (
                        <p className="font-mono text-[11px] text-nebbia/40 mt-1">
                            {c.partita_iva && <>P.IVA {c.partita_iva}</>}
                            {c.partita_iva && c.cf && ' · '}
                            {c.cf && <>CF {c.cf}</>}
                        </p>
                    )}

                    {indirizzoMostrato && (
                        <p className="font-body text-xs text-nebbia/45 mt-1">{indirizzoMostrato}</p>
                    )}

                    {!isPF && (c.rappr_nome || c.rappr_cognome) && (
                        <p className="font-body text-xs text-nebbia/40 mt-1.5">
                            <span className="text-nebbia/30">Rappr.:</span>{' '}
                            {`${c.rappr_nome ?? ''} ${c.rappr_cognome ?? ''}`.trim()}
                            {c.rappr_carica && <span className="text-nebbia/30"> ({c.rappr_carica})</span>}
                        </p>
                    )}

                    {(c.legale_nome || c.legale_cognome) && (
                        <p className="font-body text-xs text-nebbia/40 mt-1.5 flex items-center gap-1">
                            <Scale size={9} className="text-nebbia/30" />
                            avv. {`${c.legale_nome ?? ''} ${c.legale_cognome ?? ''}`.trim()}
                            {c.legale_foro && <span className="text-nebbia/30"> · {c.legale_foro}</span>}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => onModifica(c)} title="Modifica"
                        className="w-6 h-6 flex items-center justify-center text-nebbia/30 hover:text-oro hover:bg-oro/10 transition-colors">
                        <Edit2 size={11} />
                    </button>
                    <button onClick={() => onElimina(c)} title="Elimina"
                        className="w-6 h-6 flex items-center justify-center text-nebbia/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={11} />
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function ContropartiBox({ praticaId }) {
    const [controparti, setControparti] = useState([])
    const [loading, setLoading] = useState(true)
    const [mostraForm, setMostraForm] = useState(false)
    const [inModifica, setInModifica] = useState(null)

    async function carica() {
        setLoading(true)
        const { data } = await supabase
            .from('controparti')
            .select('*')
            .eq('pratica_id', praticaId)
            .order('ordine', { ascending: true })
            .order('created_at', { ascending: true })
        setControparti(data ?? [])
        setLoading(false)
    }

    useEffect(() => { carica() }, [praticaId])

    async function elimina(c) {
        const nome = c.tipo_soggetto === 'persona_fisica'
            ? `${c.nome ?? ''} ${c.cognome ?? ''}`.trim()
            : (c.ragione_sociale ?? '')
        if (!confirm(`Eliminare la controparte "${nome}"?`)) return
        await supabase.from('controparti').delete().eq('id', c.id)
        setControparti(prev => prev.filter(x => x.id !== c.id))
    }

    function apriNuovo() {
        setInModifica(null)
        setMostraForm(true)
    }

    function apriModifica(c) {
        setInModifica(c)
        setMostraForm(true)
    }

    async function onSalvato() {
        setMostraForm(false)
        setInModifica(null)
        await carica()
    }

    function annulla() {
        setMostraForm(false)
        setInModifica(null)
    }

    return (
        <div className="bg-slate border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <p className="section-label flex items-center gap-2">
                    <Scale size={12} className="text-oro/60" />
                    Controparti ({controparti.length})
                </p>
                {!mostraForm && (
                    <button onClick={apriNuovo}
                        className="flex items-center gap-1.5 font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors">
                        <Plus size={11} /> Aggiungi controparte
                    </button>
                )}
            </div>

            {/* Form (nuovo o modifica) */}
            {mostraForm && (
                <div className="mb-3">
                    <FormControparte
                        controparte={inModifica}
                        praticaId={praticaId}
                        onSalvato={onSalvato}
                        onAnnulla={annulla}
                    />
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center py-6">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : controparti.length === 0 && !mostraForm ? (
                <div className="border border-dashed border-white/10 p-6 text-center">
                    <Scale size={20} className="text-nebbia/15 mx-auto mb-2" />
                    <p className="font-body text-sm text-nebbia/30">Nessuna controparte</p>
                    <p className="font-body text-xs text-nebbia/20 mt-1">
                        Aggiungile per generare correttamente gli atti
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {controparti.map(c => (
                        <CardControparte
                            key={c.id}
                            c={c}
                            onModifica={apriModifica}
                            onElimina={elimina}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}