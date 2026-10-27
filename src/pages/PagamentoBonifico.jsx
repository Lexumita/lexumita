// src/pages/PagamentoBonifico.jsx
//
// Pagamento con bonifico (27-10-2026), al posto della cassa Stripe finché non c'è il nuovo processore:
// vedi src/lib/bonifico.js. Mostra prodotto, importo, coordinate e causale con il pulsante «Copia»;
// chi paga manda la ricevuta a info@lexum.it e l'acquisto si attiva a mano.

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatPrezzo } from '@/lib/prezzi'
import { DATI_BONIFICO } from '@/lib/bonifico'
import { ArrowLeft, Check, Copy, Landmark, Loader2, Mail } from 'lucide-react'

function RigaCopiabile({ etichetta, valore, copiabile = true }) {
    const [copiato, setCopiato] = useState(false)
    async function copia() {
        try {
            await navigator.clipboard.writeText(valore)
            setCopiato(true)
            setTimeout(() => setCopiato(false), 1500)
        } catch { /* niente appunti: il testo resta selezionabile */ }
    }
    return (
        <div className="flex items-start justify-between gap-3 py-3 border-b border-white/5 last:border-b-0">
            <div className="min-w-0">
                <p className="font-body text-[11px] uppercase tracking-wider text-nebbia/40 mb-0.5">{etichetta}</p>
                <p className="font-body text-sm text-nebbia break-words select-all">{valore}</p>
            </div>
            {copiabile && (
                <button
                    onClick={copia}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 font-body text-xs text-oro/80 hover:text-oro border border-oro/20 hover:border-oro/40 transition-colors"
                    title={`Copia ${etichetta.toLowerCase()}`}
                >
                    {copiato ? <Check size={12} /> : <Copy size={12} />}
                    {copiato ? 'Copiato' : 'Copia'}
                </button>
            )}
        </div>
    )
}

export default function PagamentoBonifico() {
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const prodottoId = params.get('prodotto')
    const importoUpgrade = params.get('importo')
    const [prodotto, setProdotto] = useState(null)
    const [caricamento, setCaricamento] = useState(true)

    useEffect(() => {
        let chiuso = false
        async function carica() {
            if (!prodottoId) { setCaricamento(false); return }
            const { data } = await supabase
                .from('prodotti')
                .select('id, nome, tipo, prezzo, crediti_ai_mensili')
                .eq('id', prodottoId)
                .eq('attivo', true)
                .maybeSingle()
            if (!chiuso) { setProdotto(data ?? null); setCaricamento(false) }
        }
        carica()
        return () => { chiuso = true }
    }, [prodottoId])

    const importo = importoUpgrade != null && Number.isFinite(Number(importoUpgrade))
        ? Number(importoUpgrade)
        : Number(prodotto?.prezzo ?? 0)
    const causale = prodotto ? `Lexum - ${prodotto.nome} - ${user?.email ?? ''}` : ''
    const cosaSiAttiva = prodotto?.tipo === 'crediti_ai' ? 'i crediti' : "l'acquisto"
    const indietro = profile?.role === 'user' ? '/area/acquista' : '/studio?tab=acquista'

    return (
        <div className="min-h-screen bg-petrolio px-4 py-10">
            <div className="max-w-xl mx-auto space-y-6">
                <button
                    onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(indietro))}
                    className="flex items-center gap-1.5 font-body text-xs text-nebbia/50 hover:text-nebbia transition-colors"
                >
                    <ArrowLeft size={13} /> Torna indietro
                </button>

                <div>
                    <p className="section-label mb-2">Pagamento</p>
                    <h1 className="font-display text-3xl font-light text-nebbia">Paga con bonifico</h1>
                    <p className="font-body text-sm text-nebbia/50 mt-2 leading-relaxed">
                        Il pagamento online è momentaneamente sospeso per un problema tecnico. Puoi acquistare con
                        un bonifico: appena riceviamo la ricevuta attiviamo {cosaSiAttiva} sul tuo account.
                    </p>
                </div>

                {caricamento ? (
                    <div className="flex justify-center py-10">
                        <Loader2 size={20} className="animate-spin text-oro" />
                    </div>
                ) : !prodotto ? (
                    <div className="p-4 border border-white/10 bg-slate">
                        <p className="font-body text-sm text-nebbia/70">
                            Prodotto non trovato. Scegli di nuovo cosa acquistare dalla{' '}
                            <Link to={indietro} className="text-oro hover:text-oro/70 underline">pagina degli acquisti</Link>.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="p-5 border border-oro/30 bg-oro/5 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="font-body text-xs text-nebbia/40 mb-1">Stai acquistando</p>
                                <p className="font-body text-sm font-medium text-nebbia">{prodotto.nome}</p>
                            </div>
                            <p className="font-display text-3xl font-light text-oro shrink-0">{formatPrezzo(importo)}</p>
                        </div>

                        <div className="p-5 border border-white/8 bg-slate">
                            <div className="flex items-center gap-2 mb-2">
                                <Landmark size={14} className="text-oro" />
                                <p className="font-body text-sm font-medium text-nebbia">1. Fai il bonifico</p>
                            </div>
                            <RigaCopiabile etichetta="Beneficiario" valore={DATI_BONIFICO.beneficiario} />
                            <RigaCopiabile etichetta="IBAN" valore={DATI_BONIFICO.iban} />
                            <RigaCopiabile etichetta="BIC / SWIFT" valore={DATI_BONIFICO.bic} />
                            <RigaCopiabile etichetta="Importo" valore={`${formatPrezzo(importo)} (${DATI_BONIFICO.valuta})`} copiabile={false} />
                            <RigaCopiabile etichetta="Causale" valore={causale} />
                            <RigaCopiabile etichetta="Indirizzo del beneficiario" valore={DATI_BONIFICO.indirizzo} copiabile={false} />
                            <RigaCopiabile etichetta="Banca" valore={DATI_BONIFICO.banca} copiabile={false} />
                        </div>

                        <div className="p-5 border border-white/8 bg-slate">
                            <div className="flex items-center gap-2 mb-2">
                                <Mail size={14} className="text-oro" />
                                <p className="font-body text-sm font-medium text-nebbia">2. Mandaci la ricevuta</p>
                            </div>
                            <p className="font-body text-sm text-nebbia/60 leading-relaxed">
                                Invia la ricevuta del bonifico a{' '}
                                <a
                                    href={`mailto:${DATI_BONIFICO.emailRicevuta}?subject=${encodeURIComponent(`Ricevuta bonifico - ${prodotto.nome}`)}`}
                                    className="text-oro hover:text-oro/70 underline"
                                >
                                    {DATI_BONIFICO.emailRicevuta}
                                </a>
                                {' '}dall'indirizzo del tuo account: appena la riceviamo attiviamo subito {cosaSiAttiva}.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
