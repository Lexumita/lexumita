// src/pages/admin/NormativaDettaglio.jsx
// Pagina dettaglio admin config-driven: gestisce 4 tipi di fonti
// - it       → norme        (per codice)
// - ue       → norme_ue     (per categoria)
// - archivio → norme_archivio (per tipo_atto)
// - sentenze → giurisprudenza (per categoria_lex)

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageHeader, BackButton, Badge } from '@/components/shared'
import { Search, Plus, Edit2, Trash2, AlertCircle, X, RefreshCw } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// CONFIG — una entry per ogni tipo di fonte
// ═══════════════════════════════════════════════════════════════
const CONFIGS = {
    it: {
        tabella: 'norme',
        backLabel: 'Tutti i codici',
        backTo: '/admin/normativa',
        labelHeader: 'Admin — Normativa Italiana',
        // Filtro principale (campo + valore preso da :slug)
        filtroChiave: 'codice',
        // Label del valore filtrato (carica da `codici_norme`)
        labelLookup: { tabella: 'codici_norme', campoCodice: 'codice', campoLabel: 'label' },
        // Colonne select
        selectCampi: 'id, articolo, rubrica, testo, libro, titolo, capo, data_vigenza, data_pubblicazione, urn, vigente, embedding',
        order: { campo: 'articolo', asc: true },
        // Filtro ricerca testuale
        ricercaCampo: 'articolo',
        // Colonne tabella
        colonneTabella: [
            { label: 'Articolo', getter: r => r.articolo, classe: 'font-body text-sm text-oro font-medium' },
            { label: 'Rubrica', getter: r => r.rubrica ?? '—', classe: 'font-body text-sm text-nebbia/50 max-w-sm truncate' },
        ],
        // Form fields per nuovo/modifica
        formCampi: [
            { key: 'articolo', label: 'Articolo', placeholder: 'es. Art. 2118', required: true },
            { key: 'rubrica', label: 'Rubrica', placeholder: 'es. Recesso dal contratto...', required: false },
            { key: 'libro', label: 'Libro', placeholder: 'opzionale', required: false },
            { key: 'titolo', label: 'Titolo', placeholder: 'opzionale', required: false },
            { key: 'capo', label: 'Capo', placeholder: 'opzionale', required: false },
            { key: 'data_vigenza', label: 'Data vigenza', type: 'date', required: false },
            { key: 'data_pubblicazione', label: 'Data pubblicazione', type: 'date', required: false },
            { key: 'urn', label: 'URN', placeholder: 'urn:nir:...', required: false },
            { key: 'vigente', label: 'Vigente', type: 'boolean', required: false },
            { key: 'testo', label: 'Testo', type: 'textarea', required: true },
        ],
        permetteCrea: true,
    },

    ue: {
        tabella: 'norme_ue',
        backLabel: 'Tutte le categorie',
        backTo: '/admin/normativa',
        labelHeader: 'Admin — Normativa UE',
        // UE filtra per categorie_lex (array contains)
        filtroChiave: 'categorie_lex',
        filtroEArray: true,
        labelLookup: { tabella: 'codici_norme_ue', campoCodice: 'codice', campoLabel: 'label' },
        selectCampi: 'id, articolo, rubrica, testo, tipo_elemento, tipo_atto, numero_atto, anno_atto, titolo_doc, titolo_breve, celex, data_pubblicazione, vigente, embedding',
        order: { campo: 'celex', asc: true },
        ricercaCampo: 'articolo',
        colonneTabella: [
            { label: 'Articolo', getter: r => r.articolo, classe: 'font-body text-sm text-oro font-medium' },
            {
                label: 'Documento',
                getter: r => {
                    const meta = [r.tipo_atto, r.numero_atto && r.anno_atto ? `${r.numero_atto}/${r.anno_atto}` : null].filter(Boolean).join(' ')
                    return meta || r.titolo_breve || '—'
                },
                classe: 'font-body text-xs text-nebbia/50 max-w-sm truncate'
            },
            { label: 'Rubrica', getter: r => r.rubrica ?? '—', classe: 'font-body text-sm text-nebbia/50 max-w-sm truncate' },
        ],
        formCampi: [
            { key: 'articolo', label: 'Articolo', placeholder: 'es. Art. 5', required: true },
            { key: 'rubrica', label: 'Rubrica', placeholder: '...', required: false },
            { key: 'tipo_elemento', label: 'Tipo elemento', placeholder: 'articolo / considerando / ...', required: false },
            { key: 'tipo_atto', label: 'Tipo atto', placeholder: 'regolamento / direttiva / ...', required: false },
            { key: 'numero_atto', label: 'Numero atto', placeholder: 'es. 679', required: false },
            { key: 'anno_atto', label: 'Anno atto', type: 'number', placeholder: '2016', required: false },
            { key: 'titolo_doc', label: 'Titolo documento', placeholder: 'titolo completo', required: false },
            { key: 'titolo_breve', label: 'Titolo breve', placeholder: 'GDPR', required: false },
            { key: 'celex', label: 'CELEX', placeholder: '32016R0679', required: false },
            { key: 'data_pubblicazione', label: 'Data pubblicazione', type: 'date', required: false },
            { key: 'vigente', label: 'Vigente', type: 'boolean', required: false },
            { key: 'testo', label: 'Testo', type: 'textarea', required: true },
        ],
        permetteCrea: false,
    },

    archivio: {
        tabella: 'norme_archivio',
        backLabel: 'Archivio normativo',
        backTo: '/admin/normativa',
        labelHeader: 'Admin — Archivio',
        filtroChiave: 'tipo_atto',
        labelLookup: null, // tipo_atto è già human-readable
        selectCampi: 'id, articolo, rubrica, testo, tipo_atto, numero_atto, anno_atto, titolo_doc, urn, data_pubblicazione, data_vigenza, vigente, embedding',
        order: { campo: 'anno_atto', asc: false },
        ricercaCampo: 'articolo',
        colonneTabella: [
            { label: 'Articolo', getter: r => r.articolo, classe: 'font-body text-sm text-oro font-medium' },
            {
                label: 'Atto',
                getter: r => {
                    const num = r.numero_atto && r.anno_atto ? `${r.numero_atto}/${r.anno_atto}` : (r.numero_atto ?? r.anno_atto ?? '')
                    return num || '—'
                },
                classe: 'font-body text-xs text-nebbia/60'
            },
            { label: 'Titolo', getter: r => r.titolo_doc ?? r.rubrica ?? '—', classe: 'font-body text-sm text-nebbia/50 max-w-sm truncate' },
        ],
        formCampi: [
            { key: 'articolo', label: 'Articolo', placeholder: 'es. Art. 1', required: true },
            { key: 'rubrica', label: 'Rubrica', placeholder: '...', required: false },
            { key: 'tipo_atto', label: 'Tipo atto', placeholder: 'decreto_legislativo', required: true },
            { key: 'numero_atto', label: 'Numero atto', required: false },
            { key: 'anno_atto', label: 'Anno atto', type: 'number', required: false },
            { key: 'titolo_doc', label: 'Titolo documento', required: false },
            { key: 'urn', label: 'URN', required: false },
            { key: 'data_pubblicazione', label: 'Data pubblicazione', type: 'date', required: false },
            { key: 'data_vigenza', label: 'Data vigenza', type: 'date', required: false },
            { key: 'vigente', label: 'Vigente', type: 'boolean', required: false },
            { key: 'testo', label: 'Testo', type: 'textarea', required: true },
        ],
        permetteCrea: false,
    },

    sentenze: {
        tabella: 'giurisprudenza',
        backLabel: 'Giurisprudenza',
        backTo: '/admin/normativa',
        labelHeader: 'Admin — Giurisprudenza',
        filtroChiave: 'categorie_lex',
        filtroEArray: true,
        labelLookup: { tabella: 'codici_lex', campoCodice: 'codice', campoLabel: 'label' },
        selectCampi: 'id, fonte, organo, organo_macro, sezione, numero, anno, data_deposito, data_pubblicazione, oggetto, principio_diritto, tipo_provvedimento, categorie_lex, vigente, embedding',
        order: { campo: 'data_pubblicazione', asc: false },
        ricercaCampo: 'oggetto',
        colonneTabella: [
            {
                label: 'Sentenza',
                getter: r => {
                    const parti = [r.organo ?? r.organo_macro, r.sezione, r.numero && `n. ${r.numero}`, r.anno].filter(Boolean)
                    return parti.join(' · ') || '—'
                },
                classe: 'font-body text-xs text-oro font-medium'
            },
            { label: 'Oggetto', getter: r => r.oggetto ?? '—', classe: 'font-body text-sm text-nebbia/60 max-w-md truncate' },
            { label: 'Tipo', getter: r => r.tipo_provvedimento ?? '—', classe: 'font-body text-xs text-nebbia/40' },
        ],
        formCampi: [
            { key: 'organo', label: 'Organo', placeholder: 'Cassazione, Tribunale...', required: false },
            { key: 'sezione', label: 'Sezione', required: false },
            { key: 'numero', label: 'Numero', required: false },
            { key: 'anno', label: 'Anno', type: 'number', required: false },
            { key: 'tipo_provvedimento', label: 'Tipo provvedimento', placeholder: 'sentenza / ordinanza / ...', required: false },
            { key: 'data_pubblicazione', label: 'Data pubblicazione', type: 'date', required: false },
            { key: 'data_deposito', label: 'Data deposito', type: 'date', required: false },
            { key: 'fonte', label: 'Fonte', required: false },
            { key: 'oggetto', label: 'Oggetto', type: 'textarea', required: false },
            { key: 'principio_diritto', label: 'Principio di diritto', type: 'textarea', required: false },
            { key: 'vigente', label: 'Vigente', type: 'boolean', required: false },
        ],
        permetteCrea: false,
    },
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════
export default function AdminNormativaDettaglio() {
    const { tipo, slug } = useParams()
    const navigate = useNavigate()

    // Retrocompat: rotta vecchia /admin/normativa/:codice (senza tipo)
    // Se tipo è uno slug noto, lo trattiamo come tipo, altrimenti come codice IT
    const config = CONFIGS[tipo] ?? CONFIGS.it
    const codiceFiltro = CONFIGS[tipo] ? slug : tipo

    const [norme, setNorme] = useState([])
    const [loading, setLoading] = useState(true)
    const [cerca, setCerca] = useState('')
    const [totale, setTotale] = useState(0)
    const [label, setLabel] = useState('')
    const [pagina, setPagina] = useState(0)
    const PER_PAGINA = 50

    const [mostraForm, setMostraForm] = useState(false)
    const [formData, setFormData] = useState({})
    const [formErr, setFormErr] = useState(null)
    const [salvando, setSalvando] = useState(false)
    const [editId, setEditId] = useState(null)

    useEffect(() => { caricaLabel() }, [config.tabella, codiceFiltro])
    useEffect(() => { caricaNorme() }, [config.tabella, codiceFiltro, cerca, pagina])

    async function caricaLabel() {
        if (!config.labelLookup) {
            setLabel(decodeURIComponent(codiceFiltro ?? '').replace(/_/g, ' '))
            return
        }
        const { data } = await supabase
            .from(config.labelLookup.tabella)
            .select(config.labelLookup.campoLabel)
            .eq(config.labelLookup.campoCodice, codiceFiltro)
            .maybeSingle()
        setLabel(data?.[config.labelLookup.campoLabel] ?? codiceFiltro)
    }

    async function caricaNorme() {
        setLoading(true)
        try {
            // Conteggio
            let qCount = supabase
                .from(config.tabella)
                .select('*', { count: 'exact', head: true })

            if (config.filtroEArray) {
                qCount = qCount.contains(config.filtroChiave, [codiceFiltro])
            } else {
                qCount = qCount.eq(config.filtroChiave, codiceFiltro)
            }

            // Sentenze: solo vigenti
            if (tipo === 'sentenze') {
                qCount = qCount.eq('vigente', true)
            }

            if (cerca.trim()) {
                qCount = qCount.ilike(config.ricercaCampo, `%${cerca}%`)
            }

            const { count } = await qCount
            setTotale(count ?? 0)

            // Dati paginati
            let q = supabase
                .from(config.tabella)
                .select(config.selectCampi)

            if (config.filtroEArray) {
                q = q.contains(config.filtroChiave, [codiceFiltro])
            } else {
                q = q.eq(config.filtroChiave, codiceFiltro)
            }

            if (tipo === 'sentenze') {
                q = q.eq('vigente', true)
            }

            q = q.order(config.order.campo, { ascending: config.order.asc, nullsFirst: false })
                .range(pagina * PER_PAGINA, (pagina + 1) * PER_PAGINA - 1)

            if (cerca.trim()) {
                q = q.ilike(config.ricercaCampo, `%${cerca}%`)
            }

            const { data } = await q
            setNorme(data ?? [])
        } finally {
            setLoading(false)
        }
    }

    async function salvaArticolo() {
        setFormErr(null)

        // Validazione campi required
        for (const c of config.formCampi) {
            if (c.required && !String(formData[c.key] ?? '').trim()) {
                return setFormErr(`${c.label} obbligatorio`)
            }
        }

        setSalvando(true)
        try {
            // Costruisci payload solo coi campi della config
            const payload = {}
            for (const c of config.formCampi) {
                let v = formData[c.key]
                if (c.type === 'number' && v !== '' && v !== null && v !== undefined) v = parseInt(v) || null
                if (c.type === 'boolean') v = !!v
                if (c.type === 'date' && v === '') v = null
                payload[c.key] = v ?? null
            }

            if (editId) {
                const { error } = await supabase.from(config.tabella).update(payload).eq('id', editId)
                if (error) throw new Error(error.message)
            } else {
                // Aggiungi il filtro principale al payload se è creazione e non è un campo del form
                const payloadFinale = { ...payload }
                if (config.filtroEArray) {
                    payloadFinale[config.filtroChiave] = [codiceFiltro]
                } else {
                    payloadFinale[config.filtroChiave] = codiceFiltro
                }
                const { error } = await supabase.from(config.tabella).insert(payloadFinale)
                if (error) throw new Error(error.message)
            }
            setMostraForm(false)
            setFormData({})
            setEditId(null)
            caricaNorme()
        } catch (e) {
            setFormErr(e.message)
        } finally {
            setSalvando(false)
        }
    }

    function apriModifica(record) {
        const initial = {}
        for (const c of config.formCampi) {
            let v = record[c.key]
            // Date: tronca a YYYY-MM-DD per input date
            if (c.type === 'date' && v) v = String(v).slice(0, 10)
            initial[c.key] = v ?? ''
        }
        setFormData(initial)
        setEditId(record.id)
        setMostraForm(true)
    }

    async function eliminaRecord(id) {
        if (!confirm('Eliminare questo record?')) return
        await supabase.from(config.tabella).delete().eq('id', id)
        caricaNorme()
    }

    function nuovoArticolo() {
        const initial = {}
        for (const c of config.formCampi) {
            initial[c.key] = c.type === 'boolean' ? false : ''
        }
        setFormData(initial)
        setEditId(null)
        setMostraForm(true)
        setFormErr(null)
    }

    const pagine = Math.ceil(totale / PER_PAGINA)

    return (
        <div className="space-y-5">
            <BackButton to={config.backTo} label={config.backLabel} />

            <PageHeader
                label={config.labelHeader}
                title={label}
                subtitle={`${totale.toLocaleString()} ${tipo === 'sentenze' ? 'sentenze' : 'articoli'}`}
            />

            {/* Filtri + azioni */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-44">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input
                        placeholder={`Cerca per ${config.ricercaCampo}...`}
                        value={cerca}
                        onChange={e => { setCerca(e.target.value); setPagina(0) }}
                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                    />
                </div>
                {config.permetteCrea && (
                    <button onClick={nuovoArticolo}
                        className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                        <Plus size={13} /> Aggiungi
                    </button>
                )}
                <button onClick={caricaNorme} className="px-4 py-2.5 bg-slate border border-white/10 text-nebbia/40 hover:text-nebbia transition-colors">
                    <RefreshCw size={13} />
                </button>
            </div>

            {/* Form modifica/crea */}
            {mostraForm && (
                <div className="bg-slate border border-oro/20 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="section-label">{editId ? 'Modifica' : 'Nuovo'}</p>
                        <button onClick={() => { setMostraForm(false); setEditId(null) }} className="text-nebbia/30 hover:text-nebbia transition-colors">
                            <X size={14} />
                        </button>
                    </div>

                    {/* Render campi semplici (non textarea) in grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {config.formCampi.filter(c => c.type !== 'textarea').map(c => (
                            <div key={c.key}>
                                <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                    {c.label}{c.required && ' *'}
                                </label>
                                {c.type === 'boolean' ? (
                                    <label className="flex items-center gap-2 px-4 py-2.5 bg-petrolio border border-white/10">
                                        <input
                                            type="checkbox"
                                            checked={!!formData[c.key]}
                                            onChange={e => setFormData(p => ({ ...p, [c.key]: e.target.checked }))}
                                        />
                                        <span className="font-body text-sm text-nebbia/70">{formData[c.key] ? 'Sì' : 'No'}</span>
                                    </label>
                                ) : (
                                    <input
                                        type={c.type === 'date' ? 'date' : c.type === 'number' ? 'number' : 'text'}
                                        placeholder={c.placeholder}
                                        value={formData[c.key] ?? ''}
                                        onChange={e => setFormData(p => ({ ...p, [c.key]: e.target.value }))}
                                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Textarea full-width */}
                    {config.formCampi.filter(c => c.type === 'textarea').map(c => (
                        <div key={c.key}>
                            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">
                                {c.label}{c.required && ' *'}
                            </label>
                            <textarea
                                rows={8}
                                value={formData[c.key] ?? ''}
                                onChange={e => setFormData(p => ({ ...p, [c.key]: e.target.value }))}
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 resize-none"
                            />
                        </div>
                    ))}

                    {formErr && (
                        <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                            <AlertCircle size={11} />{formErr}
                        </p>
                    )}
                    <div className="flex gap-3">
                        <button onClick={salvaArticolo} disabled={salvando}
                            className="flex items-center gap-2 px-5 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40">
                            {salvando
                                ? <span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" />
                                : editId ? 'Salva modifiche' : 'Aggiungi'
                            }
                        </button>
                        <button onClick={() => { setMostraForm(false); setEditId(null) }}
                            className="px-5 py-2.5 bg-slate border border-white/10 text-nebbia/50 font-body text-sm hover:text-nebbia transition-colors">
                            Annulla
                        </button>
                    </div>
                </div>
            )}

            {/* Tabella */}
            <div className="bg-slate border border-white/5 overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            {config.colonneTabella.map(col => (
                                <th key={col.label} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">AI</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={config.colonneTabella.length + 2} className="px-4 py-20 text-center">
                                <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" />
                            </td></tr>
                        ) : norme.length === 0 ? (
                            <tr><td colSpan={config.colonneTabella.length + 2} className="px-4 py-20 text-center">
                                <p className="font-body text-sm text-nebbia/30">Nessun record trovato</p>
                            </td></tr>
                        ) : norme.map(n => (
                            <tr key={n.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                {config.colonneTabella.map(col => (
                                    <td key={col.label} className={`px-4 py-3 ${col.classe}`}>
                                        {col.getter(n)}
                                    </td>
                                ))}
                                <td className="px-4 py-3">
                                    <Badge
                                        label={n.embedding ? '✓ OK' : '— Mancante'}
                                        variant={n.embedding ? 'salvia' : 'red'}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => apriModifica(n)} className="text-nebbia/30 hover:text-oro transition-colors">
                                            <Edit2 size={13} />
                                        </button>
                                        <button onClick={() => eliminaRecord(n.id)} className="text-nebbia/30 hover:text-red-400 transition-colors">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Paginazione */}
                {pagine > 1 && (
                    <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                        <p className="font-body text-xs text-nebbia/30">
                            {pagina * PER_PAGINA + 1}–{Math.min((pagina + 1) * PER_PAGINA, totale)} di {totale.toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagina(p => Math.max(0, p - 1))}
                                disabled={pagina === 0}
                                className="px-3 py-1.5 bg-slate border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30"
                            >
                                ← Prev
                            </button>
                            <button
                                onClick={() => setPagina(p => Math.min(pagine - 1, p + 1))}
                                disabled={pagina >= pagine - 1}
                                className="px-3 py-1.5 bg-slate border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}