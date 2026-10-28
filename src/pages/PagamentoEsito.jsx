// src/pages/PagamentoEsito.jsx
//
// Rientro dalla cassa Tagadapay (28-10-2026): l'indirizzo impostato su Tagadapay come «Custom Thank-You
// URL» del negozio. Riporta alla pagina da cui si è partiti (src/lib/ritornoCassa.js); i crediti li
// accredita intanto la notifica del pagamento (tagada-webhook).

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { prendiRitorno } from '@/lib/ritornoCassa'

export default function PagamentoEsito() {
    const navigate = useNavigate()
    const { user, profile, loading } = useAuth()

    useEffect(() => {
        // il profilo arriva dopo la sessione: serve per la pagina di riserva
        if (loading || (user && !profile)) return
        const ritorno = prendiRitorno()
        const riserva = !profile ? '/' : profile.role === 'user' ? '/area/acquista?success=1' : '/studio?success=1'
        navigate(ritorno ?? riserva, { replace: true })
    }, [loading, user, profile])

    return (
        <div className="min-h-screen flex items-center justify-center bg-petrolio">
            <Loader2 size={22} className="animate-spin text-oro/60" />
        </div>
    )
}
