// src/components/fisco/DocumentoFiscale.jsx
//
// Scheda di un documento fiscale: che cos'è, di chi è, quando scade.
// Al massimo tre gesti: controlla il tipo, scegli il cliente (se Lexum non
// l'ha già trovato dal codice fiscale), indica la notifica → Conferma.
// Le scadenze arrivano calcolate dal DB (v_documenti_fiscali) con la regola
// scritta in chiaro; qui si mostrano e basta.

import { useEffect, useState } from 'react'
import {
    FileText, ChevronDown, Loader2, AlertTriangle, Calendar, Trash2, Eye,
    RefreshCw, Info, Check, Archive, User, CheckCircle
} from 'lucide-react'
import { Badge } from '@/components/shared'
import { supabase } from '@/lib/supabase'
import {
    STATI_DOC, AZIONI, nomeClienteDoc, nomeDaProfilo, fmtData, fmtEuro, oggiISO,
    giorniMancanti, testoGiorni, coloreGiorni, aggiornaDocumento, assegnaCliente,
    confermaDocumento, analizzaDocumento, eliminaDocumentoFiscale, apriDocumento, segnaScadenza,
} from '@/lib/fisco'

const CAMPO = 'w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 transition-colors disabled:opacity-60'
const ETICHETTA = 'block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-1.5'
const BOTTONE = 'flex items-center justify-center gap-2 min-h-[44px] px-3 py-2 border border-white/10 text-nebbia/60 font-body text-sm hover:text-oro hover:border-oro/30 transition-colors disabled:opacity-40 disabled:pointer-events-none'
const LINK = 'font-body text-xs text-nebbia/40 hover:text-oro transition-colors flex items-center gap-1 min-h-[32px]'

export default function DocumentoFiscale({ doc, tipi, clienti, meId, apertoIniziale = false, onCambiato, onEliminato }) {
    const [aperto, setAperto] = useState(apertoIniziale)
    const [lavoro, setLavoro] = useState(null)
    const [errore, setErrore] = useState('')
    const [esito, setEsito] = useState('')
    const [agenda, setAgenda] = useState([])
    const [regolaAperta, setRegolaAperta] = useState(null)
    const [dataDiversa, setDataDiversa] = useState(false)

    const mio = doc.professionista_id === meId
    const modificabile = mio && doc.stato !== 'archiviato' && doc.stato !== 'in_analisi' && !lavoro
    const tipo = tipi.find(t => t.codice === doc.tipo_codice)
    const haScadenze = Boolean(tipo?.azione) || Boolean(doc.scadenza_manuale)
    const scadenze = doc.scadenza_manuale
        ? [{ azione: 'scadenza', data: doc.scadenza_manuale, regola: 'Data inserita a mano.' }]
        : (doc.scadenze ?? [])
    const giorni = giorniMancanti(doc.scadenza_prossima)
    const nome = nomeClienteDoc(doc)
    const candidati = doc.dati?.candidati ?? []
    const avvisi = doc.dati?.avvisi ?? []
    const stato = STATI_DOC[doc.stato] ?? STATI_DOC.da_verificare
    const inLettura = doc.stato === 'in_analisi' || lavoro === 'lettura'

    const mancante = !doc.tipo_codice ? 'Indica di che documento si tratta.'
        : haScadenze && !doc.cliente_id ? 'Scegli il cliente: la scadenza va nella sua agenda.'
        : haScadenze && !doc.data_notifica && !doc.scadenza_manuale ? 'Indica la data di notifica: da lì partono i termini.'
        : null

    // Le righe in agenda (con la spunta "fatto") esistono solo dopo la conferma
    useEffect(() => {
        if (!aperto || (!doc.scadenza_id && doc.stato !== 'confermato')) {
            setAgenda([])
            return
        }
        supabase
            .from('scadenze_mandato')
            .select('id, titolo, data_scadenza, stato')
            .eq('documento_fiscale_id', doc.id)
            .order('data_scadenza')
            .then(({ data }) => setAgenda(data ?? []))
    }, [aperto, doc.id, doc.scadenza_id, doc.stato, doc.updated_at])

    async function esegui(azione, fn) {
        setLavoro(azione)
        setErrore('')
        setEsito('')
        try {
            await fn()
            await onCambiato?.(doc.id)
        } catch (e) {
            setErrore(e.message || 'Operazione non riuscita: riprova.')
        } finally {
            setLavoro(null)
        }
    }

    const salva = campi => esegui('salva', () => aggiornaDocumento(doc.id, campi))
    const assegna = clienteId => clienteId && esegui('cliente', () => assegnaCliente(doc.id, clienteId))
    const archivia = () => esegui('archivia', () => aggiornaDocumento(doc.id, { stato: 'archiviato' }))
    const spunta = s => esegui('agenda', () => segnaScadenza(s.id, s.stato !== 'completata'))

    const conferma = () => esegui('conferma', async () => {
        const r = await confermaDocumento(doc.id)
        const n = r?.scadenze_in_agenda ?? 0
        setEsito(n === 0 ? 'Documento confermato.'
            : n === 1 ? 'Fatto: la scadenza è in agenda, con i promemoria.'
                : `Fatto: ${n} scadenze sono in agenda, con i promemoria.`)
    })

    const rileggi = () => esegui('lettura', async () => {
        const r = await analizzaDocumento(doc.id)
        if (r?.ok === false && r.error) throw new Error(r.error)
    })

    async function elimina() {
        if (!confirm('Eliminare il documento? Verrà tolto anche dall\'archivio e dall\'agenda.')) return
        setLavoro('elimina')
        try {
            await eliminaDocumentoFiscale(doc)
            onEliminato?.(doc.id)
        } catch (e) {
            setErrore(e.message)
            setLavoro(null)
        }
    }

    return (
        <div id={`fisco-${doc.id}`} className={`bg-slate border ${doc.stato === 'da_verificare' || doc.stato === 'errore' ? 'border-amber-500/20' : 'border-white/5'}`}>
            {/* Testata: basta questa per capire che cosa c'è da fare */}
            <button
                type="button"
                onClick={() => setAperto(a => !a)}
                className="w-full text-left p-4 flex items-start gap-3"
            >
                <FileText size={18} className="text-oro/70 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-body text-sm font-medium text-nebbia break-words">
                            {doc.stato === 'in_analisi' ? 'Sto leggendo il documento…' : (doc.tipo_label ?? 'Documento fiscale')}
                            {doc.numero_atto && <span className="text-nebbia/40 font-normal"> · n. {doc.numero_atto}</span>}
                        </p>
                        {doc.stato !== 'in_analisi' && <Badge label={stato.label} variant={stato.variant} />}
                    </div>
                    {doc.stato !== 'in_analisi' && (
                        <p className="font-body text-xs mt-1">
                            <span className={nome ? 'text-nebbia/60' : 'text-amber-400'}>{nome || 'Cliente da assegnare'}</span>
                            {doc.importo != null && <span className="text-nebbia/40"> · {fmtEuro(doc.importo)}</span>}
                            {doc.anno_imposta && <span className="text-nebbia/40"> · anno {doc.anno_imposta}</span>}
                        </p>
                    )}
                    {doc.scadenza_prossima && doc.stato !== 'archiviato' && (
                        <p className={`font-body text-xs mt-1 flex items-center gap-1.5 ${coloreGiorni(giorni)}`}>
                            <Calendar size={12} /> {fmtData(doc.scadenza_prossima)} · {testoGiorni(giorni)}
                        </p>
                    )}
                </div>
                {inLettura
                    ? <Loader2 size={16} className="animate-spin text-oro shrink-0 mt-0.5" />
                    : <ChevronDown size={16} className={`text-nebbia/30 shrink-0 mt-0.5 transition-transform ${aperto ? 'rotate-180' : ''}`} />}
            </button>

            {aperto && doc.stato !== 'in_analisi' && (
                <div className="px-4 pb-4 pt-4 space-y-4 border-t border-white/5">
                    {doc.stato === 'errore' && doc.errore && (
                        <Avviso rosso testo={doc.errore} />
                    )}
                    {doc.riepilogo && (
                        <p className="font-body text-sm text-nebbia/70 leading-relaxed">{doc.riepilogo}</p>
                    )}
                    {avvisi.map((a, i) => <Avviso key={i} testo={a} />)}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 1. Che documento è */}
                        <div>
                            <label className={ETICHETTA}>Che documento è</label>
                            <select
                                className={CAMPO}
                                value={doc.tipo_codice ?? ''}
                                disabled={!modificabile}
                                onChange={e => salva({ tipo_codice: e.target.value || null })}
                            >
                                <option value="">Scegli…</option>
                                {tipi.map(t => <option key={t.codice} value={t.codice}>{t.label}</option>)}
                            </select>
                            {doc.stato === 'da_verificare' && doc.confidenza != null && doc.confidenza < 0.7 && (
                                <p className="font-body text-xs text-amber-400 mt-1.5">Non ne sono sicuro: controlla il tipo.</p>
                            )}
                        </div>

                        {/* 2. Di quale cliente */}
                        <div>
                            <label className={ETICHETTA}>Di quale cliente</label>
                            {doc.cliente_id ? (
                                <div className="flex items-center justify-between gap-2 bg-petrolio border border-white/10 px-3 py-2">
                                    <span className="font-body text-sm text-nebbia flex items-center gap-2 min-w-0">
                                        <User size={14} className="text-salvia shrink-0" />
                                        <span className="truncate">{nome || 'Cliente'}</span>
                                    </span>
                                    {modificabile && (
                                        <button type="button" onClick={() => salva({ cliente_id: null })} className={LINK}>
                                            Cambia
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <select
                                        className={CAMPO}
                                        value=""
                                        disabled={!modificabile}
                                        onChange={e => assegna(e.target.value)}
                                    >
                                        <option value="">Scegli il cliente…</option>
                                        {candidati.length > 0 && (
                                            <optgroup label="Trovati dal codice fiscale">
                                                {candidati.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                            </optgroup>
                                        )}
                                        <optgroup label="Tutti i clienti">
                                            {clienti.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {nomeDaProfilo(c) || 'Cliente'}{c.cf ? ` — ${c.cf}` : ''}
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    {doc.codice_fiscale && (
                                        <p className="font-body text-xs text-nebbia/40 mt-1.5 leading-snug">
                                            Nel documento: {doc.denominazione ? `${doc.denominazione}, ` : ''}CF {doc.codice_fiscale}.
                                            Se il cliente non ha ancora il codice fiscale lo salvo io: la prossima volta lo riconosco da solo.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        {/* 3. Quando è stato notificato */}
                        {tipo?.azione && (
                            <div>
                                <label className={ETICHETTA}>Notificato il</label>
                                <input
                                    type="date"
                                    className={CAMPO}
                                    value={doc.data_notifica ?? ''}
                                    max={oggiISO(1)}
                                    disabled={!modificabile}
                                    onChange={e => salva({ data_notifica: e.target.value || null })}
                                />
                                {modificabile && (
                                    <div className="flex gap-2 mt-2">
                                        <button type="button" onClick={() => salva({ data_notifica: oggiISO() })} className={`${BOTTONE} flex-1`}>Oggi</button>
                                        <button type="button" onClick={() => salva({ data_notifica: oggiISO(-1) })} className={`${BOTTONE} flex-1`}>Ieri</button>
                                    </div>
                                )}
                                {!doc.data_notifica && (
                                    <p className="font-body text-xs text-nebbia/40 mt-1.5">Se è arrivato via PEC, è la data di consegna.</p>
                                )}
                            </div>
                        )}

                        {/* 4. Situazioni che spostano i termini */}
                        {(doc.tipo_codice === 'avviso_bonario' || tipo?.ammette_adesione) && (
                            <div>
                                <label className={ETICHETTA}>Situazione</label>
                                {doc.tipo_codice === 'avviso_bonario' && (
                                    <Interruttore
                                        label="Ricevuto tramite l'intermediario (90 giorni invece di 60)"
                                        checked={doc.via_intermediario}
                                        disabled={!modificabile}
                                        onChange={v => salva({ via_intermediario: v })}
                                    />
                                )}
                                {tipo?.ammette_adesione && (
                                    <Interruttore
                                        label="Istanza di accertamento con adesione presentata (+90 giorni per il ricorso)"
                                        checked={doc.adesione}
                                        disabled={!modificabile}
                                        onChange={v => salva({ adesione: v })}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* 5. Scadenze, con la regola scritta in chiaro */}
                    {haScadenze && (
                        <div className="bg-petrolio/60 border border-white/5 p-3 space-y-2">
                            <p className={ETICHETTA}>Scadenze</p>
                            {scadenze.length === 0 ? (
                                <p className="font-body text-sm text-nebbia/40">Indica la data di notifica e le calcolo io.</p>
                            ) : scadenze.map((s, i) => {
                                const g = giorniMancanti(s.data)
                                return (
                                    <div key={`${s.azione}-${s.data}`}>
                                        <div className="flex flex-wrap items-center gap-x-3">
                                            <span className="font-body text-sm text-nebbia">
                                                {AZIONI[s.azione] ?? s.azione} entro il <strong className="font-medium">{fmtData(s.data)}</strong>
                                            </span>
                                            <span className={`font-body text-xs ${coloreGiorni(g)}`}>{testoGiorni(g)}</span>
                                            <button type="button" onClick={() => setRegolaAperta(regolaAperta === i ? null : i)} className={LINK}>
                                                <Info size={12} /> Come è calcolata
                                            </button>
                                        </div>
                                        {regolaAperta === i && (
                                            <p className="font-body text-xs text-nebbia/50 leading-relaxed">{s.regola}</p>
                                        )}
                                    </div>
                                )
                            })}
                            <p className="font-body text-xs text-nebbia/30">
                                Scadenze suggerite dalla data di notifica indicata: verificale sempre.
                            </p>
                            {modificabile && (dataDiversa || doc.scadenza_manuale ? (
                                <div className="flex flex-wrap items-center gap-3">
                                    <input
                                        type="date"
                                        className={`${CAMPO} sm:w-auto`}
                                        value={doc.scadenza_manuale ?? ''}
                                        onChange={e => salva({ scadenza_manuale: e.target.value || null })}
                                    />
                                    {doc.scadenza_manuale && (
                                        <button
                                            type="button"
                                            onClick={() => { setDataDiversa(false); salva({ scadenza_manuale: null }) }}
                                            className={LINK}
                                        >
                                            Torna al calcolo automatico
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button type="button" onClick={() => setDataDiversa(true)} className={LINK}>
                                    Imposta una data diversa
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 6. In agenda: si spunta quando è fatto */}
                    {agenda.length > 0 && (
                        <div>
                            <p className={ETICHETTA}>In agenda</p>
                            {agenda.map(s => (
                                <label key={s.id} className="flex items-center gap-3 min-h-[40px] cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-[#7FA39A]"
                                        checked={s.stato === 'completata'}
                                        disabled={!mio || Boolean(lavoro)}
                                        onChange={() => spunta(s)}
                                    />
                                    <span className={`font-body text-sm ${s.stato === 'completata' ? 'text-nebbia/30 line-through' : 'text-nebbia/80'}`}>
                                        {s.titolo.split(' — ')[0]} · {fmtData(s.data_scadenza)}
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}

                    <DatiLetti doc={doc} />

                    {errore && <Avviso rosso testo={errore} />}
                    {esito && (
                        <p className="flex items-center gap-2 font-body text-sm text-salvia">
                            <CheckCircle size={15} /> {esito}
                        </p>
                    )}

                    {/* Azioni */}
                    {mio && (
                        <div className="space-y-2 pt-1">
                            {doc.stato !== 'confermato' && doc.stato !== 'archiviato' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={conferma}
                                        disabled={Boolean(mancante) || Boolean(lavoro)}
                                        className="btn-primary text-sm justify-center w-full lg:w-auto disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {lavoro === 'conferma' ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                        {haScadenze ? 'Conferma e metti in agenda' : 'Conferma'}
                                    </button>
                                    {mancante && <p className="font-body text-xs text-amber-400">{mancante}</p>}
                                </>
                            )}
                            <div className="grid grid-cols-2 lg:flex gap-2">
                                <button type="button" onClick={() => apriDocumento(doc.archivio_documento_id)} disabled={!doc.archivio_documento_id} className={BOTTONE}>
                                    <Eye size={15} /> Apri
                                </button>
                                {(doc.stato === 'errore' || doc.stato === 'da_verificare') && (
                                    <button type="button" onClick={rileggi} disabled={Boolean(lavoro)} className={BOTTONE}>
                                        {lavoro === 'lettura' ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Rileggi
                                    </button>
                                )}
                                {doc.stato === 'confermato' && (
                                    <button type="button" onClick={archivia} disabled={Boolean(lavoro)} className={BOTTONE}>
                                        <Archive size={15} /> Archivia
                                    </button>
                                )}
                                <button type="button" onClick={elimina} disabled={Boolean(lavoro)} className={`${BOTTONE} hover:!text-red-400 hover:!border-red-500/30`}>
                                    <Trash2 size={15} /> Elimina
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function Avviso({ testo, rosso = false }) {
    return (
        <div className={`flex items-start gap-2 p-3 border font-body text-sm ${rosso
            ? 'bg-red-900/10 border-red-500/20 text-red-400'
            : 'bg-amber-900/10 border-amber-500/20 text-amber-400'}`}
        >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{testo}</span>
        </div>
    )
}

function Interruttore({ label, checked, disabled, onChange }) {
    return (
        <label className="flex items-start gap-3 cursor-pointer min-h-[40px] py-1">
            <input
                type="checkbox"
                className="w-4 h-4 mt-0.5 accent-[#C9A45C] shrink-0"
                checked={Boolean(checked)}
                disabled={disabled}
                onChange={e => onChange(e.target.checked)}
            />
            <span className="font-body text-sm text-nebbia/70 leading-snug">{label}</span>
        </label>
    )
}

function DatiLetti({ doc }) {
    const [aperto, setAperto] = useState(false)
    const righe = [
        ['Intestato a', doc.denominazione],
        ['Codice fiscale', doc.codice_fiscale],
        ['Partita IVA', doc.partita_iva],
        ['Emesso da', doc.ente_emittente],
        ['Numero', doc.numero_atto],
        ['Anno d\'imposta', doc.anno_imposta],
        ['Data del documento', doc.data_atto ? fmtData(doc.data_atto) : null],
        ['Importo', doc.importo != null ? fmtEuro(doc.importo) : null],
    ].filter(([, v]) => v)
    if (righe.length === 0) return null

    return (
        <div>
            <button type="button" onClick={() => setAperto(a => !a)} className={LINK}>
                <ChevronDown size={12} className={`transition-transform ${aperto ? 'rotate-180' : ''}`} />
                Dati letti dal documento
            </button>
            {aperto && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2">
                    {righe.map(([k, v]) => (
                        <div key={k} className="min-w-0">
                            <dt className="font-body text-xs text-nebbia/30 uppercase tracking-wider">{k}</dt>
                            <dd className="font-body text-sm text-nebbia/80 break-words">{v}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    )
}
