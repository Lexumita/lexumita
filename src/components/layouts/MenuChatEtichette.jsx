// src/components/layouts/MenuChatEtichette.jsx
//
// La barra a sinistra come nell'app (29-10-2026): in cima «Nuova chat», che porta a Lex; sotto le voci,
// le etichette dell'utente come se fossero chat (pallino del colore, nome, quanti elementi), che si
// vedono facendo scorrere la barra. Un'etichetta apre la sua pagina.
//
// Le etichette e i loro numeri li legge useEtichetteMenu (src/hooks/useEtichetteMenu.js).
import { NavLink } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useEtichetteMenu } from '@/hooks/useEtichetteMenu'

/** «Nuova chat», in cima alla barra. Se la chat è già aperta non la azzera: lì c'è «Nuova sessione». */
export function VoceNuovaChat({ to, onClick }) {
    return (
        <NavLink
            to={to}
            end
            onClick={onClick}
            className={({ isActive }) =>
                `!mb-3 flex items-center gap-3 px-3 py-2.5 border font-body text-sm transition-colors ${isActive
                    ? 'bg-oro/10 border-oro/40 text-oro'
                    : 'border-oro/25 text-oro/80 hover:text-oro hover:bg-oro/5'
                }`
            }
        >
            <Sparkles size={16} strokeWidth={1.5} />
            <span className="flex-1">Nuova chat</span>
        </NavLink>
    )
}

/** Le etichette nella barra. `base` è la pagina delle etichette: /area/etichette o /etichette. */
export function EtichetteMenu({ userId, base, onApri }) {
    const etichette = useEtichetteMenu(userId)

    if (!etichette) return null

    return (
        <div className="!mt-5">
            <p className="px-3 pb-2 font-body text-[10px] uppercase tracking-widest text-nebbia/30">Etichette</p>
            {etichette.length === 0 ? (
                <p className="px-3 font-body text-xs text-nebbia/30 leading-relaxed">
                    Le etichette che crei salvando le chat compaiono qui.
                </p>
            ) : (
                <div className="space-y-0.5">
                    {etichette.map(e => (
                        <NavLink
                            key={e.id}
                            to={`${base}/${e.id}`}
                            onClick={onApri}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 font-body text-sm transition-colors ${isActive
                                    ? 'bg-oro/10 text-oro border-r-2 border-oro'
                                    : 'text-nebbia/50 hover:text-nebbia hover:bg-white/5'
                                }`
                            }
                        >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.colore || '#7FA39A' }} />
                            <span className="flex-1 min-w-0 truncate">{e.nome}</span>
                            <span className="font-body text-xs text-nebbia/30">{e.quanti}</span>
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    )
}
