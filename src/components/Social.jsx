// Profili social di Lexum IT e le loro icone, nei colori dei due marchi.
export const SOCIAL = {
    instagram: 'https://www.instagram.com/lexum.it/',
    tiktok: 'https://www.tiktok.com/@lexum.it',
}

// Instagram: quadrato arrotondato col gradiente del marchio e la fotocamera bianca
export function IconaInstagram({ size = 16, className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <defs>
                <radialGradient id="lx-ig" cx="30%" cy="107%" r="150%">
                    <stop offset="0%" stopColor="#fdf497" />
                    <stop offset="5%" stopColor="#fdf497" />
                    <stop offset="45%" stopColor="#fd5949" />
                    <stop offset="60%" stopColor="#d6249f" />
                    <stop offset="90%" stopColor="#285AEB" />
                </radialGradient>
            </defs>
            <rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#lx-ig)" />
            <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.8" />
            <circle cx="16.3" cy="7.7" r="1" fill="#fff" />
        </svg>
    )
}

// TikTok: la nota bianca con le due ombre azzurra e rossa del marchio
const NOTA = 'M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.4-2.47V9.68a5.73 5.73 0 0 0-.8-.06A5.69 5.69 0 0 0 4.18 15.3 5.69 5.69 0 0 0 9.87 21a5.69 5.69 0 0 0 5.69-5.69V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.26-1.48Z'
export function IconaTikTok({ size = 16, className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
            <path d={NOTA} fill="#25F4EE" transform="translate(-0.7 -0.6)" />
            <path d={NOTA} fill="#FE2C55" transform="translate(0.7 0.6)" />
            <path d={NOTA} fill="#fff" />
        </svg>
    )
}
