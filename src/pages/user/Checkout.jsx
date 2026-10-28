// src/pages/user/Checkout.jsx

import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AlertCircle, Lock } from 'lucide-react'
import { formatPrezzo } from '@/lib/prezzi'
import { apriCassa } from '@/lib/pagamentoOnline'
import { AvvisoDatiFatturazione, mancantiAcquisto, messaggioDatiMancanti } from '@/lib/datiFatturazione'
import { etichettaDurata } from '@/lib/vociPiano'
import ConsensoRecesso, { useConsensoRecesso, ERRORE_CONSENSO_RECESSO } from '@/components/ConsensoRecesso'

export default function UserCheckout() {
    const { profile } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const prodotto = location.state?.prodotto

    const [loading, setLoading] = useState(false)
    const [errore, setErrore] = useState('')
    const consenso = useConsensoRecesso()

    if (!prodotto) {
        return (
            <div className="text-center py-12 space-y-4">
                <p className="font-body text-sm text-nebbia/50">Nessun prodotto selezionato.</p>
                <Link to="/abbonamenti" className="btn-secondary text-sm inline-flex w-full sm:w-auto justify-center">
                    Torna ai piani
                </Link>
            </div>
        )
    }

    async function handlePagamento() {
        setErrore('')
        if (!consenso.ok) { setErrore(ERRORE_CONSENSO_RECESSO); return }
        const mancanti = mancantiAcquisto(profile)
        if (mancanti.length) { setErrore(messaggioDatiMancanti(mancanti)); return }
        // Cassa Tagadapay; il bonifico resta come riserva (src/lib/pagamentoOnline.js)
        setLoading(true)
        try {
            await apriCassa({ prodottoId: prodotto.id, consenso: consenso.campo, ritorno: '/area/acquista?success=1' })
        } catch (err) {
            setErrore(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="space-y-5 max-w-lg mx-auto">
            <div>
                <p className="section-label mb-2">Checkout</p>
                <h1 className="font-display text-4xl font-light text-nebbia">Riepilogo ordine</h1>
            </div>

            {/* Intestatario */}
            <div className="bg-slate border border-white/5 p-5 space-y-3">
                <p className="section-label">Intestatario</p>
                <p className="font-body text-xs text-nebbia/30 leading-relaxed">
                    I dati vengono usati esattamente come registrati. Non sono modificabili in questa fase.
                </p>
                {[
                    ['Nome', `${profile?.nome ?? ''} ${profile?.cognome ?? ''}`.trim() || '—'],
                    ['Email', profile?.email ?? '—'],
                ].map(([l, v]) => (
                    <div key={l} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-3 py-2 border-b border-white/5">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className="font-body text-sm text-nebbia break-words sm:text-right">{v}</span>
                    </div>
                ))}
                <p className="font-body text-xs text-nebbia/25 pt-1">
                    Dati errati?{' '}
                    <Link to="/user/profilo" className="text-oro hover:text-oro/70 transition-colors">
                        Aggiorna il profilo
                    </Link>
                </p>
            </div>

            {/* Prodotto */}
            <div className="bg-slate border border-oro/20 p-5 space-y-2">
                <p className="section-label">Piano selezionato</p>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div>
                        <p className="font-display text-xl font-semibold text-nebbia">{prodotto.nome}</p>
                        <p className="font-body text-xs text-nebbia/40 mt-1">{etichettaDurata(prodotto)}</p>
                    </div>
                    <p className="font-display text-3xl sm:text-4xl font-light text-oro shrink-0">{formatPrezzo(prodotto.prezzo)}</p>
                </div>
                <button
                    onClick={() => navigate('/abbonamenti')}
                    className="font-body text-xs text-nebbia/30 hover:text-oro transition-colors py-2 lg:py-0 lg:pt-1 text-left"
                >
                    Cambia piano
                </button>
            </div>

            {/* Totale */}
            <div className="flex justify-between items-center px-1 py-2 border-t border-white/5">
                <span className="font-body text-sm text-nebbia/50">Totale da pagare</span>
                <span className="font-display text-3xl font-semibold text-oro">{formatPrezzo(prodotto.prezzo)}</span>
            </div>

            {/* Info */}
            <div className="bg-petrolio/50 border border-white/5 p-4">
                <p className="font-body text-xs text-nebbia/30 leading-relaxed">
                    Pagamento unico — nessun rinnovo automatico. Riceverai una ricevuta via email.
                    Sarai reindirizzato alla pagina di pagamento sicura.
                </p>
            </div>

            <AvvisoDatiFatturazione profile={profile} />
            <ConsensoRecesso consenso={consenso} className="px-1" />

            {/* Errore */}
            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {/* CTA */}
            <button
                onClick={handlePagamento}
                disabled={loading || !consenso.ok}
                className="btn-primary w-full justify-center text-sm disabled:opacity-60"
            >
                {loading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" />
                ) : (
                    <>
                        <Lock size={14} />
                        Procedi al pagamento
                    </>
                )}
            </button>

            <p className="font-body text-xs text-nebbia/20 text-center flex items-center justify-center gap-1">
                <Lock size={10} /> Pagamento con carta — connessione cifrata
            </p>
        </div>
    )
}