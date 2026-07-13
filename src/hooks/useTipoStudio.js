// src/hooks/useTipoStudio.js
//
// Determina se lo studio a cui il cliente è collegato è di un avvocato o di un
// commercialista, leggendo il ruolo del professionista di riferimento
// (profiles.avvocato_id → profiles.role). Serve a rendere il portale cliente
// consapevole del tipo di studio: menu, etichette (Avv./Dott.), pagine fiscali.
//
// Ritorna un default 'avvocato' finché il tipo non è determinato o se manca il
// collegamento, così il portale resta retrocompatibile.

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export function useTipoStudio() {
  const { profile } = useAuth()
  const [tipoStudio, setTipoStudio] = useState(null) // 'avvocato' | 'commercialista' | null
  const [professionista, setProfessionista] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let attivo = true
    async function carica() {
      if (!profile?.avvocato_id) {
        if (attivo) { setTipoStudio(null); setLoading(false) }
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, cognome, role')
        .eq('id', profile.avvocato_id)
        .single()
      if (!attivo) return
      if (data) {
        setTipoStudio(data.role === 'commercialista' ? 'commercialista' : 'avvocato')
        setProfessionista(data)
      }
      setLoading(false)
    }
    carica()
    return () => { attivo = false }
  }, [profile?.avvocato_id])

  const isCommercialista = tipoStudio === 'commercialista'
  return {
    tipoStudio,
    isCommercialista,
    professionista,
    // Etichette pronte all'uso (default avvocato-centrico)
    labelProfessionista: isCommercialista ? 'Commercialista' : 'Avvocato',
    labelProfBreve: isCommercialista ? 'Dott.' : 'Avv.',
    loading,
  }
}

export default useTipoStudio
