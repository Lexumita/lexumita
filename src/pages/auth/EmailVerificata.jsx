import { Link } from 'react-router-dom'
import { CheckCircle, ArrowRight } from 'lucide-react'
import logo from '@/assets/logo.png'

export default function EmailVerificata() {
    return (
        <div className="min-h-screen bg-petrolio flex flex-col items-center justify-center px-4">
            <Link to="/" className="mb-10">
                <img src={logo} alt="Lexum" className="h-20 w-auto" />
            </Link>
            <div className="w-full max-w-md bg-slate border border-white/5 p-8 text-center">
                <CheckCircle size={40} className="text-salvia mx-auto mb-4" />
                <h2 className="font-display text-3xl font-light text-nebbia mb-3">Email verificata</h2>
                <p className="font-body text-sm text-nebbia/50 mb-7 leading-relaxed">
                    Registrazione completata. Accedi ora per caricare i documenti di verifica e attivare il tuo account.
                </p>

                <div className="text-left space-y-3 mb-7 border border-white/5 p-4 bg-petrolio/40">
                    {[
                        ['1', 'Accedi con email e password'],
                        ['2', 'Carica i documenti di verifica'],
                        ['3', "Attendi l'approvazione (24-48h)"],
                        ['4', 'Scegli il piano e inizia'],
                    ].map(([n, label]) => (
                        <div key={n} className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-oro/20 border border-oro/30 text-oro font-body text-xs flex items-center justify-center shrink-0">
                                {n}
                            </span>
                            <span className="font-body text-sm text-nebbia/60">{label}</span>
                        </div>
                    ))}
                </div>

                <Link to="/login" className="btn-primary justify-center w-full">
                    <ArrowRight size={16} /> Vai al login
                </Link>
            </div>
        </div>
    )
}