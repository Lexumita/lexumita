// src/pages/admin/MailLog.jsx
//
// Pannello admin con due tab:
//   - Storico: legge mail_log con filtri e dettaglio modale
//   - Invia email: composer con selezione template Postmark + filtri destinatari + invio batch

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Badge } from '@/components/shared'
import {
    Mail, Search, Filter, X, AlertCircle, Loader2,
    CheckCircle, XCircle, Clock, Eye, AlertTriangle,
    Send, ChevronLeft, ChevronRight, RefreshCw, User,
    Calendar, ArrowRight, Inbox, MailPlus, Users, FileText,
    Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 30

// ─── HELPERS ────────────────────────────────────────────────

const STATO_CONFIG = {
    queued: { label: 'In coda', variant: 'gray', icon: Clock },
    sent: { label: 'Inviata', variant: 'oro', icon: Send },
    delivered: { label: 'Consegnata', variant: 'salvia', icon: CheckCircle },
    opened: { label: 'Aperta', variant: 'salvia', icon: Eye },
    bounced: { label: 'Rimbalzata', variant: 'red', icon: AlertTriangle },
    spam: { label: 'Spam', variant: 'red', icon: XCircle },
    failed: { label: 'Fallita', variant: 'red', icon: XCircle },
}

function formatDateTime(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

// ─── MODAL DETTAGLIO ───────────────────────────────────────

function ModalDettaglio({ mail, onClose }) {
    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const sc = STATO_CONFIG[mail.stato] ?? STATO_CONFIG.queued
    const Icon = sc.icon

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-slate border border-white/10 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        <Mail size={14} className="text-oro" />
                        <p className="font-body text-sm font-medium text-nebbia">Dettaglio email</p>
                    </div>
                    <button onClick={onClose} className="text-nebbia/40 hover:text-nebbia transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Icon size={14} className={`text-${sc.variant === 'salvia' ? 'salvia' : sc.variant === 'red' ? 'red-400' : sc.variant === 'oro' ? 'oro' : 'nebbia/50'}`} />
                        <Badge label={sc.label} variant={sc.variant} />
                    </div>

                    <div className="bg-petrolio/40 border border-white/5 p-4 space-y-2">
                        <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest">Destinatario</p>
                        <p className="font-body text-sm text-nebbia">{mail.to_email}</p>
                        {mail.to_user_id && (
                            <Link to={`/admin/utenti/${mail.to_user_id}`}
                                className="font-body text-xs text-oro hover:text-oro/70 flex items-center gap-1">
                                Apri profilo utente <ArrowRight size={11} />
                            </Link>
                        )}
                    </div>

                    <div className="bg-petrolio/40 border border-white/5 p-4 space-y-2">
                        <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest">Mittente</p>
                        <p className="font-body text-sm text-nebbia">{mail.from_email}</p>
                        {mail.reply_to && <p className="font-body text-xs text-nebbia/50">Reply-To: {mail.reply_to}</p>}
                    </div>

                    {mail.subject && (
                        <div className="bg-petrolio/40 border border-white/5 p-4 space-y-1">
                            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest">Oggetto</p>
                            <p className="font-body text-sm text-nebbia">{mail.subject}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-petrolio/40 border border-white/5 p-3">
                            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">Tipo</p>
                            <p className="font-body text-sm text-nebbia">{mail.tipo ?? '—'}</p>
                        </div>
                        <div className="bg-petrolio/40 border border-white/5 p-3">
                            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">Origine</p>
                            <p className="font-body text-sm text-nebbia">{mail.origine ?? '—'}</p>
                        </div>
                    </div>

                    {mail.template_alias && (
                        <div className="bg-petrolio/40 border border-white/5 p-4 space-y-1">
                            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest">Template Postmark</p>
                            <p className="font-body text-sm font-mono text-oro">{mail.template_alias}</p>
                        </div>
                    )}

                    {mail.template_model && Object.keys(mail.template_model).length > 0 && (
                        <div className="bg-petrolio/40 border border-white/5 p-4 space-y-2">
                            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest">Variabili template</p>
                            <pre className="font-mono text-xs text-nebbia/70 overflow-x-auto">
                                {JSON.stringify(mail.template_model, null, 2)}
                            </pre>
                        </div>
                    )}

                    {mail.error_message && (
                        <div className="bg-red-900/10 border border-red-500/20 p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={13} className="text-red-400" />
                                <p className="font-body text-xs text-red-400 uppercase tracking-widest">Errore</p>
                            </div>
                            <p className="font-body text-sm text-red-400/80 leading-relaxed">{mail.error_message}</p>
                            {mail.bounce_type && <p className="font-body text-xs text-red-400/60">Bounce type: {mail.bounce_type}</p>}
                        </div>
                    )}

                    <div className="bg-petrolio/40 border border-white/5 p-4 space-y-2">
                        <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Timeline</p>
                        {[
                            ['Creata', mail.created_at],
                            ['Inviata', mail.sent_at],
                            ['Consegnata', mail.delivered_at],
                            ['Aperta', mail.opened_at],
                            ['Rimbalzata', mail.bounced_at],
                        ].filter(([_, v]) => v).map(([l, v]) => (
                            <div key={l} className="flex justify-between border-b border-white/5 pb-1.5 last:border-0">
                                <span className="font-body text-xs text-nebbia/40">{l}</span>
                                <span className="font-body text-xs text-nebbia/70">{formatDateTime(v)}</span>
                            </div>
                        ))}
                    </div>

                    {mail.postmark_message_id && (
                        <div className="bg-petrolio/40 border border-white/5 p-3">
                            <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">MessageID Postmark</p>
                            <p className="font-mono text-xs text-nebbia/60 break-all">{mail.postmark_message_id}</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/5 shrink-0">
                    <button onClick={onClose}
                        className="px-4 py-2 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors">
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── TAB STORICO ────────────────────────────────────────────

function TabStorico() {
    const [mails, setMails] = useState([])
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState(null)

    const [pagina, setPagina] = useState(0)
    const [totale, setTotale] = useState(0)

    const [filtroSearch, setFiltroSearch] = useState('')
    const [filtroTipo, setFiltroTipo] = useState('')
    const [filtroStato, setFiltroStato] = useState('')
    const [filtroOrigine, setFiltroOrigine] = useState('')
    const [filtroData, setFiltroData] = useState('30gg')

    const [tipiDisponibili, setTipiDisponibili] = useState([])
    const [originiDisponibili, setOriginiDisponibili] = useState([])

    const [selezionata, setSelezionata] = useState(null)
    const [stats, setStats] = useState({ totali: 0, inviate: 0, fallite: 0, aperte: 0 })

    useEffect(() => { setPagina(0) }, [filtroSearch, filtroTipo, filtroStato, filtroOrigine, filtroData])
    useEffect(() => { carica() }, [pagina, filtroSearch, filtroTipo, filtroStato, filtroOrigine, filtroData])
    useEffect(() => { caricaMetadati() }, [])

    function calcolaDataMin() {
        const ora = new Date()
        if (filtroData === '7gg') return new Date(ora.getTime() - 7 * 86400000).toISOString()
        if (filtroData === '30gg') return new Date(ora.getTime() - 30 * 86400000).toISOString()
        if (filtroData === '90gg') return new Date(ora.getTime() - 90 * 86400000).toISOString()
        return null
    }

    async function carica() {
        setLoading(true); setErrore(null)
        try {
            let q = supabase.from('mail_log')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1)

            const dataMin = calcolaDataMin()
            if (dataMin) q = q.gte('created_at', dataMin)
            if (filtroTipo) q = q.eq('tipo', filtroTipo)
            if (filtroStato) q = q.eq('stato', filtroStato)
            if (filtroOrigine) q = q.eq('origine', filtroOrigine)
            if (filtroSearch.trim()) {
                const s = filtroSearch.trim()
                q = q.or(`to_email.ilike.%${s}%,subject.ilike.%${s}%`)
            }

            const { data, count, error } = await q
            if (error) throw new Error(error.message)
            setMails(data ?? [])
            setTotale(count ?? 0)
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
        }
    }

    async function caricaMetadati() {
        const [{ data: tipi }, { data: origini }] = await Promise.all([
            supabase.from('mail_log').select('tipo').not('tipo', 'is', null),
            supabase.from('mail_log').select('origine').not('origine', 'is', null),
        ])
        setTipiDisponibili([...new Set((tipi ?? []).map(t => t.tipo))].sort())
        setOriginiDisponibili([...new Set((origini ?? []).map(o => o.origine))].sort())

        const dataMin = new Date(Date.now() - 30 * 86400000).toISOString()
        const { data: statsData } = await supabase.from('mail_log')
            .select('stato').gte('created_at', dataMin)
        const tutti = statsData ?? []
        setStats({
            totali: tutti.length,
            inviate: tutti.filter(s => ['sent', 'delivered', 'opened'].includes(s.stato)).length,
            fallite: tutti.filter(s => ['bounced', 'spam', 'failed'].includes(s.stato)).length,
            aperte: tutti.filter(s => s.stato === 'opened').length,
        })
    }

    function resetFiltri() {
        setFiltroSearch(''); setFiltroTipo(''); setFiltroStato(''); setFiltroOrigine(''); setFiltroData('30gg')
    }

    const filtriAttivi = filtroSearch || filtroTipo || filtroStato || filtroOrigine || filtroData !== '30gg'
    const totalePagine = Math.ceil(totale / PAGE_SIZE)

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={() => { carica(); caricaMetadati() }}
                    className="flex items-center gap-1.5 text-sm border border-white/10 text-nebbia/60 hover:border-oro/30 hover:text-oro font-body px-3 py-2 transition-colors">
                    <RefreshCw size={13} /> Aggiorna
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate border border-white/5 p-4">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Totali (30gg)</p>
                    <p className="font-display text-2xl font-light text-nebbia">{stats.totali}</p>
                </div>
                <div className="bg-slate border border-white/5 p-4">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Inviate</p>
                    <p className="font-display text-2xl font-light text-salvia">{stats.inviate}</p>
                </div>
                <div className="bg-slate border border-white/5 p-4">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Aperte</p>
                    <p className="font-display text-2xl font-light text-oro">{stats.aperte}</p>
                </div>
                <div className="bg-slate border border-white/5 p-4">
                    <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Fallite</p>
                    <p className="font-display text-2xl font-light text-red-400">{stats.fallite}</p>
                </div>
            </div>

            <div className="bg-slate border border-white/5 p-4 space-y-3">
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input placeholder="Cerca per email o oggetto..." value={filtroSearch}
                        onChange={e => setFiltroSearch(e.target.value)}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-9 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                    {filtroSearch && (
                        <button onClick={() => setFiltroSearch('')}
                            className="absolute top-1/2 -translate-y-1/2 right-2 text-nebbia/30 hover:text-nebbia p-1">
                            <X size={13} />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-nebbia/30">
                        <Filter size={12} />
                        <span className="font-body text-xs uppercase tracking-widest">Filtri</span>
                    </div>

                    <select value={filtroData} onChange={e => setFiltroData(e.target.value)}
                        className="bg-petrolio border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                        <option value="7gg">Ultimi 7 giorni</option>
                        <option value="30gg">Ultimi 30 giorni</option>
                        <option value="90gg">Ultimi 90 giorni</option>
                        <option value="tutti">Tutti</option>
                    </select>

                    <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)}
                        className="bg-petrolio border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                        <option value="">Tutti gli stati</option>
                        {Object.entries(STATO_CONFIG).map(([v, c]) => (
                            <option key={v} value={v}>{c.label}</option>
                        ))}
                    </select>

                    {tipiDisponibili.length > 0 && (
                        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                            className="bg-petrolio border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                            <option value="">Tutti i tipi</option>
                            {tipiDisponibili.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}

                    {originiDisponibili.length > 0 && (
                        <select value={filtroOrigine} onChange={e => setFiltroOrigine(e.target.value)}
                            className="bg-petrolio border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                            <option value="">Tutte le origini</option>
                            {originiDisponibili.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    )}

                    {filtriAttivi && (
                        <button onClick={resetFiltri}
                            className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors flex items-center gap-1">
                            <X size={11} /> Reset filtri
                        </button>
                    )}
                </div>
            </div>

            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={13} /> {errore}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-oro" />
                </div>
            ) : mails.length === 0 ? (
                <div className="bg-slate border border-white/5 p-10 text-center">
                    <Mail size={28} className="text-nebbia/20 mx-auto mb-2" />
                    <p className="font-body text-sm text-nebbia/40">Nessuna email trovata</p>
                    <p className="font-body text-xs text-nebbia/25 mt-1">
                        {filtriAttivi ? 'Prova a rimuovere alcuni filtri' : 'Le email inviate dalla piattaforma compariranno qui'}
                    </p>
                </div>
            ) : (
                <>
                    <p className="font-body text-xs text-nebbia/40">
                        {totale} email totali · pagina {pagina + 1} di {totalePagine || 1}
                    </p>

                    <div className="bg-slate border border-white/5 overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {['Stato', 'Destinatario', 'Oggetto', 'Tipo', 'Origine', 'Inviata il', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {mails.map(m => {
                                    const sc = STATO_CONFIG[m.stato] ?? STATO_CONFIG.queued
                                    return (
                                        <tr key={m.id} onClick={() => setSelezionata(m)}
                                            className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer">
                                            <td className="px-4 py-3"><Badge label={sc.label} variant={sc.variant} /></td>
                                            <td className="px-4 py-3">
                                                <p className="font-body text-sm text-nebbia truncate max-w-[200px]">{m.to_email}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-body text-sm text-nebbia/70 truncate max-w-[260px]">{m.subject ?? '—'}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {m.tipo ? (
                                                    <span className="font-body text-[10px] px-1.5 py-0.5 bg-oro/5 border border-oro/20 text-oro/80 uppercase tracking-wider">{m.tipo}</span>
                                                ) : <span className="font-body text-xs text-nebbia/25">—</span>}
                                            </td>
                                            <td className="px-4 py-3 font-body text-xs text-nebbia/40">{m.origine ?? '—'}</td>
                                            <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{formatDateTime(m.created_at)}</td>
                                            <td className="px-4 py-3 text-right"><ArrowRight size={13} className="text-nebbia/20" /></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalePagine > 1 && (
                        <div className="flex items-center justify-between">
                            <button onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina === 0}
                                className="flex items-center gap-1.5 px-3 py-2 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                <ChevronLeft size={13} /> Precedente
                            </button>
                            <p className="font-body text-xs text-nebbia/40">Pagina {pagina + 1} di {totalePagine}</p>
                            <button onClick={() => setPagina(p => Math.min(totalePagine - 1, p + 1))} disabled={pagina >= totalePagine - 1}
                                className="flex items-center gap-1.5 px-3 py-2 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                Successiva <ChevronRight size={13} />
                            </button>
                        </div>
                    )}
                </>
            )}

            {selezionata && <ModalDettaglio mail={selezionata} onClose={() => setSelezionata(null)} />}
        </div>
    )
}

// ─── TAB INVIA EMAIL ────────────────────────────────────────

function TabInvia() {
    // Templates
    const [templates, setTemplates] = useState([])
    const [templateAlias, setTemplateAlias] = useState('')
    const [loadingTemplates, setLoadingTemplates] = useState(true)

    // Filtri destinatari
    const [filtroRole, setFiltroRole] = useState('')
    const [filtroAbbonamento, setFiltroAbbonamento] = useState('')
    const [filtroProdotto, setFiltroProdotto] = useState('')
    const [soloEmailVerificate, setSoloEmailVerificate] = useState(true)
    const [search, setSearch] = useState('')

    // Prodotti per dropdown
    const [prodotti, setProdotti] = useState([])

    // Risultato filtri (lista utenti)
    const [utenti, setUtenti] = useState([])
    const [caricandoUtenti, setCaricandoUtenti] = useState(false)
    const [erroreUtenti, setErroreUtenti] = useState(null)

    // Selezione destinatari
    const [selezionati, setSelezionati] = useState(new Set())

    // Reply-to opzionale
    const [replyTo, setReplyTo] = useState('')

    // Tipo logico per il log
    const [tipoLog, setTipoLog] = useState('newsletter')

    // Invio
    const [inviando, setInviando] = useState(false)
    const [risultatoInvio, setRisultatoInvio] = useState(null)
    const [erroreInvio, setErroreInvio] = useState(null)

    useEffect(() => { caricaTemplates() }, [])
    useEffect(() => { caricaProdotti() }, [])

    async function caricaTemplates() {
        setLoadingTemplates(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-postmark-templates`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            setTemplates(json.templates ?? [])
        } catch (e) {
            console.error('Errore caricamento templates:', e.message)
        } finally {
            setLoadingTemplates(false)
        }
    }

    async function caricaProdotti() {
        const { data } = await supabase
            .from('prodotti')
            .select('id, nome, tipo')
            .order('nome')
        setProdotti(data ?? [])
    }

    async function caricaUtenti() {
        setCaricandoUtenti(true); setErroreUtenti(null); setSelezionati(new Set())
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-utenti-filtrati`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        role: filtroRole || null,
                        abbonamento: filtroAbbonamento || null,
                        prodottoId: filtroProdotto || null,
                        soloEmailVerificate,
                        search,
                    }),
                }
            )
            const json = await res.json()
            if (!json.ok) throw new Error(json.error)
            setUtenti(json.utenti ?? [])
        } catch (e) {
            setErroreUtenti(e.message)
        } finally {
            setCaricandoUtenti(false)
        }
    }

    function toggleSelezione(id) {
        setSelezionati(prev => {
            const nuovo = new Set(prev)
            if (nuovo.has(id)) nuovo.delete(id)
            else nuovo.add(id)
            return nuovo
        })
    }

    function selezionaTutti() {
        if (selezionati.size === utenti.length) {
            setSelezionati(new Set())
        } else {
            setSelezionati(new Set(utenti.map(u => u.id)))
        }
    }

    async function invia() {
        if (!templateAlias) { setErroreInvio('Seleziona un template'); return }
        if (selezionati.size === 0) { setErroreInvio('Seleziona almeno un destinatario'); return }
        const utentiDaInviare = utenti.filter(u => selezionati.has(u.id))
        if (!confirm(`Inviare email a ${utentiDaInviare.length} ${utentiDaInviare.length === 1 ? 'destinatario' : 'destinatari'}?`)) return

        setInviando(true); setErroreInvio(null); setRisultatoInvio(null)
        let inviateOk = 0, inviateKo = 0
        const errori = []

        try {
            const { data: { session } } = await supabase.auth.getSession()

            // Invio sequenziale a piccoli batch per non saturare
            const BATCH = 5
            for (let i = 0; i < utentiDaInviare.length; i += BATCH) {
                const batch = utentiDaInviare.slice(i, i + BATCH)
                await Promise.all(batch.map(async u => {
                    try {
                        const res = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-mail`,
                            {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${session.access_token}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    to: u.email,
                                    templateAlias,
                                    templateModel: {
                                        nome: u.nome ?? '',
                                        cognome: u.cognome ?? '',
                                        ragione_sociale: u.ragione_sociale ?? '',
                                        display_nome: u.display_nome,
                                        email: u.email,
                                    },
                                    tipo: tipoLog || 'manuale',
                                    origine: 'invia-email-admin',
                                    toUserId: u.id,
                                    replyTo: replyTo || undefined,
                                }),
                            }
                        )
                        const json = await res.json()
                        if (json.ok && json.inviati > 0) inviateOk++
                        else { inviateKo++; errori.push(`${u.email}: ${json.error ?? 'errore sconosciuto'}`) }
                    } catch (e) {
                        inviateKo++
                        errori.push(`${u.email}: ${e.message}`)
                    }
                }))
            }

            setRisultatoInvio({ ok: inviateOk, ko: inviateKo, errori: errori.slice(0, 10) })
            if (inviateOk > 0 && inviateKo === 0) {
                // Reset selezione dopo invio totalmente riuscito
                setSelezionati(new Set())
            }
        } catch (e) {
            setErroreInvio(e.message)
        } finally {
            setInviando(false)
        }
    }

    const templateScelto = templates.find(t => t.alias === templateAlias)
    const filtriAttivi = filtroRole || filtroAbbonamento || filtroProdotto || search || !soloEmailVerificate

    return (
        <div className="space-y-6">
            {/* Step 1 — Template */}
            <div className="bg-slate border border-white/5 p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-oro/10 border border-oro/30 text-oro font-body text-xs">1</span>
                    <p className="section-label">Scegli il template</p>
                </div>
                {loadingTemplates ? (
                    <div className="flex items-center gap-2 text-nebbia/40 font-body text-sm">
                        <Loader2 size={13} className="animate-spin" /> Caricamento template Postmark...
                    </div>
                ) : templates.length === 0 ? (
                    <p className="font-body text-sm text-nebbia/40">
                        Nessun template trovato su Postmark. Creane uno dalla dashboard Postmark.
                    </p>
                ) : (
                    <>
                        <select value={templateAlias} onChange={e => setTemplateAlias(e.target.value)}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                            <option value="">— Seleziona un template —</option>
                            {templates.map(t => (
                                <option key={t.alias} value={t.alias}>{t.name} ({t.alias})</option>
                            ))}
                        </select>
                        {templateScelto && (
                            <div className="bg-petrolio/40 border border-white/5 p-3 space-y-1">
                                <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest">Oggetto</p>
                                <p className="font-body text-sm text-nebbia">{templateScelto.subject}</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Step 2 — Filtri destinatari */}
            <div className="bg-slate border border-white/5 p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-oro/10 border border-oro/30 text-oro font-body text-xs">2</span>
                    <p className="section-label">Filtra destinatari</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">Ruolo</label>
                        <select value={filtroRole} onChange={e => setFiltroRole(e.target.value)}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50">
                            <option value="">Tutti</option>
                            <option value="avvocato">Avvocati</option>
                            <option value="cliente">Clienti</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">Abbonamento</label>
                        <select value={filtroAbbonamento} onChange={e => setFiltroAbbonamento(e.target.value)}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50">
                            <option value="">Qualsiasi</option>
                            <option value="attivo">Attivo</option>
                            <option value="scaduto">Scaduto</option>
                            <option value="mai_avuto">Mai avuto</option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">Prodotto acquistato</label>
                        <select value={filtroProdotto} onChange={e => setFiltroProdotto(e.target.value)}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50">
                            <option value="">Qualsiasi</option>
                            {prodotti.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">Cerca per nome/email</label>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="..."
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                    </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={soloEmailVerificate} onChange={e => setSoloEmailVerificate(e.target.checked)}
                        className="accent-oro" />
                    <span className="font-body text-sm text-nebbia/60">Solo email verificate (raccomandato)</span>
                </label>

                <div className="flex items-center gap-2">
                    <button onClick={caricaUtenti} disabled={caricandoUtenti}
                        className="flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40">
                        {caricandoUtenti
                            ? <><Loader2 size={13} className="animate-spin" /> Caricamento...</>
                            : <><Users size={13} /> Carica destinatari</>
                        }
                    </button>
                    {erroreUtenti && (
                        <span className="font-body text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle size={11} /> {erroreUtenti}
                        </span>
                    )}
                </div>
            </div>

            {/* Step 3 — Lista destinatari + selezione */}
            {utenti.length > 0 && (
                <div className="bg-slate border border-white/5 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-oro/10 border border-oro/30 text-oro font-body text-xs">3</span>
                            <p className="section-label">Seleziona destinatari</p>
                        </div>
                        <p className="font-body text-xs text-nebbia/40">
                            <strong className="text-oro">{selezionati.size}</strong> di {utenti.length} selezionati
                        </p>
                    </div>

                    <button onClick={selezionaTutti}
                        className="font-body text-xs text-oro hover:text-oro/70 transition-colors">
                        {selezionati.size === utenti.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                    </button>

                    <div className="bg-petrolio/40 border border-white/5 max-h-96 overflow-y-auto">
                        {utenti.map(u => {
                            const sel = selezionati.has(u.id)
                            return (
                                <button key={u.id} onClick={() => toggleSelezione(u.id)}
                                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-petrolio transition-colors ${sel ? 'bg-oro/5' : ''}`}>
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-4 h-4 border flex items-center justify-center shrink-0 ${sel ? 'bg-oro border-oro' : 'border-white/20'}`}>
                                            {sel && <Check size={10} className="text-petrolio" strokeWidth={3} />}
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="font-body text-sm text-nebbia truncate">{u.display_nome}</p>
                                            <p className="font-body text-xs text-nebbia/40 truncate">{u.email}</p>
                                        </div>
                                    </div>
                                    <span className="font-body text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 text-nebbia/50 uppercase tracking-wider shrink-0">
                                        {u.role}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Step 4 — Opzioni invio + invio */}
            {utenti.length > 0 && (
                <div className="bg-slate border border-white/5 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center bg-oro/10 border border-oro/30 text-oro font-body text-xs">4</span>
                        <p className="section-label">Opzioni e invio</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">Tipo (per il log)</label>
                            <input value={tipoLog} onChange={e => setTipoLog(e.target.value)}
                                placeholder="es. newsletter, promo_estate"
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                            <p className="font-body text-xs text-nebbia/30 mt-1">Etichetta libera per ritrovare questo invio nello storico</p>
                        </div>
                        <div>
                            <label className="block font-body text-xs text-nebbia/40 uppercase tracking-widest mb-1">Reply-To (opzionale)</label>
                            <input type="email" value={replyTo} onChange={e => setReplyTo(e.target.value)}
                                placeholder="info@lexum.it"
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                            <p className="font-body text-xs text-nebbia/30 mt-1">Le risposte arriveranno a questo indirizzo</p>
                        </div>
                    </div>

                    {erroreInvio && (
                        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                            <AlertCircle size={13} /> {erroreInvio}
                        </div>
                    )}

                    {risultatoInvio && (
                        <div className={`p-4 border ${risultatoInvio.ko === 0 ? 'bg-salvia/5 border-salvia/30' : 'bg-amber-900/10 border-amber-500/30'}`}>
                            <p className={`font-body text-sm font-medium ${risultatoInvio.ko === 0 ? 'text-salvia' : 'text-amber-400'}`}>
                                Inviati: {risultatoInvio.ok} · Falliti: {risultatoInvio.ko}
                            </p>
                            {risultatoInvio.errori.length > 0 && (
                                <ul className="mt-2 space-y-0.5">
                                    {risultatoInvio.errori.map((e, i) => (
                                        <li key={i} className="font-body text-xs text-red-400/70">{e}</li>
                                    ))}
                                </ul>
                            )}
                            <p className="font-body text-xs text-nebbia/40 mt-2">
                                Vai allo storico per vedere lo stato di consegna in tempo reale.
                            </p>
                        </div>
                    )}

                    <button onClick={invia} disabled={inviando || !templateAlias || selezionati.size === 0}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {inviando
                            ? <><Loader2 size={14} className="animate-spin" /> Invio in corso...</>
                            : <><Send size={14} /> Invia a {selezionati.size} destinatari</>
                        }
                    </button>
                </div>
            )}
        </div>
    )
}

// ─── PAGINA PRINCIPALE ─────────────────────────────────────

export default function MailLog() {
    const [tab, setTab] = useState('storico')

    const TABS = [
        { id: 'storico', label: 'Storico', icon: Inbox },
        { id: 'invia', label: 'Invia email', icon: MailPlus },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                label="Admin"
                title="Email"
                subtitle="Storico e invio email transazionali"
            />

            <div className="flex gap-0 border-b border-white/8 overflow-x-auto">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setTab(id)}
                        className={`flex items-center gap-2 px-5 py-3 font-body text-sm border-b-2 transition-colors ${tab === id ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'}`}>
                        <Icon size={14} strokeWidth={1.5} /> {label}
                    </button>
                ))}
            </div>

            {tab === 'storico' && <TabStorico />}
            {tab === 'invia' && <TabInvia />}
        </div>
    )
}