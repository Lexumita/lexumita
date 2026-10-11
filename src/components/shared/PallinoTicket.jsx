// Il pallino ambra dei menu: ci sono conversazioni che aspettano la tua risposta.
// `className` serve a posizionarlo (es. sul pulsante del menu del telefono).

export default function PallinoTicket({ n, className = '' }) {
    if (!n) return null
    const testo = `${n} ${n === 1 ? 'conversazione aspetta' : 'conversazioni aspettano'} la tua risposta`
    return (
        <span className={`w-2 h-2 rounded-full bg-amber-400 shrink-0 ${className}`} title={testo} aria-label={testo} />
    )
}
