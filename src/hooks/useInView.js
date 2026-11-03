// La comparsa delle sezioni allo scorrimento, comune alle pagine della vetrina (prima una copia per pagina).
// 03-11-2026: sopra il testo già pronto nell'HTML (lib/statico.js) quello che è già a schermo resta fermo,
// senza sparire e ricomparire; quello più in basso compare come sempre. Nel build è tutto visibile.
import { useEffect, useRef, useState } from 'react'

export function useInView(threshold = 0.12) {
  const ref = useRef(null)
  const [inView, setInView] = useState(() => import.meta.env.SSR || !!document.getElementById('statico'))
  useEffect(() => {
    if (inView) {
      if (ref.current && ref.current.getBoundingClientRect().top < window.innerHeight) return
      setInView(false)
    }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect() }
    }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, inView]
}
