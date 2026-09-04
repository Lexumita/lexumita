// src/components/shared/CampanellaNotifiche.jsx
//
// Campanella in alto a destra dei layout. Mostra badge contatore
// notifiche non lette + dropdown con ultime 30 (scrollabile).
// Click su notifica: marca letta + naviga al link.

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, X, AlertTriangle, Calendar, FileText, MessageCircle, User, CreditCard, Gavel, Receipt, FolderOpen } from 'lucide-react'
import { useNotifiche } from '@/hooks/useNotifiche'

// ─── Icona per tipo notifica ─────────────────────────────────
function iconaTipo(tipo) {
    const map = {
        fattura_scaduta: { Icon: AlertTriangle, color: 'text-red-400' },
        fattura_in_scadenza: { Icon: Receipt, color: 'text-amber-400' },
        appuntamento_domani: { Icon: Calendar, color: 'text-salvia' },
        udienza_domani: { Icon: Gavel, color: 'text-red-400' },
        nuovo_messaggio_ticket: { Icon: MessageCircle, color: 'text-oro' },
        nuovo_messaggio_avvocato: { Icon: MessageCircle, color: 'text-oro' },
        nuovo_utente: { Icon: User, color: 'text-salvia' },
        nuovo_pagamento: { Icon: CreditCard, color: 'text-oro' },
        nuovo_ticket: { Icon: MessageCircle, color: 'text-amber-400' },
        nuovo_appuntamento: { Icon: Calendar, color: 'text-salvia' },
        nuovo_documento: { Icon: FolderOpen, color: 'text-salvia' },
        nuova_fattura: { Icon: Receipt, color: 'text-oro' },
        termine_T7: { Icon: AlertTriangle, color: 'text-amber-400' },
        termine_T3: { Icon: AlertTriangle, color: 'text-amber-400' },
        termine_T1: { Icon: AlertTriangle, color: 'text-red-400' },
    }
    return map[tipo] ?? { Icon: FileText, color: 'text-nebbia/40' }
}

function tempoRelativo(iso) {
    if (!iso) return ''
    const diff = (Date.now() - new Date(iso).getTime()) / 1000
    if (diff < 60) return 'ora'
    if (diff < 3600) return `${Math.floor(diff / 60)}min fa`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`
    if (diff < 604800) return `${Math.floor(diff / 86400)}g fa`
    return new Date(iso).toLocaleDateString('it-IT')
}

export default function CampanellaNotifiche() {
    const [open, setOpen] = useState(false)
    const wrapperRef = useRef(null)
    const navigate = useNavigate()
    const { notifiche, nonLette, loading, marcaLetta, marcaTutteLette, elimina } = useNotifiche({ limit: 30 })

    // ─── Chiudi cliccando fuori ─────────────────────────────
    useEffect(() => {
        function handleClick(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    // ─── Click su notifica ──────────────────────────────────
    async function handleClickNotifica(n) {
        if (!n.letto_at) await marcaLetta(n.id)
        setOpen(false)
        if (n.link) navigate(n.link)
    }

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="relative p-2 hover:bg-white/5 transition-colors"
                aria-label="Notifiche"
            >
                <Bell size={18} className={nonLette > 0 ? 'text-oro' : 'text-nebbia/60'} />
                {nonLette > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-oro text-petrolio font-body text-[10px] font-bold rounded-full flex items-center justify-center">
                        {nonLette > 9 ? '9+' : nonLette}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] max-h-[70vh] sm:max-h-[32rem] bg-slate border border-white/10 shadow-2xl z-50 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                        <div>
                            <p className="font-display text-base text-nebbia">Notifiche</p>
                            {nonLette > 0 && (
                                <p className="font-body text-xs text-nebbia/40 mt-0.5">
                                    {nonLette} non {nonLette === 1 ? 'letta' : 'lette'}
                                </p>
                            )}
                        </div>
                        {nonLette > 0 && (
                            <button
                                onClick={marcaTutteLette}
                                className="font-body text-xs text-oro hover:text-oro/70 flex items-center gap-1"
                            >
                                <Check size={12} /> Segna tutte lette
                            </button>
                        )}
                    </div>

                    {/* Lista scrollabile */}
                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                            </div>
                        ) : notifiche.length === 0 ? (
                            <div className="px-4 py-12 text-center">
                                <Bell size={28} className="text-nebbia/20 mx-auto mb-2" />
                                <p className="font-body text-sm text-nebbia/40">Nessuna notifica</p>
                                <p className="font-body text-xs text-nebbia/30 mt-1">Quando arriveranno le vedrai qui</p>
                            </div>
                        ) : (
                            notifiche.map(n => {
                                const { Icon, color } = iconaTipo(n.tipo)
                                const nonLetta = n.letto_at === null
                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => handleClickNotifica(n)}
                                        className={`group px-4 py-3 border-b border-white/5 cursor-pointer transition-colors ${nonLetta ? 'bg-oro/[0.03] hover:bg-oro/[0.06]' : 'hover:bg-white/[0.02]'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Icon size={15} className={`${color} mt-0.5 shrink-0`} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-body text-sm ${nonLetta ? 'text-nebbia font-medium' : 'text-nebbia/70'}`}>
                                                    {n.titolo}
                                                </p>
                                                {n.descrizione && (
                                                    <p className="font-body text-xs text-nebbia/40 mt-0.5 line-clamp-2">{n.descrizione}</p>
                                                )}
                                                <p className="font-body text-xs text-nebbia/30 mt-1">{tempoRelativo(n.created_at)}</p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); elimina(n.id) }}
                                                className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity p-2 hover:bg-white/5 shrink-0"
                                                aria-label="Elimina notifica"
                                            >
                                                <X size={14} className="text-nebbia/40" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}