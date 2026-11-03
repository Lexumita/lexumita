// L'avviso della prova gratuita sulla dashboard (03-11-2026): fin quando dura e, per chi la vuole, la consulenza; a
// prova finita i piani. Prima c'era solo il banner «scaduta» dell'avvocato, che non si vedeva mai: voleva piano_id
// vuoto, e il piano di prova resta scritto anche dopo la scadenza.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { linkConsulenza } from '@/lib/provaGratuita'

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
    const finita = scadenza < new Date()
    const giorno = scadenza.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })
    const lavoro = profile.role === 'commercialista' ? 'mandati, clienti e documenti' : 'pratiche, clienti e documenti'

    return (
        <div className="bg-slate border border-oro/25 p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-oro/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
            <div className="relative flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1.5 min-w-0">
                    <p className="font-body text-sm font-medium text-oro">
                        {finita ? 'La tua prova gratuita è finita' : `La tua prova gratuita è attiva fino al ${giorno}`}
                    </p>
                    <p className="font-body text-xs text-nebbia/50 leading-relaxed max-w-lg">
                        {finita
                            ? `Scegli un piano per continuare a lavorare con ${lavoro}.`
                            : 'Lo studio è tutto aperto e hai i crediti per provare Lex. Se vuoi una mano a partire, richiedi una consulenza con il team.'}
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
