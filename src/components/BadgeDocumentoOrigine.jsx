// src/components/BadgeDocumentoOrigine.jsx
//
// 07-10-2026: sotto una risposta di Lex salvata, il documento da cui è nata.
//   presente    → link al documento nell'archivio
//   eliminato   → «Documento eliminato» (il collegamento c'era ma il documento non c'è più)
//   non_salvato → nome del documento, non salvato nell'archivio
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { rottaArchivio } from '@/lib/archivio'
import { statoDocumentoOrigine } from '@/lib/documentoOrigine'

export default function BadgeDocumentoOrigine({ ricerca }) {
    const { profile } = useAuth()
    const s = statoDocumentoOrigine(ricerca)
    if (!s) return null
    const nome = s.nome || 'Documento'

    if (s.stato === 'presente') {
        return (
            <Link
                to={`${rottaArchivio(profile?.role)}/${s.id}`}
                onClick={e => e.stopPropagation()}
                title={`Apri «${nome}» nell'archivio`}
                className="flex items-center gap-1 font-body text-salvia/80 hover:text-oro border border-salvia/20 hover:border-oro/40 px-2 py-0.5 transition-colors min-w-0 max-w-[260px]">
                <FileText size={11} className="shrink-0" />
                <span className="truncate">{nome}</span>
            </Link>
        )
    }
    if (s.stato === 'eliminato') {
        return (
            <span
                title={`La risposta è nata da «${nome}», poi eliminato dall'archivio`}
                className="flex items-center gap-1 font-body text-nebbia/35 italic border border-white/10 px-2 py-0.5 min-w-0 max-w-[260px]">
                <FileText size={11} className="shrink-0" />
                <span className="truncate">Documento eliminato</span>
            </span>
        )
    }
    return (
        <span
            title="La risposta è nata da questo documento, che non è stato salvato nell'archivio"
            className="flex items-center gap-1 font-body text-nebbia/45 border border-white/10 px-2 py-0.5 min-w-0 max-w-[260px]">
            <FileText size={11} className="shrink-0" />
            <span className="truncate">{nome}</span>
            <span className="shrink-0 text-nebbia/30">· non salvato nell'archivio</span>
        </span>
    )
}
