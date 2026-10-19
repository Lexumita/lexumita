// Conta una visita a ogni pagina della vetrina (vedi lib/visite.js). Non disegna niente.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { registraVisita } from '@/lib/visite'

export default function ContaVisite() {
  const { pathname } = useLocation()
  useEffect(() => { registraVisita(pathname) }, [pathname])
  return null
}
