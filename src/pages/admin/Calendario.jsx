// src/pages/admin/Calendario.jsx

import { useState, useEffect, useCallback } from 'react'
import {
    Calendar, ChevronLeft, ChevronRight, X, Plus, Clock, Search,
    MapPin, Video, Users, AlertCircle, Lock, Globe, Mail, Check,
    Paperclip, Upload, Trash2, FileText, Send
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

const TIPO_CONFIG = {
    call: { label: 'Call', icon: Video, color: 'oro', bg: 'bg-oro/15', border: 'border-oro/30', text: 'text-oro' },
    demo: { label: 'Demo', icon: Users, color: 'salvia', bg: 'bg-salvia/15', border: 'border-salvia/30', text: 'text-salvia' },
    riunione: { label: 'Riunione', icon: Users, color: 'blue', bg: 'bg-blue-400/15', border: 'border-blue-400/30', text: 'text-blue-400' },
    scadenza: { label: 'Scadenza', icon: AlertCircle, color: 'red', bg: 'bg-red-900/30', border: 'border-red-500/40', text: 'text-red-400' },
    altro: { label: 'Altro', icon: Calendar, color: 'gray', bg: 'bg-white/5', border: 'border-white/15', text: 'text-nebbia/60' },
}

const AVATAR_COLORS = [
    'bg-oro/80 text-petrolio',
    'bg-salvia/80 text-petrolio',
    'bg-blue-400/80 text-petrolio',
    'bg-purple-400/80 text-petrolio',
    'bg-pink-400/80 text-petrolio',
]

function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function oraDa(iso) { if (!iso) return ''; return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }
function dataDa(iso) { if (!iso) return ''; return new Date(iso).toISOString().slice(0, 10) }

function formatBytes(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function StatBox({ label, value, colorClass = 'text-oro' }) {
    return (
        <div className="bg-slate border border-white/5 px-5 py-4">
            <p className={`font-display text-3xl font-semibold ${colorClass}`}>{value}</p>
            <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mt-1">{label}</p>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// MODAL GESTIONE ALLEGATI DEFAULT PER TIPO
// ─────────────────────────────────────────────────────────────
function ModalAllegatiDefault({ open, onClose }) {
    const [tipoSelezionato, setTipoSelezionato] = useState('demo')
    const [allegati, setAllegati] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [errore, setErrore] = useState('')

    const caricaAllegati = useCallback(async () => {
        if (!open) return
        setLoading(true)
        const { data } = await supabase
            .from('allegati_default_appuntamento')
            .select('*')
            .eq('tipo', tipoSelezionato)
            .eq('attivo', true)
            .order('created_at', { ascending: false })
        setAllegati(data ?? [])
        setLoading(false)
    }, [open, tipoSelezionato])

    useEffect(() => { caricaAllegati() }, [caricaAllegati])

    async function handleUpload(e) {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''
        setErrore('')

        if (file.size > 10 * 1024 * 1024) {
            return setErrore('Il file supera i 10 MB (limite Postmark)')
        }

        const nomePulito = file.name
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .toLowerCase()

        const esistente = allegati.find(a => a.nome_file === nomePulito)
        if (esistente) {
            if (!confirm(`Esiste già "${nomePulito}" per ${tipoSelezionato}. Sostituirlo?`)) return
        }

        setUploading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const storagePath = `defaults/${tipoSelezionato}/${nomePulito}`

            const { error: upErr } = await supabase.storage
                .from('allegati-appuntamenti')
                .upload(storagePath, file, {
                    contentType: file.type,
                    upsert: true,
                })

            if (upErr) throw new Error(upErr.message)

            if (esistente) {
                await supabase
                    .from('allegati_default_appuntamento')
                    .update({
                        storage_path: storagePath,
                        dimensione: file.size,
                        content_type: file.type,
                        caricato_da: user.id,
                        attivo: true,
                    })
                    .eq('id', esistente.id)
            } else {
                await supabase
                    .from('allegati_default_appuntamento')
                    .insert({
                        tipo: tipoSelezionato,
                        nome_file: nomePulito,
                        storage_path: storagePath,
                        dimensione: file.size,
                        content_type: file.type,
                        caricato_da: user.id,
                        attivo: true,
                    })
            }

            await caricaAllegati()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setUploading(false)
        }
    }

    async function handleElimina(allegato) {
        if (!confirm(`Eliminare "${allegato.nome_file}" da ${tipoSelezionato}?`)) return

        try {
            await supabase.storage
                .from('allegati-appuntamenti')
                .remove([allegato.storage_path])

            await supabase
                .from('allegati_default_appuntamento')
                .delete()
                .eq('id', allegato.id)

            await caricaAllegati()
        } catch (err) {
            setErrore(err.message)
        }
    }

    async function scaricaFile(allegato) {
        const { data } = await supabase.storage
            .from('allegati-appuntamenti')
            .createSignedUrl(allegato.storage_path, 60)
        if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    }

    if (!open) return null

    const TIPI = [
        { k: 'call', l: 'Call', icon: Video },
        { k: 'demo', l: 'Demo', icon: Users },
        { k: 'riunione', l: 'Riunione', icon: Users },
        { k: 'scadenza', l: 'Scadenza', icon: AlertCircle },
        { k: 'altro', l: 'Altro', icon: Calendar },
    ]

    return (
        <>
            <div
                className="fixed inset-0 bg-petrolio/80 backdrop-blur-sm z-40 animate-fade-in"
                onClick={onClose}
            />

            <div className="fixed top-0 right-0 bottom-0 w-full max-w-2xl bg-slate border-l border-white/10 z-50 overflow-y-auto animate-fade-in">
                <div className="p-6 space-y-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="section-label mb-1">Configurazione</p>
                            <h2 className="font-display text-2xl font-light text-nebbia">
                                Allegati di default
                            </h2>
                            <p className="font-body text-sm text-nebbia/40 mt-1">
                                File inviati automaticamente per ogni tipo di appuntamento.
                            </p>
                        </div>
                        <button onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center text-nebbia/40 hover:text-nebbia hover:bg-petrolio transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div>
                        <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">Tipo appuntamento</p>
                        <div className="grid grid-cols-5 gap-2">
                            {TIPI.map(t => {
                                const Icon = t.icon
                                return (
                                    <button key={t.k} onClick={() => setTipoSelezionato(t.k)}
                                        className={`flex flex-col items-center justify-center gap-1.5 py-3 border transition-all ${tipoSelezionato === t.k
                                            ? 'bg-oro/15 border-oro/40 text-oro'
                                            : 'bg-petrolio border-white/10 text-nebbia/50 hover:border-oro/20'
                                            }`}>
                                        <Icon size={14} />
                                        <span className="font-body text-xs">{t.l}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="bg-petrolio/60 border border-white/5 p-3 flex items-start gap-2">
                        <AlertCircle size={13} className="text-salvia shrink-0 mt-0.5" />
                        <p className="font-body text-xs text-nebbia/60 leading-relaxed">
                            I file caricati qui verranno allegati a ogni email di appuntamento di tipo <strong className="text-nebbia">{tipoSelezionato}</strong>.
                            Limite per file: 10 MB. Puoi caricare più file per ogni tipo.
                        </p>
                    </div>

                    <div>
                        <label className={`flex items-center justify-center gap-2 py-3 border border-dashed cursor-pointer transition-colors ${uploading
                            ? 'border-oro/30 bg-oro/5 text-oro/60'
                            : 'border-oro/40 text-oro hover:bg-oro/5 hover:border-oro'
                            }`}>
                            {uploading
                                ? <><span className="animate-spin w-4 h-4 border-2 border-oro border-t-transparent rounded-full" /> Caricamento...</>
                                : <><Upload size={14} /> Carica nuovo file per "{tipoSelezionato}"</>
                            }
                            <input type="file" onChange={handleUpload} disabled={uploading}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" />
                        </label>
                    </div>

                    {errore && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={14} /> {errore}
                        </div>
                    )}

                    <div>
                        <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mb-2">
                            File caricati per "{tipoSelezionato}"
                        </p>

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                            </div>
                        ) : allegati.length === 0 ? (
                            <div className="bg-petrolio border border-white/5 p-8 text-center">
                                <Paperclip size={24} className="text-nebbia/20 mx-auto mb-2" />
                                <p className="font-body text-sm text-nebbia/40">
                                    Nessun file di default per "{tipoSelezionato}"
                                </p>
                                <p className="font-body text-xs text-nebbia/25 mt-1">
                                    Carica un file per allegarlo automaticamente a tutti gli appuntamenti di questo tipo.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {allegati.map(a => (
                                    <div key={a.id}
                                        className="bg-petrolio border border-white/5 hover:border-oro/20 transition-colors p-3 flex items-center gap-3">
                                        <div className="w-9 h-9 bg-oro/10 border border-oro/20 flex items-center justify-center shrink-0">
                                            <FileText size={14} className="text-oro/70" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <button onClick={() => scaricaFile(a)}
                                                className="font-body text-sm text-nebbia hover:text-oro transition-colors text-left truncate block w-full">
                                                {a.nome_file}
                                            </button>
                                            <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                                {formatBytes(a.dimensione)} · caricato il {new Date(a.created_at).toLocaleDateString('it-IT')}
                                            </p>
                                        </div>
                                        <button onClick={() => handleElimina(a)}
                                            className="w-8 h-8 flex items-center justify-center text-nebbia/30 hover:text-red-400 hover:bg-red-900/10 transition-colors shrink-0">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

// ─────────────────────────────────────────────────────────────
// PAGINA PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function AdminCalendario() {
    const today = new Date()

    const [meId, setMeId] = useState(null)
    const [meNome, setMeNome] = useState('')
    const [admins, setAdmins] = useState([])
    const [utentiLexum, setUtentiLexum] = useState([])

    const [appuntamenti, setAppuntamenti] = useState([])
    const [loadingApp, setLoadingApp] = useState(true)

    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
    const [selectedDay, setSelectedDay] = useState(null)
    const [showNew, setShowNew] = useState(false)
    const [expandedEvent, setExpandedEvent] = useState(null)
    const [filtroAdmin, setFiltroAdmin] = useState('')
    const [mostraSoloMiei, setMostraSoloMiei] = useState(false)
    const [showModalAllegati, setShowModalAllegati] = useState(false)

    const [tabellaSearch, setTabellaSearch] = useState('')
    const [tabellaFrom, setTabellaFrom] = useState('')
    const [tabellaTo, setTabellaTo] = useState('')
    const [tabellaTipo, setTabellaTipo] = useState('')
    const [tabellaSort, setTabellaSort] = useState('asc')

    const formVuoto = {
        titolo: '', descrizione: '',
        data: '', ora_inizio: '09:00', ora_fine: '10:00',
        tipo: 'call', visibilita: 'condiviso',
        luogo: '', link_call: '',
        partecipante_modo: 'nessuno',
        partecipante_user_id: '',
        partecipante_email: '',
        partecipante_nome: '',
        invia_notifica: false,
        allegati_manuali: [],
    }
    const [form, setForm] = useState(formVuoto)
    const [editingId, setEditingId] = useState(null)
    const [salvando, setSalvando] = useState(false)
    const [errore, setErrore] = useState('')
    const [searchUtente, setSearchUtente] = useState('')
    const [allegatiManualiEsistenti, setAllegatiManualiEsistenti] = useState([])
    const [defaultPerTipo, setDefaultPerTipo] = useState([])
    const [invioEmailLoading, setInvioEmailLoading] = useState(false)
    const [feedback, setFeedback] = useState(null)

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            setMeId(user.id)

            const { data: me } = await supabase
                .from('profiles').select('nome, cognome').eq('id', user.id).single()
            setMeNome(me ? `${me.nome} ${me.cognome}` : '')

            const { data: tuttiAdmin } = await supabase
                .from('profiles').select('id, nome, cognome').eq('role', 'admin').order('nome')

            setAdmins((tuttiAdmin ?? []).map((a, i) => ({
                ...a,
                color: AVATAR_COLORS[i % AVATAR_COLORS.length],
                isMe: a.id === user.id,
            })))

            const { data: utenti } = await supabase
                .from('profiles')
                .select('id, nome, cognome, email, role')
                .in('role', ['avvocato', 'cliente', 'user'])
                .order('cognome').limit(500)
            setUtentiLexum(utenti ?? [])
        }
        init()
    }, [])

    const caricaAppuntamenti = useCallback(async () => {
        setLoadingApp(true)
        const { data } = await supabase
            .from('appuntamenti_admin')
            .select(`
        id, titolo, descrizione, inizio, fine, tutto_il_giorno,
        visibilita, tipo, luogo, link_call,
        partecipante_email, partecipante_nome, partecipante_user_id,
        email_inviata_at, creato_da, created_at,
        creatore:creato_da(id, nome, cognome),
        partecipante:partecipante_user_id(id, nome, cognome, email, role)
      `)
            .order('inizio')
        setAppuntamenti(data ?? [])
        setLoadingApp(false)
    }, [])

    useEffect(() => { caricaAppuntamenti() }, [caricaAppuntamenti])

    const anno = currentDate.getFullYear()
    const mese = currentDate.getMonth()
    const primo = new Date(anno, mese, 1)
    const ultimo = new Date(anno, mese + 1, 0)
    const offset = (primo.getDay() + 6) % 7
    const giorni = []
    for (let i = offset - 1; i >= 0; i--)        giorni.push({ date: new Date(anno, mese, -i), cur: false })
    for (let i = 1; i <= ultimo.getDate(); i++)   giorni.push({ date: new Date(anno, mese, i), cur: true })
    for (let i = 1; i <= 42 - giorni.length; i++) giorni.push({ date: new Date(anno, mese + 1, i), cur: false })

    const appFiltrate = appuntamenti.filter(a => {
        if (mostraSoloMiei && a.creato_da !== meId) return false
        if (filtroAdmin && a.creato_da !== filtroAdmin) return false
        return true
    })

    const perGiorno = {}
    appFiltrate.forEach(a => {
        const k = dataDa(a.inizio)
        if (!perGiorno[k]) perGiorno[k] = []
        perGiorno[k].push(a)
    })

    const eventiGiorno = selectedDay ? (perGiorno[dateKey(selectedDay)] ?? []) : []
    const isToday = d => dateKey(d) === dateKey(today)
    const isSelected = d => selectedDay && dateKey(d) === dateKey(selectedDay)

    const todayStr = dateKey(today)
    const oggiCount = appuntamenti.filter(a => dataDa(a.inizio) === todayStr).length
    const settimanaCount = appuntamenti.filter(a => {
        const d = new Date(a.inizio)
        const fineSett = new Date(today); fineSett.setDate(fineSett.getDate() + 7)
        return d >= today && d <= fineSett
    }).length
    const mieiCount = appuntamenti.filter(a => a.creato_da === meId).length
    const totale = appuntamenti.length

    const utentiFiltrati = utentiLexum.filter(u => {
        if (!searchUtente.trim()) return true
        const q = searchUtente.toLowerCase()
        return `${u.nome} ${u.cognome} ${u.email}`.toLowerCase().includes(q)
    }).slice(0, 30)

    async function handleSalva({ inviaEmail = false } = {}) {
        setErrore('')
        if (!form.titolo.trim()) return setErrore('Il titolo è obbligatorio')
        if (!form.data) return setErrore('La data è obbligatoria')

        const inizio = new Date(`${form.data}T${form.ora_inizio}:00`).toISOString()
        const fine = new Date(`${form.data}T${form.ora_fine}:00`).toISOString()
        if (new Date(fine) <= new Date(inizio)) {
            return setErrore("L'ora di fine deve essere dopo l'inizio")
        }

        let partecipante_user_id = null
        let partecipante_email = null
        let partecipante_nome = null
        if (form.partecipante_modo === 'lexum' && form.partecipante_user_id) {
            const u = utentiLexum.find(x => x.id === form.partecipante_user_id)
            if (u) {
                partecipante_user_id = u.id
                partecipante_email = u.email
                partecipante_nome = `${u.nome} ${u.cognome}`.trim()
            }
        } else if (form.partecipante_modo === 'manuale') {
            partecipante_email = form.partecipante_email.trim() || null
            partecipante_nome = form.partecipante_nome.trim() || null
        }

        if (inviaEmail && !partecipante_email) {
            return setErrore("Per inviare l'email serve un partecipante con email")
        }

        setSalvando(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()

            // STEP 1 — crea/aggiorna appuntamento SENZA email
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crea-appuntamento-admin`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        action: editingId ? 'update' : 'create',
                        id: editingId,
                        titolo: form.titolo,
                        descrizione: form.descrizione,
                        inizio, fine,
                        tutto_il_giorno: false,
                        visibilita: form.visibilita,
                        tipo: form.tipo,
                        luogo: form.luogo,
                        link_call: form.link_call,
                        partecipante_user_id,
                        partecipante_email,
                        partecipante_nome,
                        invia_notifica: false,
                    }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)

            const appuntamentoId = json.appuntamento.id

            // STEP 2 — upload allegati manuali nuovi su Storage + insert record
            if (form.allegati_manuali && form.allegati_manuali.length > 0) {
                const { data: { user } } = await supabase.auth.getUser()

                for (const file of form.allegati_manuali) {
                    const nomePulito = file.name
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-zA-Z0-9._-]/g, '_')
                        .toLowerCase()

                    const storagePath = `manuali/${appuntamentoId}/${nomePulito}`

                    const { error: upErr } = await supabase.storage
                        .from('allegati-appuntamenti')
                        .upload(storagePath, file, {
                            contentType: file.type,
                            upsert: true,
                        })
                    if (upErr) {
                        console.error(`Errore upload ${file.name}:`, upErr)
                        continue
                    }

                    await supabase
                        .from('allegati_manuali_appuntamento')
                        .upsert({
                            appuntamento_id: appuntamentoId,
                            nome_file: nomePulito,
                            storage_path: storagePath,
                            dimensione: file.size,
                            content_type: file.type,
                            caricato_da: user.id,
                        }, { onConflict: 'appuntamento_id,nome_file' })
                }
            }

            // STEP 3 — se richiesto, manda email DOPO gli allegati
            let messaggioFeedback = 'Appuntamento salvato.'
            if (inviaEmail) {
                const resMail = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crea-appuntamento-admin`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                            action: 'invia_email',
                            id: appuntamentoId,
                        }),
                    }
                )
                const jsonMail = await resMail.json()
                if (jsonMail.ok && jsonMail.email_inviata) {
                    messaggioFeedback = 'Appuntamento salvato e email inviata.'
                    if (jsonMail.allegati_esclusi?.length > 0) {
                        messaggioFeedback += ` Attenzione: ${jsonMail.allegati_esclusi.length} allegati esclusi per superamento limite 10MB.`
                    }
                } else {
                    messaggioFeedback = `Appuntamento salvato ma invio email fallito: ${jsonMail.motivo ?? jsonMail.error ?? 'errore sconosciuto'}`
                }
            }

            setFeedback({ tipo: 'success', messaggio: messaggioFeedback })
            setTimeout(() => setFeedback(null), 5000)

            setForm(formVuoto)
            setShowNew(false)
            setEditingId(null)
            setSearchUtente('')
            setAllegatiManualiEsistenti([])
            setDefaultPerTipo([])
            await caricaAppuntamenti()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setSalvando(false)
        }
    }

    async function handleElimina(id) {
        if (!confirm("Eliminare questo appuntamento?")) return
        await supabase.from('appuntamenti_admin').delete().eq('id', id)
        setExpandedEvent(null)
        await caricaAppuntamenti()
    }

    async function apriModificaEvento(e) {
        if (e.creato_da !== meId) {
            alert("Puoi modificare solo i tuoi appuntamenti")
            return
        }
        const dataStr = dataDa(e.inizio)
        setForm({
            titolo: e.titolo,
            descrizione: e.descrizione ?? '',
            data: dataStr,
            ora_inizio: oraDa(e.inizio),
            ora_fine: oraDa(e.fine),
            tipo: e.tipo ?? 'altro',
            visibilita: e.visibilita ?? 'condiviso',
            luogo: e.luogo ?? '',
            link_call: e.link_call ?? '',
            partecipante_modo: e.partecipante_user_id ? 'lexum' : (e.partecipante_email ? 'manuale' : 'nessuno'),
            partecipante_user_id: e.partecipante_user_id ?? '',
            partecipante_email: e.partecipante_email ?? '',
            partecipante_nome: e.partecipante_nome ?? '',
            invia_notifica: false,
            allegati_manuali: [],
        })
        setEditingId(e.id)
        setShowNew(true)
        setExpandedEvent(null)

        const { data: esistenti } = await supabase
            .from('allegati_manuali_appuntamento')
            .select('*')
            .eq('appuntamento_id', e.id)
            .order('created_at')
        setAllegatiManualiEsistenti(esistenti ?? [])

        const { data: defaults } = await supabase
            .from('allegati_default_appuntamento')
            .select('nome_file, dimensione')
            .eq('tipo', e.tipo ?? 'altro')
            .eq('attivo', true)
        setDefaultPerTipo(defaults ?? [])
    }

    async function handleEliminaAllegatoEsistente(allegato) {
        if (!confirm(`Eliminare "${allegato.nome_file}" da questo appuntamento?`)) return

        await supabase.storage
            .from('allegati-appuntamenti')
            .remove([allegato.storage_path])

        await supabase
            .from('allegati_manuali_appuntamento')
            .delete()
            .eq('id', allegato.id)

        setAllegatiManualiEsistenti(prev => prev.filter(a => a.id !== allegato.id))
    }

    function handleAggiungiFile(e) {
        const files = Array.from(e.target.files ?? [])
        e.target.value = ''

        const validi = files.filter(f => {
            if (f.size > 10 * 1024 * 1024) {
                setErrore(`Il file "${f.name}" supera 10 MB`)
                return false
            }
            return true
        })

        setForm(f => ({
            ...f,
            allegati_manuali: [...f.allegati_manuali, ...validi]
        }))
    }

    function handleRimuoviFileDaInserire(index) {
        setForm(f => ({
            ...f,
            allegati_manuali: f.allegati_manuali.filter((_, i) => i !== index)
        }))
    }

    async function handleInviaEmailDaListaEventi(appuntamento) {
        if (!appuntamento.partecipante_email) {
            alert("Questo appuntamento non ha un partecipante con email")
            return
        }
        if (appuntamento.email_inviata_at) {
            if (!confirm("L'email per questo appuntamento è già stata inviata. Rinviare?")) return
        }
        if (appuntamento.creato_da !== meId) {
            alert("Puoi inviare email solo per i tuoi appuntamenti")
            return
        }

        setInvioEmailLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crea-appuntamento-admin`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ action: 'invia_email', id: appuntamento.id }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)

            if (json.email_inviata) {
                let msg = 'Email inviata.'
                if (json.allegati_esclusi?.length > 0) {
                    msg += ` Allegati esclusi (oltre 10MB): ${json.allegati_esclusi.join(', ')}`
                }
                setFeedback({ tipo: 'success', messaggio: msg })
            } else {
                setFeedback({ tipo: 'error', messaggio: json.motivo ?? 'Invio fallito' })
            }
            setTimeout(() => setFeedback(null), 5000)
            await caricaAppuntamenti()
        } catch (err) {
            setFeedback({ tipo: 'error', messaggio: err.message })
            setTimeout(() => setFeedback(null), 5000)
        } finally {
            setInvioEmailLoading(false)
        }
    }

    const righe = appFiltrate
        .filter(a => {
            const ds = dataDa(a.inizio)
            if (tabellaTipo && a.tipo !== tabellaTipo) return false
            if (tabellaFrom && ds < tabellaFrom) return false
            if (tabellaTo && ds > tabellaTo) return false
            if (tabellaSearch) {
                const q = tabellaSearch.toLowerCase()
                const part = `${a.partecipante_nome ?? ''} ${a.partecipante_email ?? ''}`
                if (!`${a.titolo} ${part}`.toLowerCase().includes(q)) return false
            }
            return true
        })
        .sort((a, b) => {
            const da = a.inizio ?? '', db = b.inizio ?? ''
            return tabellaSort === 'asc' ? da.localeCompare(db) : db.localeCompare(da)
        })

    return (
        <div className="space-y-6">
            {/* FEEDBACK BANNER */}
            {feedback && (
                <div className={`p-4 border flex items-center gap-3 ${feedback.tipo === 'success'
                    ? 'bg-salvia/10 border-salvia/30 text-salvia'
                    : 'bg-red-900/10 border-red-500/30 text-red-400'
                    }`}>
                    {feedback.tipo === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                    <p className="font-body text-sm flex-1">{feedback.messaggio}</p>
                    <button onClick={() => setFeedback(null)} className="opacity-50 hover:opacity-100">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* HEADER */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <p className="section-label mb-2">Admin</p>
                    <h1 className="font-display text-4xl font-light text-nebbia">
                        Calendario <span className="text-oro-static italic">condiviso</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setShowModalAllegati(true)}
                        className="flex items-center gap-2 px-3 py-1.5 font-body text-xs border border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-oro transition-colors">
                        <Paperclip size={12} /> Allegati default
                    </button>
                    <span className="font-body text-xs text-nebbia/20">|</span>
                    <button onClick={() => { setMostraSoloMiei(v => !v); setFiltroAdmin('') }}
                        className={`font-body text-xs px-3 py-1.5 border transition-colors ${mostraSoloMiei ? 'bg-oro/15 border-oro/40 text-oro' : 'border-white/10 text-nebbia/40 hover:border-white/20'}`}>
                        Solo i miei
                    </button>
                    <span className="font-body text-xs text-nebbia/30">·</span>
                    <button onClick={() => { setFiltroAdmin(''); setMostraSoloMiei(false) }}
                        className={`font-body text-xs px-3 py-1.5 border transition-colors ${!filtroAdmin && !mostraSoloMiei ? 'bg-oro/15 border-oro/40 text-oro' : 'border-white/10 text-nebbia/40 hover:border-white/20'}`}>
                        Tutti
                    </button>
                    {admins.map(a => (
                        <button key={a.id} onClick={() => { setFiltroAdmin(filtroAdmin === a.id ? '' : a.id); setMostraSoloMiei(false) }}
                            className={`flex items-center gap-2 font-body text-xs px-3 py-1.5 border transition-colors ${filtroAdmin === a.id ? 'bg-oro/15 border-oro/40 text-oro' : 'border-white/10 text-nebbia/40 hover:border-white/20'}`}>
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${a.color}`}>{a.nome[0]}</span>
                            {a.nome}{a.isMe ? ' (tu)' : ''}
                        </button>
                    ))}
                </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatBox label="Totale" value={loadingApp ? '—' : totale} colorClass="text-nebbia" />
                <StatBox label="Oggi" value={loadingApp ? '—' : oggiCount} colorClass="text-oro" />
                <StatBox label="Settimana" value={loadingApp ? '—' : settimanaCount} colorClass="text-salvia" />
                <StatBox label="I miei" value={loadingApp ? '—' : mieiCount} colorClass="text-blue-400" />
            </div>

            {/* GRIGLIA MESE + PANNELLO GIORNO */}
            <div className="flex gap-5 items-start">
                <div className="flex-1 bg-slate border border-white/5 p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-display text-2xl font-semibold text-nebbia">
                            {MESI[mese]} <span className="text-nebbia/40 font-light">{anno}</span>
                        </h2>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                                className="p-2 text-nebbia/50 hover:text-oro transition-colors"><ChevronLeft size={18} /></button>
                            <button onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))}
                                className="btn-secondary text-xs px-3 py-1.5">Oggi</button>
                            <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                                className="p-2 text-nebbia/50 hover:text-oro transition-colors"><ChevronRight size={18} /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 mb-1">
                        {GIORNI.map(g => <div key={g} className="text-center font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase py-2">{g}</div>)}
                    </div>

                    <div className="grid grid-cols-7 border border-white/8 overflow-hidden">
                        {giorni.map(({ date, cur }, i) => {
                            const k = dateKey(date)
                            const eventi = perGiorno[k] ?? []
                            const tipiPresenti = [...new Set(eventi.map(e => e.tipo))]
                            const creatori = [...new Set(eventi.map(e => e.creato_da))]
                            return (
                                <button key={i}
                                    onClick={() => { setSelectedDay(date); setShowNew(false); setExpandedEvent(null) }}
                                    className={`min-h-[72px] p-2 text-left flex flex-col transition-colors border-r border-b border-white/5 ${!cur ? 'opacity-20' : ''} ${isSelected(date) ? 'bg-oro/10 ring-inset ring-1 ring-oro/50' : 'bg-petrolio hover:bg-slate/60'}`}>
                                    <span className={`font-body text-sm w-7 h-7 flex items-center justify-center mb-1 ${isToday(date) ? 'bg-oro text-petrolio font-semibold' : isSelected(date) ? 'text-oro font-medium' : 'text-nebbia/60'}`}>
                                        {date.getDate()}
                                    </span>
                                    <div className="flex flex-wrap gap-0.5 mt-auto">
                                        {eventi.length > 0 && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-oro/15 text-oro border border-oro/30 font-body">
                                                {eventi.length} ev.
                                            </span>
                                        )}
                                        {tipiPresenti.includes('scadenza') && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-red-900/30 text-red-400 border border-red-500/40 font-body">
                                                !
                                            </span>
                                        )}
                                        {!filtroAdmin && !mostraSoloMiei && creatori.length > 0 && (
                                            <div className="flex gap-0.5 mt-0.5">
                                                {creatori.slice(0, 3).map((cId, idx) => {
                                                    const a = admins.find(x => x.id === cId)
                                                    if (!a) return null
                                                    return <span key={idx} className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${a.color}`}>{a.nome[0]}</span>
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex items-center gap-5 mt-4 pt-3 border-t border-white/5 flex-wrap">
                        {Object.entries(TIPO_CONFIG).map(([k, c]) => {
                            const Icon = c.icon
                            return (
                                <div key={k} className="flex items-center gap-1.5">
                                    <Icon size={11} className={c.text} />
                                    <span className="font-body text-xs text-nebbia/40">{c.label}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* PANNELLO GIORNO */}
                {selectedDay && (
                    <div className="w-96 shrink-0 bg-slate border border-white/5 flex flex-col" style={{ maxHeight: 720 }}>
                        <div className="flex items-center justify-between p-5 border-b border-white/5">
                            <div>
                                <p className="font-body text-xs text-nebbia/30 tracking-widest uppercase">
                                    {GIORNI[(selectedDay.getDay() + 6) % 7]}
                                </p>
                                <h3 className="font-display text-2xl font-semibold text-nebbia mt-0.5">
                                    {selectedDay.getDate()} {MESI[selectedDay.getMonth()]}
                                </h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="font-body text-[10px] text-nebbia/30">Eventi</p>
                                    <p className="font-display text-lg font-semibold text-oro">{eventiGiorno.length}</p>
                                </div>
                                <button onClick={() => { setSelectedDay(null); setShowNew(false); setEditingId(null) }}
                                    className="text-nebbia/30 hover:text-nebbia ml-2"><X size={16} /></button>
                            </div>
                        </div>

                        <div className="p-4 border-b border-white/5">
                            <button onClick={() => {
                                setShowNew(v => !v); setExpandedEvent(null); setEditingId(null)
                                setForm({ ...formVuoto, data: dateKey(selectedDay) })
                                setAllegatiManualiEsistenti([])
                                setDefaultPerTipo([])
                            }}
                                className="btn-primary text-xs w-full justify-center py-2.5">
                                <Plus size={13} /> {editingId ? 'Modifica' : 'Nuovo evento'}
                            </button>
                        </div>

                        {/* FORM NUOVO/MODIFICA */}
                        {showNew && (
                            <div className="p-4 border-b border-white/5 space-y-3 bg-petrolio/40 overflow-y-auto" style={{ maxHeight: 520 }}>
                                <input value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))}
                                    placeholder="Titolo *"
                                    className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />

                                {/* TIPO */}
                                <div>
                                    <p className="font-body text-xs text-nebbia/40 mb-1.5">Tipo</p>
                                    <div className="grid grid-cols-5 gap-1">
                                        {Object.entries(TIPO_CONFIG).map(([k, c]) => {
                                            const Icon = c.icon
                                            return (
                                                <button key={k} type="button" onClick={() => setForm(f => ({ ...f, tipo: k }))}
                                                    className={`flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-body border transition-all ${form.tipo === k ? `${c.bg} ${c.border} ${c.text}` : 'text-nebbia/50 border-white/10 hover:border-oro/30'}`}>
                                                    <Icon size={11} /> {c.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* ORE */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="font-body text-xs text-nebbia/40 block mb-1">Inizio</label>
                                        <input type="time" value={form.ora_inizio} onChange={e => setForm(f => ({ ...f, ora_inizio: e.target.value }))}
                                            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50" />
                                    </div>
                                    <div>
                                        <label className="font-body text-xs text-nebbia/40 block mb-1">Fine</label>
                                        <input type="time" value={form.ora_fine} onChange={e => setForm(f => ({ ...f, ora_fine: e.target.value }))}
                                            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50" />
                                    </div>
                                </div>

                                {/* VISIBILITA */}
                                <div>
                                    <p className="font-body text-xs text-nebbia/40 mb-1.5">Visibilità</p>
                                    <div className="grid grid-cols-2 gap-1">
                                        <button type="button" onClick={() => setForm(f => ({ ...f, visibilita: 'privato' }))}
                                            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-body border transition-all ${form.visibilita === 'privato' ? 'bg-oro/15 border-oro/40 text-oro' : 'text-nebbia/50 border-white/10 hover:border-oro/30'}`}>
                                            <Lock size={11} /> Privato
                                        </button>
                                        <button type="button" onClick={() => setForm(f => ({ ...f, visibilita: 'condiviso' }))}
                                            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-body border transition-all ${form.visibilita === 'condiviso' ? 'bg-oro/15 border-oro/40 text-oro' : 'text-nebbia/50 border-white/10 hover:border-oro/30'}`}>
                                            <Globe size={11} /> Condiviso
                                        </button>
                                    </div>
                                </div>

                                {/* LUOGO / LINK CALL */}
                                <input value={form.luogo} onChange={e => setForm(f => ({ ...f, luogo: e.target.value }))}
                                    placeholder="Luogo (Lugano, Online...)"
                                    className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/20" />

                                {(form.tipo === 'call' || form.tipo === 'demo') && (
                                    <input value={form.link_call} onChange={e => setForm(f => ({ ...f, link_call: e.target.value }))}
                                        placeholder="Link call (Meet, Zoom...)"
                                        className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/20" />
                                )}

                                {/* DESCRIZIONE */}
                                <textarea rows={2} value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
                                    placeholder="Descrizione / note"
                                    className="w-full bg-slate border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/20" />

                                {/* ALLEGATI */}
                                <div>
                                    <p className="font-body text-xs text-nebbia/40 mb-1.5 flex items-center gap-1.5">
                                        <Paperclip size={11} /> Allegati
                                    </p>

                                    {defaultPerTipo.length > 0 && (
                                        <div className="bg-salvia/5 border border-salvia/15 p-2 mb-2">
                                            <p className="font-body text-[10px] text-salvia uppercase tracking-widest mb-1">
                                                Default per "{form.tipo}" ({defaultPerTipo.length})
                                            </p>
                                            <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                                                {defaultPerTipo.map(d => d.nome_file).join(', ')}
                                            </p>
                                        </div>
                                    )}

                                    {allegatiManualiEsistenti.length > 0 && (
                                        <div className="space-y-1 mb-2">
                                            <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-widest">Caricati per questo appuntamento</p>
                                            {allegatiManualiEsistenti.map(a => (
                                                <div key={a.id} className="flex items-center gap-2 p-2 bg-petrolio border border-white/5">
                                                    <FileText size={12} className="text-oro/60 shrink-0" />
                                                    <span className="font-body text-xs text-nebbia/70 flex-1 truncate">{a.nome_file}</span>
                                                    <span className="font-body text-[10px] text-nebbia/30">{formatBytes(a.dimensione)}</span>
                                                    <button onClick={() => handleEliminaAllegatoEsistente(a)} type="button"
                                                        className="w-6 h-6 flex items-center justify-center text-nebbia/30 hover:text-red-400">
                                                        <Trash2 size={11} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {form.allegati_manuali.length > 0 && (
                                        <div className="space-y-1 mb-2">
                                            <p className="font-body text-[10px] text-oro uppercase tracking-widest">Nuovi (verranno caricati al salvataggio)</p>
                                            {form.allegati_manuali.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 p-2 bg-oro/5 border border-oro/20">
                                                    <FileText size={12} className="text-oro shrink-0" />
                                                    <span className="font-body text-xs text-oro flex-1 truncate">{f.name}</span>
                                                    <span className="font-body text-[10px] text-oro/60">{formatBytes(f.size)}</span>
                                                    <button onClick={() => handleRimuoviFileDaInserire(i)} type="button"
                                                        className="w-6 h-6 flex items-center justify-center text-oro/40 hover:text-red-400">
                                                        <X size={11} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <label className="flex items-center justify-center gap-1.5 py-2 border border-dashed border-white/15 cursor-pointer hover:border-oro/30 transition-colors">
                                        <Upload size={11} className="text-nebbia/40" />
                                        <span className="font-body text-xs text-nebbia/50">Aggiungi file</span>
                                        <input type="file" multiple onChange={handleAggiungiFile}
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" />
                                    </label>
                                </div>

                                {/* PARTECIPANTE */}
                                <div>
                                    <p className="font-body text-xs text-nebbia/40 mb-1.5">Partecipante</p>
                                    <div className="grid grid-cols-3 gap-1 mb-2">
                                        {[
                                            { k: 'nessuno', l: 'Nessuno' },
                                            { k: 'lexum', l: 'Utente Lexum' },
                                            { k: 'manuale', l: 'Email manuale' },
                                        ].map(o => (
                                            <button key={o.k} type="button"
                                                onClick={() => setForm(f => ({ ...f, partecipante_modo: o.k, partecipante_user_id: '', partecipante_email: '', partecipante_nome: '' }))}
                                                className={`py-2 text-[10px] font-body border transition-all ${form.partecipante_modo === o.k ? 'bg-oro/15 border-oro/40 text-oro' : 'text-nebbia/50 border-white/10 hover:border-oro/30'}`}>
                                                {o.l}
                                            </button>
                                        ))}
                                    </div>

                                    {form.partecipante_modo === 'lexum' && (
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nebbia/30" />
                                                <input value={searchUtente} onChange={e => setSearchUtente(e.target.value)}
                                                    placeholder="Cerca per nome/email..."
                                                    className="w-full bg-slate border border-white/10 text-nebbia font-body text-xs pl-8 pr-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                                            </div>
                                            <select value={form.partecipante_user_id} onChange={e => setForm(f => ({ ...f, partecipante_user_id: e.target.value }))}
                                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50">
                                                <option value="">— Seleziona —</option>
                                                {utentiFiltrati.map(u => (
                                                    <option key={u.id} value={u.id}>
                                                        [{u.role}] {u.cognome} {u.nome} · {u.email}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {form.partecipante_modo === 'manuale' && (
                                        <div className="space-y-2">
                                            <input value={form.partecipante_nome} onChange={e => setForm(f => ({ ...f, partecipante_nome: e.target.value }))}
                                                placeholder="Nome partecipante"
                                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/20" />
                                            <input type="email" value={form.partecipante_email} onChange={e => setForm(f => ({ ...f, partecipante_email: e.target.value }))}
                                                placeholder="email@esempio.com"
                                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/20" />
                                        </div>
                                    )}
                                </div>

                                {errore && <p className="font-body text-xs text-red-400">{errore}</p>}

                                {/* BOTTONI SALVA */}
                                <div className="space-y-2 pt-2">
                                    {form.partecipante_modo !== 'nessuno' && (form.partecipante_user_id || form.partecipante_email) && (
                                        <button onClick={() => handleSalva({ inviaEmail: true })} disabled={salvando}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-salvia/15 border border-salvia/40 text-salvia font-body text-xs hover:bg-salvia/25 transition-colors disabled:opacity-40">
                                            {salvando
                                                ? <span className="animate-spin w-3 h-3 border border-salvia border-t-transparent rounded-full" />
                                                : <><Send size={12} /> Salva e invia email</>}
                                        </button>
                                    )}
                                    <div className="flex gap-2">
                                        <button onClick={() => { setShowNew(false); setErrore(''); setEditingId(null); setAllegatiManualiEsistenti([]); setDefaultPerTipo([]) }} type="button"
                                            className="btn-secondary text-xs flex-1 py-2">Annulla</button>
                                        <button onClick={() => handleSalva({ inviaEmail: false })} disabled={salvando}
                                            className="btn-primary text-xs flex-1 py-2 justify-center disabled:opacity-40">
                                            {salvando
                                                ? <span className="animate-spin w-3 h-3 border border-petrolio border-t-transparent rounded-full" />
                                                : (editingId ? 'Aggiorna (no email)' : 'Salva (no email)')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* LISTA EVENTI DEL GIORNO */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {eventiGiorno.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <Calendar size={28} className="text-nebbia/15 mb-3" />
                                    <p className="font-body text-sm text-nebbia/30">Nessun evento</p>
                                </div>
                            ) : [...eventiGiorno].sort((a, b) => a.inizio.localeCompare(b.inizio)).map(e => {
                                const isExp = expandedEvent === e.id
                                const cfg = TIPO_CONFIG[e.tipo] ?? TIPO_CONFIG.altro
                                const Icon = cfg.icon
                                const adminCreatore = admins.find(a => a.id === e.creato_da)
                                const isMio = e.creato_da === meId
                                return (
                                    <div key={e.id}
                                        className={`border p-3 cursor-pointer transition-colors ${cfg.border} ${cfg.bg}`}
                                        onClick={() => setExpandedEvent(isExp ? null : e.id)}>
                                        <div className="flex items-start gap-2">
                                            <Icon size={13} className={`${cfg.text} shrink-0 mt-0.5`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-body text-sm font-medium text-nebbia truncate">{e.titolo}</p>
                                                    {e.visibilita === 'privato' && <Lock size={10} className="text-nebbia/40" />}
                                                    {e.email_inviata_at && <Mail size={10} className="text-salvia" title="Email inviata al partecipante" />}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <span className="font-body text-xs text-nebbia/40">
                                                        {oraDa(e.inizio)} – {oraDa(e.fine)}
                                                    </span>
                                                    {adminCreatore && (
                                                        <span className="flex items-center gap-1">
                                                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${adminCreatore.color}`}>
                                                                {adminCreatore.nome[0]}
                                                            </span>
                                                            <span className="font-body text-xs text-nebbia/40">{adminCreatore.nome}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {isExp && (
                                            <div className="mt-3 space-y-2 border-t border-white/5 pt-3" onClick={ev => ev.stopPropagation()}>
                                                {e.descrizione && (
                                                    <p className="font-body text-xs text-nebbia/60 whitespace-pre-line">{e.descrizione}</p>
                                                )}
                                                {e.luogo && (
                                                    <p className="font-body text-xs text-nebbia/60 flex items-center gap-1.5">
                                                        <MapPin size={10} /> {e.luogo}
                                                    </p>
                                                )}
                                                {e.link_call && (
                                                    <a href={e.link_call} target="_blank" rel="noreferrer"
                                                        className="font-body text-xs text-oro hover:underline flex items-center gap-1.5 truncate">
                                                        <Video size={10} /> {e.link_call}
                                                    </a>
                                                )}
                                                {(e.partecipante_nome || e.partecipante_email || e.partecipante) && (
                                                    <div className="bg-petrolio/60 border border-white/5 p-2">
                                                        <p className="font-body text-[10px] text-nebbia/40 uppercase tracking-widest mb-1">Partecipante</p>
                                                        <p className="font-body text-xs text-nebbia/80">
                                                            {e.partecipante
                                                                ? `[${e.partecipante.role}] ${e.partecipante.nome} ${e.partecipante.cognome}`
                                                                : e.partecipante_nome ?? ''}
                                                        </p>
                                                        {e.partecipante_email && (
                                                            <p className="font-body text-xs text-nebbia/50">{e.partecipante_email}</p>
                                                        )}
                                                    </div>
                                                )}
                                                {isMio && (
                                                    <div className="space-y-2 pt-2">
                                                        {e.partecipante_email && (
                                                            <button onClick={() => handleInviaEmailDaListaEventi(e)} disabled={invioEmailLoading}
                                                                className="w-full flex items-center justify-center gap-1.5 font-body text-xs py-1.5 border border-salvia/30 text-salvia hover:bg-salvia/10 transition-colors disabled:opacity-40">
                                                                {invioEmailLoading
                                                                    ? <span className="animate-spin w-3 h-3 border border-salvia border-t-transparent rounded-full" />
                                                                    : <><Send size={11} /> {e.email_inviata_at ? 'Rinvia email' : 'Invia email'}</>}
                                                            </button>
                                                        )}
                                                        <div className="flex gap-2">
                                                            <button onClick={() => apriModificaEvento(e)}
                                                                className="flex-1 font-body text-xs py-1.5 border border-oro/30 text-oro hover:bg-oro/10 transition-colors">
                                                                Modifica
                                                            </button>
                                                            <button onClick={() => handleElimina(e.id)}
                                                                className="flex-1 font-body text-xs py-1.5 border border-red-500/30 text-red-400 hover:bg-red-900/10 transition-colors">
                                                                Elimina
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>


            {/* TABELLA RIEPILOGO */}
            <div className="bg-slate border border-white/5">
                <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div>
                        <h2 className="font-display text-xl font-semibold text-nebbia">Riepilogo eventi</h2>
                        <p className="font-body text-xs text-nebbia/40 mt-0.5">Tutti gli appuntamenti visibili</p>
                    </div>
                    <div className="sm:ml-auto flex flex-wrap gap-2">
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nebbia/30" />
                            <input placeholder="Cerca..." value={tabellaSearch} onChange={e => setTabellaSearch(e.target.value)}
                                className="bg-petrolio border border-white/10 text-nebbia font-body text-xs pl-8 pr-3 py-2 outline-none focus:border-oro/50 w-40 placeholder:text-nebbia/25" />
                        </div>
                        <input type="date" value={tabellaFrom} onChange={e => setTabellaFrom(e.target.value)}
                            className="bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50" />
                        <input type="date" value={tabellaTo} onChange={e => setTabellaTo(e.target.value)}
                            className="bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50" />
                        <select value={tabellaTipo} onChange={e => setTabellaTipo(e.target.value)}
                            className="bg-petrolio border border-white/10 text-nebbia font-body text-xs px-3 py-2 outline-none focus:border-oro/50">
                            <option value="">Tutti i tipi</option>
                            {Object.entries(TIPO_CONFIG).map(([k, c]) => (
                                <option key={k} value={k}>{c.label}</option>
                            ))}
                        </select>
                        <button onClick={() => setTabellaSort(s => s === 'asc' ? 'desc' : 'asc')}
                            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1">
                            <Clock size={12} /> {tabellaSort === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {loadingApp ? (
                        <div className="flex items-center justify-center py-16">
                            <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                        </div>
                    ) : righe.length === 0 ? (
                        <p className="text-center py-12 font-body text-sm text-nebbia/30">Nessun evento trovato</p>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {['Tipo', 'Titolo', 'Partecipante', 'Creato da', 'Data & Ora', 'Vis.'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {righe.map(r => {
                                    const cfg = TIPO_CONFIG[r.tipo] ?? TIPO_CONFIG.altro
                                    const Icon = cfg.icon
                                    const adminCreatore = admins.find(a => a.id === r.creato_da)
                                    const dataOra = `${new Date(r.inizio).toLocaleDateString('it-IT')} ${oraDa(r.inizio)}`
                                    const partNome = r.partecipante
                                        ? `${r.partecipante.nome} ${r.partecipante.cognome}`
                                        : (r.partecipante_nome ?? '')
                                    return (
                                        <tr key={r.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className={`font-body text-[10px] px-2 py-0.5 border tracking-widest uppercase flex items-center gap-1 w-fit ${cfg.border} ${cfg.text}`}>
                                                    <Icon size={10} /> {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-body text-sm font-medium text-nebbia">{r.titolo}</td>
                                            <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                                                {partNome || '—'}
                                                {r.email_inviata_at && <Check size={11} className="inline ml-1 text-salvia" />}
                                            </td>
                                            <td className="px-4 py-3">
                                                {adminCreatore && (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${adminCreatore.color}`}>
                                                            {adminCreatore.nome[0]}
                                                        </span>
                                                        <span className="font-body text-xs text-nebbia/60">{adminCreatore.nome}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-body text-xs text-nebbia/60 whitespace-nowrap">{dataOra}</td>
                                            <td className="px-4 py-3">
                                                {r.visibilita === 'privato'
                                                    ? <Lock size={12} className="text-nebbia/40" />
                                                    : <Globe size={12} className="text-salvia/60" />}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <ModalAllegatiDefault
                open={showModalAllegati}
                onClose={() => setShowModalAllegati(false)}
            />
        </div>
    )
}