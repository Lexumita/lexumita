// src/pages/user/Checkout.jsx

import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AlertCircle, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function UserCheckout() {
    const { profile } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const prodotto = location.state?.prodotto

    const [loading, setLoading] = useState(false)
    const [errore, setErrore] = useState('')

    if (!prodotto) {
        return (
            <div className="text-center py-12 space-y-4">
                <p className="font-body text-sm text-nebbia/50">Nessun prodotto selezionato.</p>
                <Link to="/abbonamenti" className="btn-secondary text-sm inline-flex">
                    Torna ai piani
                </Link>
            </div>
        )
    }

    async function handlePagamento() {
        setErrore('')
        setLoading(true)

        try {
            const { data: { session } } = await supabase.auth.getSession()

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        prodotto_id: prodotto.id,
                        success_url: `${window.location.origin}/abbonamenti?success=1`,
                        cancel_url: `${window.location.origin}/abbonamenti/checkout`,
                    }),
                }
            )

            const json = await res.json()
            if (!json.ok) throw new Error(json.error)

            // Redirect a Stripe Checkout
            window.location.href = json.url

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
                    <div key={l} className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className="font-body text-sm text-nebbia">{v}</span>
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
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="font-display text-xl font-semibold text-nebbia">{prodotto.nome}</p>
                        <p className="font-body text-xs text-nebbia/40 mt-1">
                            {prodotto.durata_mesi ? `${prodotto.durata_mesi} mesi` : '—'}
                        </p>
                        <div className="flex gap-2 mt-2">
                            <span className={`font-body text-[10px] px-2 py-0.5 border ${prodotto.include_banca_dati ? 'border-oro/30 text-oro' : 'border-white/10 text-nebbia/30'}`}>
                                {prodotto.include_banca_dati ? 'Pro' : 'Base'}
                            </span>
                            {prodotto.include_monetizzazione && (
                                <span className="font-body text-[10px] px-2 py-0.5 border border-salvia/30 text-salvia">
                                    Monetizzazione
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="font-display text-4xl font-light text-oro shrink-0">EUR {prodotto.prezzo}</p>
                </div>
                <button
                    onClick={() => navigate('/abbonamenti')}
                    className="font-body text-xs text-nebbia/30 hover:text-oro transition-colors pt-1"
                >
                    Cambia piano
                </button>
            </div>

            {/* Totale */}
            <div className="flex justify-between items-center px-1 py-2 border-t border-white/5">
                <span className="font-body text-sm text-nebbia/50">Totale da pagare</span>
                <span className="font-display text-3xl font-semibold text-oro">EUR {prodotto.prezzo}</span>
            </div>

            {/* Info */}
            <div className="bg-petrolio/50 border border-white/5 p-4">
                <p className="font-body text-xs text-nebbia/30 leading-relaxed">
                    Pagamento unico — nessun rinnovo automatico. Riceverai una ricevuta via email.
                    Sarai reindirizzato a Stripe per completare il pagamento in modo sicuro.
                </p>
            </div>

            {/* Errore */}
            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={14} /> {errore}
                </div>
            )}

            {/* CTA */}
            <button
                onClick={handlePagamento}
                disabled={loading}
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
                <Lock size={10} /> Pagamento gestito da Stripe — Connessione cifrata SSL
            </p>
        </div>
    )
}