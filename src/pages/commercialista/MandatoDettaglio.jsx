// src/pages/commercialista/MandatoDettaglio.jsx
//
// Dettaglio di un mandato del commercialista (rotta /banco-lavoro/:id).
// Layout:
//   Riga 1: Anagrafica (cliente + dati + note) + Scadenze (con scadenzario)
//   Riga 2: Entrate/Uscite (cassa) — full width
//   Riga 3: Conto economico — full width
//   Riga 4: Liquidità + Budget — 2 colonne
//   Riga 5: Ricerche — full width
// (chat Lex del mandato arriverà con la Fase 5)

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
    ArrowLeft, Loader2, AlertCircle, FolderOpen, User, Building2,
    Mail, Phone, MapPin, Edit2, Check, ChevronRight, Users,
} from 'lucide-react'
import BoxScadenzeMandato from '@/components/commercialista/BoxScadenzeMandato'
import BoxRicercheMandato from '@/components/commercialista/BoxRicercheMandato'
import EntrateUscite from '@/components/commercialista/EntrateUscite'
import ReportConto from '@/components/commercialista/ReportConto'
import PianificazioneLiquidita from '@/components/commercialista/PianificazioneLiquidita'
import BudgetScostamenti from '@/components/commercialista/BudgetScostamenti'
import Contabilita from '@/components/commercialista/Contabilita'
import GestioneDipendenti from '@/components/commercialista/GestioneDipendenti'
import BoxDocumentiMandato from '@/components/commercialista/BoxDocumentiMandato'
import ChatMandato from '@/components/commercialista/ChatMandato'

function nomeCliente(c) {
    if (!c) return '—'
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

const STATO_CONFIG = {
    attivo: { label: 'Attivo', classe: 'bg-salvia/15 border-salvia/40 text-salvia' },
    sospeso: { label: 'Sospeso', classe: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
    concluso: { label: 'Concluso', classe: 'bg-oro/15 border-oro/40 text-oro' },
    archiviato: { label: 'Archiviato', classe: 'bg-white/5 border-white/15 text-nebbia/40' },
}

const STATI_MANDATO = ['attivo', 'sospeso', 'concluso', 'archiviato']

export default function MandatoDettaglio() {
    const { id } = useParams()

    const [mandato, setMandato] = useState(null)
    const [cliente, setCliente] = useState(null)
    const [loading, setLoading] = useState(true)
    const [errore, setErrore] = useState(null)

    const [cambiandoStato, setCambiandoStato] = useState(false)
    const [menuStato, setMenuStato] = useState(false)

    // Quando Entrate/Uscite salva o elimina un movimento, incrementa →
    // Report, Liquidità e Budget si ricaricano senza refresh della pagina.
    const [refreshMovimenti, setRefreshMovimenti] = useState(0)
    // Quando la chat Lex salva una risposta nelle ricerche → ricarica il box ricerche.
    const [refreshRicerche, setRefreshRicerche] = useState(0)
    // Quando la chat Lex salva un PDF nel mandato → ricarica il box documenti.
    const [refreshDocumenti, setRefreshDocumenti] = useState(0)

    useEffect(() => { caricaMandato() }, [id])

    async function caricaMandato() {
        setLoading(true)
        setErrore(null)
        try {
            const { data: m, error } = await supabase
                .from('mandati')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw new Error(error.message)
            if (!m) throw new Error('Mandato non trovato.')
            setMandato(m)

            if (m.cliente_id) {
                const { data: c } = await supabase
                    .from('profiles')
                    .select('id, nome, cognome, ragione_sociale, tipo_soggetto, email, telefono, comune, provincia, regime_contabile')
                    .eq('id', m.cliente_id)
                    .single()
                setCliente(c ?? null)
            }
        } catch (e) {
            setErrore(e.message)
        } finally {
            setLoading(false)
        }
    }

    async function cambiaStato(nuovoStato) {
        if (!mandato || nuovoStato === mandato.stato) { setMenuStato(false); return }
        setCambiandoStato(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase
                .from('mandati')
                .update({ stato: nuovoStato, aggiornato_da: user.id, updated_at: new Date().toISOString() })
                .eq('id', mandato.id)
            if (error) throw new Error(error.message)
            setMandato(prev => ({ ...prev, stato: nuovoStato }))
            setMenuStato(false)
        } catch (e) {
            setErrore(e.message)
        } finally {
            setCambiandoStato(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-40">
            <Loader2 size={24} className="animate-spin text-oro" />
        </div>
    )

    if (errore || !mandato) return (
        <div className="space-y-4">
            <Link to="/banco-lavoro" className="flex items-center gap-1.5 text-nebbia/40 hover:text-oro transition-colors font-body text-sm w-fit">
                <ArrowLeft size={14} /> Banco di lavoro
            </Link>
            <div className="flex items-center gap-2 text-red-400 text-sm font-body p-4 bg-red-900/10 border border-red-500/20">
                <AlertCircle size={15} /> {errore ?? 'Mandato non trovato.'}
            </div>
        </div>
    )

    const statoCfg = STATO_CONFIG[mandato.stato] ?? STATO_CONFIG.attivo

    return (
        <div className="space-y-6 pb-16">
            {/* Navigazione */}
            <Link to="/banco-lavoro" className="flex items-center gap-1.5 text-nebbia/40 hover:text-oro transition-colors font-body text-sm w-fit">
                <ArrowLeft size={14} /> Banco di lavoro
            </Link>

            {/* Header mandato */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="section-label">
                            <FolderOpen size={11} className="inline" /> Mandato
                        </span>
                        {mandato.tipo && (
                            <span className="font-body text-[10px] px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/50 uppercase tracking-wider">
                                {mandato.tipo}
                            </span>
                        )}
                        {mandato.anno_riferimento && (
                            <span className="font-body text-[10px] px-2 py-0.5 bg-petrolio border border-white/10 text-nebbia/50 uppercase tracking-wider">
                                {mandato.anno_riferimento}
                            </span>
                        )}
                    </div>
                    <h1 className="font-display text-3xl text-nebbia leading-tight">{mandato.titolo}</h1>
                </div>

                {/* Badge stato + cambio stato */}
                <div className="relative">
                    <button onClick={() => setMenuStato(v => !v)} disabled={cambiandoStato}
                        className={`flex items-center gap-2 px-3 py-1.5 border font-body text-xs uppercase tracking-wider transition-opacity hover:opacity-80 ${statoCfg.classe}`}>
                        {cambiandoStato
                            ? <Loader2 size={12} className="animate-spin" />
                            : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                        {statoCfg.label}
                        <Edit2 size={10} className="opacity-50" />
                    </button>
                    {menuStato && (
                        <div className="absolute z-40 top-full right-0 mt-1 w-44 bg-slate border border-white/10 shadow-2xl">
                            {STATI_MANDATO.map(s => {
                                const attivo = s === mandato.stato
                                return (
                                    <button key={s} onClick={() => cambiaStato(s)} disabled={cambiandoStato}
                                        className="w-full text-left px-3 py-2 hover:bg-petrolio/50 transition-colors border-b border-white/5 last:border-0 disabled:opacity-50 flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${attivo ? 'bg-oro' : 'bg-nebbia/20'}`} />
                                        <span className="font-body text-sm text-nebbia/70">{STATO_CONFIG[s].label}</span>
                                        {attivo && <Check size={12} className="text-oro ml-auto" />}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGA 1 — Anagrafica + Scadenze */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Anagrafica */}
                <div className="bg-slate border border-white/5 flex flex-col h-[440px]">
                    <div className="px-5 py-3 border-b border-white/5 shrink-0">
                        <p className="section-label">Anagrafica</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        {/* Cliente */}
                        {cliente ? (
                            <Link to={`/clienti/${cliente.id}`}
                                className="block bg-petrolio border border-white/5 hover:border-oro/30 transition-colors p-4 group">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 flex items-center justify-center border border-oro/20 bg-oro/5 shrink-0">
                                        {cliente.tipo_soggetto === 'persona_giuridica'
                                            ? <Building2 size={15} className="text-oro" />
                                            : <User size={15} className="text-oro" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-0.5">Cliente</p>
                                        <p className="font-body text-sm font-medium text-nebbia truncate">{nomeCliente(cliente)}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro transition-colors shrink-0" />
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                                    {cliente.email && (
                                        <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                            <Mail size={10} /> {cliente.email}
                                        </span>
                                    )}
                                    {cliente.telefono && (
                                        <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                            <Phone size={10} /> {cliente.telefono}
                                        </span>
                                    )}
                                    {(cliente.comune || cliente.provincia) && (
                                        <span className="font-body text-xs text-nebbia/40 flex items-center gap-1">
                                            <MapPin size={10} /> {[cliente.comune, cliente.provincia].filter(Boolean).join(', ')}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ) : (
                            <p className="font-body text-xs text-nebbia/30 italic">Nessun cliente collegato.</p>
                        )}

                        {/* Regime contabile del cliente (guida lo scadenzario) */}
                        {cliente && (
                            <div className="bg-petrolio/40 border border-white/5 p-3 flex items-center justify-between">
                                <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Regime contabile</span>
                                <span className="font-body text-xs text-nebbia/70 capitalize">
                                    {cliente.regime_contabile ?? 'non impostato'}
                                </span>
                            </div>
                        )}

                        {/* Dati mandato */}
                        <div className="space-y-2">
                            {[
                                ['Tipo', mandato.tipo ?? '—'],
                                ...(mandato.anno_riferimento ? [['Anno di riferimento', String(mandato.anno_riferimento)]] : []),
                                ['Creato il', new Date(mandato.created_at).toLocaleDateString('it-IT')],
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                                    <span className="font-body text-sm text-nebbia">{v}</span>
                                </div>
                            ))}
                        </div>

                        {/* Note */}
                        <div>
                            <p className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest mb-1.5">Note</p>
                            {mandato.note
                                ? <p className="font-body text-sm text-nebbia/70 whitespace-pre-wrap leading-relaxed">{mandato.note}</p>
                                : <p className="font-body text-xs text-nebbia/25 italic">Nessuna nota.</p>}
                        </div>
                    </div>
                </div>

                {/* Scadenze */}
                <BoxScadenzeMandato
                    mandatoId={mandato.id}
                    clienteId={mandato.cliente_id}
                    studioId={mandato.studio_id}
                    anno={mandato.anno_riferimento}
                    regime={cliente?.regime_contabile ?? null}
                />
            </div>

            {/* RIGA 2 — Entrate e uscite (cassa) */}
            <EntrateUscite
                clienteId={mandato.cliente_id}
                mandatoId={mandato.id}
                anno={mandato.anno_riferimento}
                onMovimentiChange={() => setRefreshMovimenti(k => k + 1)}
                refreshTrigger={refreshMovimenti}
            />

            {/* RIGA 2b — Documenti del mandato + estrazione OCR movimenti */}
            <BoxDocumentiMandato
                mandatoId={mandato.id}
                clienteId={mandato.cliente_id}
                onMovimentoChange={() => setRefreshMovimenti(k => k + 1)}
                refreshTrigger={refreshDocumenti}
            />

            {/* RIGA 3 — Conto economico */}
            <ReportConto
                clienteId={mandato.cliente_id}
                mandatoId={mandato.id}
                anno={mandato.anno_riferimento}
                refreshTrigger={refreshMovimenti}
            />

            {/* RIGA 4 — Liquidità + Budget */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                <PianificazioneLiquidita
                    clienteId={mandato.cliente_id}
                    mandatoId={mandato.id}
                    refreshTrigger={refreshMovimenti}
                />
                <BudgetScostamenti
                    clienteId={mandato.cliente_id}
                    mandatoId={mandato.id}
                    anno={mandato.anno_riferimento}
                    refreshTrigger={refreshMovimenti}
                />
            </div>

            {/* RIGA 5 — Dipendenti e costo del personale */}
            {mandato.cliente_id && (
                <div className="bg-slate border border-white/5 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={15} className="text-oro/60" />
                        <h2 className="font-display text-lg text-nebbia">Dipendenti e costo del personale</h2>
                    </div>
                    <GestioneDipendenti clienteId={mandato.cliente_id} anno={mandato.anno_riferimento} />
                </div>
            )}

            {/* RIGA 6 — Contabilità in partita doppia */}
            <Contabilita clienteId={mandato.cliente_id} mandatoId={mandato.id} />

            {/* RIGA 7 — Assistente Lex del mandato */}
            <ChatMandato
                mandatoId={mandato.id}
                onRicercaSalvata={() => setRefreshRicerche(k => k + 1)}
                onDocumentoSalvato={() => setRefreshDocumenti(k => k + 1)}
            />

            {/* RIGA 8 — Ricerche */}
            <BoxRicercheMandato mandatoId={mandato.id} refreshTrigger={refreshRicerche} />
        </div>
    )
}
