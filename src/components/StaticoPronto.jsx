// Toglie il testo già pronto nell'HTML appena la pagina vera è disegnata (vedi lib/statico.js).
// Va tolto prima degli altri effetti: con #root nascosto le altre pagine non potrebbero misurarsi.
import { useEffect, useLayoutEffect } from 'react'
import { togliStatico } from '@/lib/statico'

// Durante il build (src/seo/entry-seo.jsx) non c'è niente da togliere e useLayoutEffect darebbe un avviso
const usaEffetto = import.meta.env.SSR ? useEffect : useLayoutEffect

export default function StaticoPronto({ quando = true }) {
    usaEffetto(() => { if (quando) togliStatico() }, [quando])
    return null
}
