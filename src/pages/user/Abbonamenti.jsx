// src/pages/user/Abbonamenti.jsx

import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { CheckCircle, ArrowRight, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// USER ABBONAMENTI — carica piani da DB
// ─────────────────────────────────────────────────────────────
export default function UserAbbonamenti() {
    const navigate = useNavigate()
    const location = useLocation()
    const [prodotti, setProdotti] = useState([])
    const [loading, setLoading] = useState(true)

    // Mostra banner successo se redirect da Stripe
    const isSuccess = new URLSearchParams(location.search).get('success') === '1'

    useEffect(() => {
        async function carica() {
            setLoading(true)
            const { data } = await supabase
                .from('prodotti')
                .select('*')
                .eq('attivo', true)
                .eq('tipo', 'abbonamento')
                .order('prezzo')
            setProdotti(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-40">
                <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Banner successo */}
            {isSuccess && (
                <div className="flex items-center gap-3 p-4 bg-salvia/10 border border-salvia/25">
                    <CheckCircle size={18} className="text-salvia shrink-0" />
                    <div>
                        <p className="font-body text-sm font-medium text-salvia">Pagamento completato!</p>
                        <p className="font-body text-xs text-nebbia/50 mt-0.5">Il tuo piano è ora attivo. Accedi alla dashboard per iniziare.</p>
                    </div>
                    <Link to="/dashboard" className="btn-primary text-xs ml-auto shrink-0">Vai alla dashboard</Link>
                </div>
            )}

            <div>
                <p className="section-label mb-2">Abbonamenti</p>
                <h1 className="font-display text-4xl font-light text-nebbia mb-2">Scegli il tuo piano</h1>
                <p className="font-body text-sm text-nebbia/40">Pagamento unico, nessun rinnovo automatico.</p>
            </div>

            {prodotti.length === 0 ? (
                <div className="bg-slate border border-white/5 p-10 text-center">
                    <p className="font-body text-sm text-nebbia/40">Nessun piano disponibile al momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {prodotti.map(p => {
                        const isHighlight = p.include_banca_dati && p.include_monetizzazione
                        return (
                            <div key={p.id} className={`bg-slate border p-6 flex flex-col ${isHighlight ? 'border-oro/40' : 'border-white/5'}`}>
                                {isHighlight && (
                                    <p className="font-body text-xs text-oro tracking-widest uppercase mb-3">Consigliato</p>
                                )}
                                <h2 className="font-display text-2xl font-semibold text-nebbia mb-1">{p.nome}</h2>
                                <p className="font-body text-xs text-nebbia/40 mb-1">
                                    {p.durata_mesi ? `${p.durata_mesi} mesi` : '—'}
                                </p>
                                <div className="flex gap-2 mb-4">
                                    <span className={`font-body text-[10px] px-2 py-0.5 border ${p.include_banca_dati ? 'border-oro/30 text-oro' : 'border-white/10 text-nebbia/30'}`}>
                                        {p.include_banca_dati ? 'Pro' : 'Base'}
                                    </span>
                                    {p.include_monetizzazione && (
                                        <span className="font-body text-[10px] px-2 py-0.5 border border-salvia/30 text-salvia">
                                            Monetizzazione
                                        </span>
                                    )}
                                    {p.tipo === 'studio' && p.posti && (
                                        <span className="font-body text-[10px] px-2 py-0.5 border border-white/10 text-nebbia/40">
                                            {p.posti} posti
                                        </span>
                                    )}
                                </div>
                                <p className="font-display text-5xl font-light text-oro mb-6">EUR {p.prezzo}</p>

                                {/* Features in base al tipo */}
                                <ul className="space-y-2 mb-6 flex-1">
                                    {[
                                        'Gestione clienti illimitati',
                                        'Pratiche e documenti',
                                        'Pagamenti e fatture',
                                        'Calendario appuntamenti',
                                        ...(p.include_banca_dati ? ['Accesso banca dati sentenze'] : []),
                                        ...(p.include_monetizzazione ? ['Carica sentenze e monetizza'] : []),
                                        ...(p.tipo === 'studio' ? [`Fino a ${p.posti ?? '∞'} avvocati nello studio`] : []),
                                    ].map(feat => (
                                        <li key={feat} className="flex items-center gap-2 font-body text-sm text-nebbia/60">
                                            <CheckCircle size={14} className="text-salvia shrink-0" />
                                            {feat}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => navigate('/abbonamenti/checkout', { state: { prodotto: p } })}
                                    className={`w-full justify-center text-sm ${isHighlight ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    Acquista <ArrowRight size={14} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="text-center">
                <p className="font-body text-xs text-nebbia/30">
                    Vuoi solo consultare un documento?{' '}
                    <Link to="/banca-dati" className="text-oro hover:text-oro/70 transition-colors">
                        Accedi alla banca dati singolarmente
                    </Link>
                </p>
            </div>
        </div>
    )
}