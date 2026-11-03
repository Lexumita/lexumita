import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { eraStatica } from '@/lib/statico'

export default function ScrollToTop() {
  const { pathname } = useLocation()
  const primoDisegno = useRef(true)
  useEffect(() => {
    // Sopra il testo già pronto nell'HTML chi ha iniziato a scorrere resta dov'è
    if (primoDisegno.current) {
      primoDisegno.current = false
      if (eraStatica()) return
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}
