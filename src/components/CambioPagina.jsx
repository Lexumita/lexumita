// Il cambio di pagina nella vetrina (09-11-2026): a ogni indirizzo nuovo la pagina entra piano, come la hero,
// invece di comparire di scatto. La prima pagina no: arriva col testo già pronto nell'HTML (lib/statico.js) ed
// è già a schermo; animarla la farebbe sparire e ricomparire. Nel build (src/seo/entry-seo.jsx) niente animazione.
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

let primaGiaMostrata = false

function Entrata({ children, className }) {
    const [anima] = useState(() => !import.meta.env.SSR && primaGiaMostrata)
    useEffect(() => { primaGiaMostrata = true }, [])
    return <div className={`${className}${anima ? ' entrata-pagina' : ''}`}>{children}</div>
}

// La chiave è l'indirizzo: anche tra due pagine della stessa rotta (un articolo e il successivo) si rientra
export default function CambioPagina({ children, className = '' }) {
    const { pathname } = useLocation()
    return <Entrata key={pathname} className={className}>{children}</Entrata>
}
