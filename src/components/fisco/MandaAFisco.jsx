// src/components/fisco/MandaAFisco.jsx
//
// "Manda a Fisco" per un documento già in Archivio: nessun nuovo caricamento,
// la lettura parte sullo stesso file. Se il documento è già in Fisco il
// pulsante porta alla sua scheda.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Landmark, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { inviabileAFisco, mandaAFisco, idInFisco } from '@/lib/fisco'

const BASE = 'flex items-center gap-1.5 px-2 py-2 lg:py-1 border font-body text-xs transition-colors'

export default function MandaAFisco({ doc, onInviato }) {
    const { profile } = useAuth()
    const navigate = useNavigate()
    const [inviando, setInviando] = useState(false)
    const [inviato, setInviato] = useState(false)
    const [errore, setErrore] = useState('')

    if (!inviabileAFisco(doc)) return null
    const inFisco = inviato || (doc.tags ?? []).includes('fisco')

    async function manda(e) {
        e.stopPropagation()
        setInviando(true)
        setErrore('')
        try {
            await mandaAFisco(doc, profile.id)
            setInviato(true)
            onInviato?.()
        } catch (err) {
            setErrore(err.message)
        } finally {
            setInviando(false)
        }
    }

    async function apri(e) {
        e.stopPropagation()
        const id = await idInFisco(doc.id)
        navigate(id ? `/fisco?doc=${id}` : '/fisco')
    }

    return (
        <>
            {inFisco ? (
                <button
                    type="button"
                    onClick={apri}
                    title="Apri la scheda in Fisco"
                    className={`${BASE} border-salvia/30 text-salvia hover:bg-salvia/10`}
                >
                    <Landmark size={10} /> In Fisco
                </button>
            ) : (
                <button
                    type="button"
                    onClick={manda}
                    disabled={inviando}
                    title="Riconosce il documento, trova il cliente e calcola la scadenza"
                    className={`${BASE} border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-oro disabled:opacity-50`}
                >
                    {inviando ? <Loader2 size={10} className="animate-spin" /> : <Landmark size={10} />}
                    Manda a Fisco
                </button>
            )}
            {errore && <span className="font-body text-xs text-red-400">{errore}</span>}
        </>
    )
}
