// src/components/ContoPrivato.jsx
//
// Crediti, archivio e abbonamento di un privato (28-10-2026, deciso da Antonino dopo l'anteprima).
// - Crediti disponibili con «+» (i pacchetti: si comprano una volta e non scadono) e una riga sola che dice
//   da dove vengono: del piano, comprati, di benvenuto.
// - Archivio con la barra e lo spazio usato: 50 MB gratuiti, più quelli dell'abbonamento e dell'archivio in
//   più. Il «+» c'è solo con un abbonamento attivo: l'archivio in più si paga ogni mese.
// - Abbonamento: «Abbonamento» per sceglierne uno, oppure piano, prezzo, rinnovo e «Gestisci».
// Gli abbonamenti si rinnovano da soli ogni mese (Tagadapay sul sito, Apple su iPhone) finché non si
// disdicono. Per scendere a un piano più piccolo o togliere archivio i file devono stare nella nuova quota:
// lo controlla abbonamento-gestisci.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrezzo } from '@/lib/prezzi'
import { Plus, Loader2, X, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

const MB = 1024 * 1024
const GB = 1024 * MB

/** «12 MB», «1,2 GB» */
export function misura(byte) {
    const n = Number(byte ?? 0)
    if (n < GB) return `${Math.round(n / MB)} MB`
    return `${(Math.round((n / GB) * 10) / 10).toLocaleString('it-IT')} GB`
}

const dataCorta = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
const dataLunga = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })

/** Crediti, archivio e abbonamenti di chi è entrato, letti come li legge Lex e l'archivio. */
export function useContoPrivato(profile) {
    const [conto, setConto] = useState({ caricato: false })

    const carica = useCallback(async () => {
        if (!profile?.id) return
        const adesso = new Date()
        const [cred, spazio, abb] = await Promise.all([
            supabase.from('crediti_ai')
                .select('tipo, crediti_totali, crediti_usati, periodo_fine')
                .eq('user_id', profile.id)
                .or(`periodo_fine.is.null,periodo_fine.gte.${adesso.toISOString()}`),
            supabase.rpc('archivio_spazio', { p_titolare: profile.titolare_id ?? profile.id }),
            supabase.from('abbonamenti')
                .select('id, fornitore, genere, stato, periodo_fine, prodotto_successivo_id, prodotto:prodotto_id(id, nome, prezzo, crediti_ai_mensili, spazio_gb, codice)')
                .eq('user_id', profile.id)
                .neq('stato', 'chiuso')
                .order('creato_il'),
        ])

        const crediti = { piano: 0, topup: 0, benvenuto: 0, totale: 0, pianoFino: null }
        for (const r of cred.data ?? []) {
            const rimasti = (r.crediti_totali ?? 0) - (r.crediti_usati ?? 0)
            if (rimasti <= 0) continue
            if (crediti[r.tipo] !== undefined) crediti[r.tipo] += rimasti
            crediti.totale += rimasti
            if (r.tipo === 'piano' && r.periodo_fine && (!crediti.pianoFino || r.periodo_fine < crediti.pianoFino)) {
                crediti.pianoFino = r.periodo_fine
            }
        }

        const s = (Array.isArray(spazio.data) ? spazio.data[0] : spazio.data) ?? {}
        const archivio = {
            usati: Number(s.usati_bytes ?? 0),
            quota: Number(s.quota_bytes ?? 0),
            gratuiti: Number(s.gratuiti_bytes ?? 0),
            piano: Number(s.piano_bytes ?? 0),
            extra: Number(s.extra_bytes ?? 0),
        }

        const tutti = abb.data ?? []
        const inCorso = (a) => a.periodo_fine && new Date(a.periodo_fine) > adesso
        const piano = tutti.find(a => a.genere === 'piano' && inCorso(a)) ?? null
        // un piano più piccolo programmato per il mese dopo: creato, non ancora pagato
        const prossimo = tutti.find(a => a.genere === 'piano' && !a.periodo_fine && a.stato === 'attivo') ?? null
        const archivioInPiu = tutti.filter(a => a.genere === 'archivio' && inCorso(a))
        // un Piano Personale comprato prima degli abbonamenti (un mese, senza rinnovo)
        const vecchioPiano = !piano && profile.piano_id && profile.abbonamento_scadenza && new Date(profile.abbonamento_scadenza) > adesso
            ? { nome: profile.abbonamento_tipo, fino: profile.abbonamento_scadenza }
            : null

        setConto({ caricato: true, crediti, archivio, piano, prossimo, archivioInPiu, vecchioPiano })
    }, [profile?.id, profile?.titolare_id, profile?.piano_id, profile?.abbonamento_scadenza, profile?.abbonamento_tipo])

    useEffect(() => { carica() }, [carica])
    return { ...conto, ricarica: carica }
}

/** Le azioni di «Gestisci» (abbonamento-gestisci): disdici, riattiva, cambia. */
export async function gestisciAbbonamento(azione, abbonamentoId, prodottoId) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abbonamento-gestisci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ azione, abbonamento_id: abbonamentoId, prodotto_id: prodottoId }),
    })
    return res.json().catch(() => ({ ok: false, error: 'Non è stato possibile completare l’operazione.' }))
}

/** Lo stato del rinnovo in un riquadro: verde «Si rinnova il …», ambra se disdetto o non pagato. */
export function StatoRinnovo({ abbonamento, className = '' }) {
    const { stato, periodo_fine: fine } = abbonamento
    if (stato === 'disdetto' || stato === 'in_ritardo') {
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-900/20 border border-amber-500/30 text-amber-400 font-body text-xs ${className}`}>
                <AlertCircle size={12} className="shrink-0" />
                {stato === 'disdetto' ? `Disdetto: attivo fino al ${dataLunga(fine)}` : 'Rinnovo non pagato: si riprova nei prossimi giorni'}
            </span>
        )
    }
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 font-body text-xs font-medium ${className}`}>
            <RefreshCw size={12} className="shrink-0" />
            Si rinnova il {dataLunga(fine)}
        </span>
    )
}

function PulsantePiu({ onClick, etichetta }) {
    return (
        <button onClick={onClick} aria-label={etichetta} title={etichetta}
            className="shrink-0 w-9 h-9 flex items-center justify-center border border-oro/40 text-oro hover:bg-oro/10 transition-colors">
            <Plus size={16} />
        </button>
    )
}

/** Il riquadro «Crediti e archivio». */
export function RiquadroConto({ conto, onAggiungiCrediti, onAggiungiArchivio, onAbbonamento, onGestisci }) {
    if (!conto.caricato) {
        return (
            <div className="bg-slate border border-white/5 p-6 flex justify-center">
                <Loader2 size={18} className="animate-spin text-oro/60" />
            </div>
        )
    }
    const { crediti, archivio, piano, prossimo, archivioInPiu, vecchioPiano } = conto
    const parti = [
        crediti.piano > 0 && `${crediti.piano} del piano${crediti.pianoFino ? `, valgono fino al ${dataCorta(crediti.pianoFino)}` : ''}`,
        crediti.topup > 0 && `${crediti.topup} comprati`,
        crediti.benvenuto > 0 && `${crediti.benvenuto} di benvenuto`,
    ].filter(Boolean)
    const pieno = archivio.quota > 0 ? Math.min(100, Math.round((archivio.usati / archivio.quota) * 100)) : 0
    const fonti = [
        archivio.piano > 0 && `${misura(archivio.piano)} dell'abbonamento`,
        archivio.extra > 0 && `${misura(archivio.extra)} in più`,
        archivio.gratuiti > 0 && `${misura(archivio.gratuiti)} gratuiti`,
    ].filter(Boolean)
    const conAbbonamento = !!piano || !!vecchioPiano

    return (
        <div className="bg-slate border border-white/5 p-5">
            <p className="section-label mb-4">Crediti e archivio</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                {/* Crediti */}
                <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="font-body text-xs text-nebbia/50 mb-1">Crediti disponibili</p>
                            <p className="font-display text-4xl font-light text-salvia leading-none">{crediti.totale}</p>
                        </div>
                        <PulsantePiu onClick={onAggiungiCrediti} etichetta="Aggiungi crediti" />
                    </div>
                    <p className="font-body text-xs text-nebbia/45 mt-2 leading-relaxed">
                        {parti.length ? parti.join(' · ') : 'Nessun credito: aggiungine con il +'}
                    </p>
                    <p className="font-body text-[11px] text-nebbia/30 mt-1">I crediti comprati non scadono.</p>
                </div>

                {/* Archivio */}
                <div className="min-w-0 md:border-l md:border-white/5 md:pl-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="font-body text-xs text-nebbia/50 mb-1">Archivio</p>
                            <p className="font-body text-sm text-nebbia">
                                <span className="font-medium">{misura(archivio.usati)}</span>
                                <span className="text-nebbia/40"> di {misura(archivio.quota)}</span>
                            </p>
                        </div>
                        {conAbbonamento && <PulsantePiu onClick={onAggiungiArchivio} etichetta="Aggiungi archivio" />}
                    </div>
                    <div className="h-2 bg-petrolio border border-white/10 mt-3 overflow-hidden" role="progressbar"
                        aria-valuenow={pieno} aria-valuemin={0} aria-valuemax={100} aria-label="Archivio usato">
                        <div className={`h-full ${pieno >= 90 ? 'bg-amber-400' : 'bg-oro'}`} style={{ width: `${pieno}%` }} />
                    </div>
                    <p className="font-body text-xs text-nebbia/45 mt-2">{fonti.join(' + ')}</p>
                    {archivioInPiu.length > 0 && (
                        <p className="font-body text-[11px] text-nebbia/30 mt-1">
                            Archivio in più: {archivioInPiu.map(a => `+${a.prodotto?.spazio_gb} GB`).join(', ')} al mese
                        </p>
                    )}
                </div>

                {/* Abbonamento */}
                <div className="min-w-0 md:border-l md:border-white/5 md:pl-6">
                    <p className="font-body text-xs text-nebbia/50 mb-1">Abbonamento</p>
                    {piano ? (
                        <>
                            <p className="font-body text-sm font-medium text-oro">{piano.prodotto?.nome}</p>
                            <p className="font-body text-xs text-nebbia/50 mt-0.5">{formatPrezzo(piano.prodotto?.prezzo)} al mese</p>
                            <StatoRinnovo abbonamento={piano} className="mt-2" />
                            {prossimo && (
                                <p className="font-body text-xs text-nebbia/45 mt-0.5">
                                    Dal {dataLunga(piano.periodo_fine)}: {prossimo.prodotto?.nome}
                                </p>
                            )}
                            <button onClick={onGestisci} className="btn-secondary text-xs mt-3">Gestisci</button>
                        </>
                    ) : vecchioPiano ? (
                        <>
                            <p className="font-body text-sm font-medium text-oro">{vecchioPiano.nome}</p>
                            <p className="font-body text-xs text-nebbia/45 mt-1">Fino al {dataLunga(vecchioPiano.fino)}, senza rinnovo automatico</p>
                            <button onClick={onAbbonamento} className="btn-secondary text-xs mt-3">Abbonamento</button>
                        </>
                    ) : (
                        <>
                            <p className="font-body text-xs text-nebbia/45">Crediti ogni mese e più archivio, da 19,90 € al mese.</p>
                            <button onClick={onAbbonamento} className="btn-primary text-sm mt-3 w-full md:w-auto justify-center">Abbonamento</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

/** I tre piani personali (Personale, Plus, Pro), con il pulsante giusto per ognuno. */
export function SezionePiani({ piani, conto, acquistando, onAcquista, onCambia, paga, sconto, PrezzoScontato }) {
    const attuale = conto.piano
    const prezzoAttuale = Number(attuale?.prodotto?.prezzo ?? 0)
    return (
        <div id="abbonamenti" className="space-y-3 scroll-mt-24">
            <p className="section-label">Abbonamento</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {piani.map(p => {
                    const suo = attuale?.prodotto?.id === p.id
                    const programmato = conto.prossimo?.prodotto?.id === p.id
                    const piuPiccolo = !!attuale && !suo && Number(p.prezzo) < prezzoAttuale
                    const piuGrande = !!attuale && !suo && Number(p.prezzo) > prezzoAttuale
                    const isLoading = acquistando === p.id
                    return (
                        <div key={p.id} className={`bg-slate p-5 flex flex-col ${suo ? 'border-2 border-oro/60' : 'border border-white/5 hover:border-oro/30'} transition-colors`}>
                            <p className="font-body text-xs text-oro tracking-widest uppercase mb-2">{p.nome}{suo ? ' · il tuo piano' : ''}</p>
                            <p className="font-display text-3xl font-light text-oro">
                                <PrezzoScontato prezzo={p.prezzo} scontato={sconto.prezzo(p.id, p.prezzo)} />
                                <span className="font-body text-sm text-nebbia/40 ml-2">al mese</span>
                            </p>
                            <ul className="mt-3 space-y-1.5 flex-1">
                                {[`${p.crediti_ai_mensili} crediti al mese`, `${p.spazio_gb} GB di archivio`].map(v => (
                                    <li key={v} className="flex items-start gap-2 font-body text-xs text-nebbia/60">
                                        <CheckCircle size={11} className="text-salvia shrink-0 mt-0.5" /> <span>{v}</span>
                                    </li>
                                ))}
                            </ul>
                            {piuGrande && (
                                <p className="font-body text-xs text-salvia mt-3">
                                    +{p.crediti_ai_mensili - (attuale.prodotto?.crediti_ai_mensili ?? 0)} crediti e +{p.spazio_gb - (attuale.prodotto?.spazio_gb ?? 0)} GB ogni mese rispetto al tuo piano
                                </p>
                            )}
                            {suo ? (
                                <StatoRinnovo abbonamento={attuale} className="mt-4 self-start" />
                            ) : programmato ? (
                                <p className="font-body text-xs text-salvia mt-4">Parte il {dataLunga(attuale?.periodo_fine)}</p>
                            ) : piuPiccolo ? (
                                <button onClick={() => onCambia(p)} className="mt-4 self-start font-body text-[11px] text-nebbia/35 hover:text-nebbia/60 transition-colors">
                                    Passa a questo piano dal {dataCorta(attuale.periodo_fine)}
                                </button>
                            ) : (
                                <button onClick={() => onAcquista(p.id)} disabled={isLoading}
                                    className="mt-4 flex items-center justify-center gap-2 py-3 lg:py-2.5 bg-oro text-petrolio font-body text-sm hover:bg-oro/90 transition-colors disabled:opacity-40">
                                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : paga(attuale ? `Passa a ${p.nome}` : 'Attiva')}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
            <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                Si rinnova ogni mese finché non lo disdici. Disdici quando vuoi da «Gestisci»: resta attivo fino alla fine del
                mese pagato. Passando a un piano più grande, il nuovo parte subito.
            </p>
        </div>
    )
}

/** L'archivio in più, ogni mese: solo con un abbonamento attivo. */
export function SezioneArchivioInPiu({ prodotti, conto, acquistando, onAcquista, onGestisciUno, paga, sconto, PrezzoScontato }) {
    if (!conto.piano && !conto.vecchioPiano) return null
    return (
        <div id="archivio-in-piu" className="space-y-3 scroll-mt-24">
            <p className="section-label">Archivio in più · ogni mese</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {prodotti.map(p => {
                    const isLoading = acquistando === p.id
                    return (
                        <div key={p.id} className="bg-slate border border-white/5 hover:border-oro/30 p-5 flex flex-col transition-colors">
                            <p className="font-body text-sm font-medium text-nebbia">+{p.spazio_gb} GB</p>
                            <p className="font-display text-3xl font-light text-oro mt-2 flex-1">
                                <PrezzoScontato prezzo={p.prezzo} scontato={sconto.prezzo(p.id, p.prezzo)} />
                                <span className="font-body text-sm text-nebbia/40 ml-2">al mese</span>
                            </p>
                            <button onClick={() => onAcquista(p.id)} disabled={isLoading}
                                className="mt-4 flex items-center justify-center gap-2 py-3 lg:py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors disabled:opacity-40">
                                {isLoading ? <Loader2 size={14} className="animate-spin" /> : paga('Aggiungi')}
                            </button>
                        </div>
                    )
                })}
            </div>
            {conto.archivioInPiu.length > 0 && (
                <ul className="space-y-2">
                    {conto.archivioInPiu.map(a => (
                        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 bg-slate border border-white/5 px-4 py-3">
                            <span className="flex flex-wrap items-center gap-3">
                                <span className="font-body text-sm text-nebbia">+{a.prodotto?.spazio_gb} GB · {formatPrezzo(a.prodotto?.prezzo)} al mese</span>
                                <StatoRinnovo abbonamento={a} />
                            </span>
                            <button onClick={() => onGestisciUno(a)}
                                className={a.stato === 'disdetto' ? 'font-body text-xs text-oro hover:text-oro/70' : 'font-body text-[11px] text-nebbia/35 hover:text-nebbia/60'}>
                                {a.stato === 'disdetto' ? 'Riattiva' : 'Disdici'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                Per togliere archivio, prima i file devono stare nello spazio che resta: cancellane qualcuno se serve.
            </p>
        </div>
    )
}

/** «Gestisci»: disdetta, riattivazione e cambio di piano. */
export function FinestraGestisci({ conto, aperta, onChiudi, onFatto, onScegliPiano }) {
    const [lavoro, setLavoro] = useState(null)
    const [esito, setEsito] = useState(null)
    if (!aperta) return null
    const voci = [conto.piano, ...conto.archivioInPiu].filter(Boolean)

    async function esegui(azione, a) {
        setLavoro(a.id)
        setEsito(null)
        const r = await gestisciAbbonamento(azione, a.id)
        setLavoro(null)
        setEsito(r.ok ? { ok: true, testo: r.messaggio } : { ok: false, testo: r.error })
        if (r.ok) onFatto()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petrolio/80 backdrop-blur-sm" onClick={onChiudi}>
            <div role="dialog" aria-modal="true" aria-labelledby="gestisci-titolo"
                className="w-full max-w-lg bg-slate border border-oro/30 p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <p id="gestisci-titolo" className="font-display text-2xl font-light text-nebbia">Gestisci l'abbonamento</p>
                    <button onClick={onChiudi} className="text-nebbia/40 hover:text-nebbia" aria-label="Chiudi"><X size={18} /></button>
                </div>
                {voci.map(a => (
                    <div key={a.id} className="border border-white/10 p-4 space-y-2">
                        <p className="font-body text-sm text-nebbia">
                            {a.genere === 'piano' ? a.prodotto?.nome : `Archivio in più +${a.prodotto?.spazio_gb} GB`}
                            <span className="text-nebbia/40"> · {formatPrezzo(a.prodotto?.prezzo)} al mese</span>
                        </p>
                        <StatoRinnovo abbonamento={a} />
                        {a.fornitore === 'apple' ? (
                            <p className="font-body text-xs text-nebbia/50">Preso su iPhone: si gestisce dalle impostazioni dell'iPhone, alla voce Abbonamenti.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {a.stato === 'disdetto' ? (
                                    <button onClick={() => esegui('riattiva', a)} disabled={lavoro === a.id} className="btn-primary text-xs disabled:opacity-40">
                                        {lavoro === a.id ? <Loader2 size={12} className="animate-spin" /> : 'Riattiva'}
                                    </button>
                                ) : a.genere === 'piano' && (
                                    <button onClick={onScegliPiano} className="btn-secondary text-xs">Cambia piano</button>
                                )}
                                {a.stato !== 'disdetto' && (
                                    <button onClick={() => esegui('disdici', a)} disabled={lavoro === a.id}
                                        className="self-center font-body text-[11px] text-nebbia/35 hover:text-nebbia/60 transition-colors disabled:opacity-40">
                                        {lavoro === a.id ? <Loader2 size={12} className="animate-spin" /> : 'Disdici'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {esito && (
                    <p className={`flex items-start gap-2 font-body text-xs ${esito.ok ? 'text-salvia' : 'text-red-400'}`}>
                        {esito.ok ? <CheckCircle size={13} className="shrink-0 mt-0.5" /> : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
                        {esito.testo}
                    </p>
                )}
                <p className="font-body text-[11px] text-nebbia/35 leading-relaxed">
                    Disdire non toglie niente subito: quello che hai pagato resta fino alla fine del mese. Se l'archivio torna più
                    piccolo dei tuoi file, i file restano ma non potrai caricarne di nuovi finché non ne cancelli.
                </p>
            </div>
        </div>
    )
}
