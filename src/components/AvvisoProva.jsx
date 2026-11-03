// La prova gratuita sulla dashboard (03-11-2026). Mentre dura: fin quando e, per chi la vuole, la consulenza.
// Quando finisce non si blocca niente (sua decisione): una finestra per proseguire con un piano, altrimenti si
// rimane con quello che si ha. Compare una volta a ogni apertura del sito, finché non compra un piano.
// Prima c'era solo il banner «scaduta» dell'avvocato, che non si vedeva mai: voleva piano_id vuoto, e il piano di
// prova resta scritto anche dopo la scadenza.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, MessageSquare, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { linkConsulenza } from '@/lib/provaGratuita'

const CHIAVE_VISTA = 'lexum_prova_finita_vista'

function vistaPrima() {
    try { return !!window.sessionStorage.getItem(CHIAVE_VISTA) } catch { return false }
}

export default function AvvisoProva() {
    const { profile } = useAuth()
    const [inProva, setInProva] = useState(false)
    const [chiuso, setChiuso] = useState(false)

    useEffect(() => {
        if (!profile?.piano_id) return
        supabase.from('prodotti').select('tipo').eq('id', profile.piano_id).maybeSingle()
            .then(({ data }) => setInProva(data?.tipo === 'gratuito'))
    }, [profile?.piano_id])

    if (!inProva || chiuso || !profile?.abbonamento_scadenza) return null

    const scadenza = new Date(profile.abbonamento_scadenza)
    const giorno = scadenza.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })

    if (scadenza < new Date()) {
        if (vistaPrima()) return null
        const lavoro = profile.role === 'commercialista' ? 'Mandati, calendario e fatture' : 'Pratiche, calendario e fatture'
        const chiudi = () => {
            try { window.sessionStorage.setItem(CHIAVE_VISTA, '1') } catch { /* si richiude e basta */ }
            setChiuso(true)
        }
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-petrolio/80 backdrop-blur-sm" role="dialog" aria-modal="true">
                <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-slate border border-oro/30 p-7">
                    <button onClick={chiudi} aria-label="Chiudi" className="absolute top-3 right-3 p-2 text-nebbia/40 hover:text-nebbia transition-colors">
                        <X size={16} />
                    </button>
                    <h2 className="font-display text-3xl font-light text-nebbia mb-3 pr-6">La tua prova gratuita è finita</h2>
                    <p className="font-body text-sm text-nebbia/60 leading-relaxed mb-5">
                        Per proseguire con lo studio completo scegli un piano. Altrimenti rimani con quello che hai, senza nessun addebito.
                    </p>
                    <p className="font-body text-xs text-oro uppercase tracking-widest mb-2">Con un piano</p>
                    <ul className="space-y-1.5 mb-5">
                        {['I crediti per Lex ogni mese', 'Nuovi clienti', 'L\'archivio per caricare i tuoi documenti'].map(v => (
                            <li key={v} className="flex gap-2 font-body text-sm text-nebbia/80">
                                <Check size={14} className="text-oro shrink-0 mt-1" /> {v}
                            </li>
                        ))}
                    </ul>
                    <p className="font-body text-xs text-nebbia/40 uppercase tracking-widest mb-2">Quello che hai già</p>
                    <ul className="space-y-1.5 mb-6">
                        {[lavoro, 'I clienti che hai registrato', 'La Banca Dati', 'I documenti in archivio, in sola lettura'].map(v => (
                            <li key={v} className="flex gap-2 font-body text-sm text-nebbia/60">
                                <Check size={14} className="text-salvia shrink-0 mt-1" /> {v}
                            </li>
                        ))}
                    </ul>
                    <Link to="/studio?tab=acquista" onClick={chiudi}
                        className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                        Scegli un piano <ArrowRight size={14} />
                    </Link>
                    <button onClick={chiudi} className="block w-full mt-3 py-2 font-body text-sm text-nebbia/50 hover:text-nebbia transition-colors">
                        Rimango con quello che ho
                    </button>
                    <Link to={linkConsulenza(profile.role)} onClick={chiudi}
                        className="flex items-center justify-center gap-2 mt-1 py-2 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                        <MessageSquare size={13} /> Richiedi una consulenza
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-slate border border-oro/25 p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-oro/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
            <div className="relative flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1.5 min-w-0">
                    <p className="font-body text-sm font-medium text-oro">La tua prova gratuita è attiva fino al {giorno}</p>
                    <p className="font-body text-xs text-nebbia/50 leading-relaxed max-w-lg">
                        Lo studio è tutto aperto e hai i crediti per provare Lex. Se vuoi una mano a partire, richiedi una consulenza con il team.
                    </p>
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 shrink-0 w-full sm:w-auto">
                    <button onClick={() => setChiuso(true)}
                        className="font-body text-xs text-nebbia/30 hover:text-nebbia transition-colors py-2.5">
                        Dopo
                    </button>
                    <Link to={linkConsulenza(profile.role)}
                        className="inline-flex items-center gap-2 font-body text-xs text-nebbia/60 hover:text-oro transition-colors py-2.5">
                        <MessageSquare size={13} /> Richiedi una consulenza
                    </Link>
                    <Link to="/studio?tab=acquista"
                        className="flex items-center gap-2 px-5 py-2.5 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                        Vedi i piani →
                    </Link>
                </div>
            </div>
        </div>
    )
}
