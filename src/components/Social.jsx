// Profili social di Lexum IT e le loro icone (TikTok non è in lucide: disegno a mano).
import { Instagram } from 'lucide-react'

export const SOCIAL = {
    instagram: 'https://www.instagram.com/lexum.it/',
    tiktok: 'https://www.tiktok.com/@lexum.it',
}

export function IconaTikTok({ size = 16, className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.4-2.47V9.68a5.73 5.73 0 0 0-.8-.06A5.69 5.69 0 0 0 4.18 15.3 5.69 5.69 0 0 0 9.87 21a5.69 5.69 0 0 0 5.69-5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.26-1.48Z" />
        </svg>
    )
}

export function IconaInstagram({ size = 16, className = '' }) {
    return <Instagram size={size} className={className} aria-hidden="true" />
}
