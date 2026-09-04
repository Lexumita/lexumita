// src/pages/Questionario.jsx
//
// La pagina che si apre dal collegamento nella mail. Chi risponde NON fa
// l'accesso: la credenziale e' il token nell'indirizzo, e il database lo
// verifica confrontandone l'impronta.
//
// ─── PERCHE' QUESTA PAGINA STA FUORI DA VetrinaLayout E DA AuthLayout ───────
// Tutti e due montano <Analytics /> (src/App.jsx:117 e :129). L'indirizzo di
// questa pagina CONTIENE il token: con Analytics attivo finirebbe a
// vitals.vercel-insights.com, cioe' a un terzo che l'informativa privacy non
// dichiara, e chiunque veda quei dati potrebbe rispondere al posto dell'utente.
// Se un domani qualcuno "uniforma la vetrina", questa pagina NON va rimessa
// dentro quei layout.

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Check, AlertCircle, Loader2, Send } from 'lucide-react'

const BOZZA = (t) => `lexum_questionario_bozza_${t?.slice(0, 8)}`

const MESSAGGI = {
  non_valido:  { t: 'Collegamento non valido', d: 'Questo collegamento non risulta fra i nostri. Controlla di averlo copiato per intero, oppure scrivici a info@lexum.it.' },
  scaduto:     { t: 'Collegamento scaduto',    d: 'I collegamenti valgono 30 giorni. Se vuoi ancora rispondere scrivici a info@lexum.it e te ne mandiamo uno nuovo.' },
  chiuso:      { t: 'Questionario chiuso',     d: 'Abbiamo chiuso la raccolta delle risposte. Grazie lo stesso per l’attenzione.' },
  errore:      { t: 'Qualcosa non ha funzionato', d: 'Riprova fra un momento. Se il problema resta, scrivici a info@lexum.it.' },
}

function Guscio({ children }) {
  return (
    <div className="min-h-screen bg-petrolio px-4 py-10 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <p className="font-display text-2xl font-light tracking-[0.32em] text-oro">LEXUM</p>
          <p className="font-body text-[10px] tracking-[0.22em] uppercase text-nebbia/30 mt-1.5">
            Intelligenza artificiale per il diritto
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}

function Esito({ titolo, testo }) {
  return (
    <Guscio>
      <div className="bg-slate border border-white/8 p-8">
        <h1 className="font-display text-2xl font-light text-nebbia mb-3">{titolo}</h1>
        <p className="font-body text-sm text-nebbia/55 leading-relaxed">{testo}</p>
      </div>
    </Guscio>
  )
}

function Domanda({ d, valore, onChange, errore }) {
  const opzioni = Array.isArray(d.opzioni) ? d.opzioni : []
  const scelte = Array.isArray(valore) ? valore : []

  function commuta(codice) {
    const c = scelte.includes(codice)
      ? scelte.filter(x => x !== codice)
      : [...scelte, codice]
    // Il tetto vale anche qui, non solo nel database: meglio un bottone che
    // non risponde con una spiegazione, che un errore dopo l'invio.
    if (d.max_selezioni && c.length > d.max_selezioni) return
    onChange(c)
  }

  return (
    <div className="bg-slate border border-white/8 p-6 sm:p-7">
      <p className="font-body text-[15px] leading-relaxed text-nebbia mb-1">
        {d.testo}
        {d.obbligatoria && <span className="text-oro/60 ml-1.5">*</span>}
      </p>
      {d.aiuto && (
        <p className="font-body text-xs text-nebbia/35 leading-relaxed mb-4">{d.aiuto}</p>
      )}
      <div className={d.aiuto ? '' : 'mt-4'}>

        {(d.tipo === 'scelta_singola' || d.tipo === 'si_no') && (
          <div className="space-y-1.5">
            {opzioni.map(o => {
              const scelto = valore === o.codice
              return (
                <button key={o.codice} type="button" onClick={() => onChange(o.codice)}
                  className={`w-full text-left px-4 py-3 border transition-colors font-body text-sm ${
                    scelto ? 'border-oro/60 bg-oro/10 text-nebbia'
                           : 'border-white/8 text-nebbia/65 hover:border-white/20 hover:text-nebbia'}`}>
                  <span className={`inline-block w-3 h-3 border mr-3 align-middle ${
                    scelto ? 'border-oro bg-oro' : 'border-nebbia/25'}`} />
                  {o.it}
                </button>
              )
            })}
          </div>
        )}

        {d.tipo === 'scelta_multipla' && (
          <>
            <div className="space-y-1.5">
              {opzioni.map(o => {
                const scelto = scelte.includes(o.codice)
                const pieno = d.max_selezioni && scelte.length >= d.max_selezioni && !scelto
                return (
                  <button key={o.codice} type="button" onClick={() => commuta(o.codice)}
                    disabled={pieno}
                    className={`w-full text-left px-4 py-3 border transition-colors font-body text-sm ${
                      scelto ? 'border-oro/60 bg-oro/10 text-nebbia'
                        : pieno ? 'border-white/5 text-nebbia/20 cursor-not-allowed'
                        : 'border-white/8 text-nebbia/65 hover:border-white/20 hover:text-nebbia'}`}>
                    <span className={`inline-block w-3 h-3 border mr-3 align-middle ${
                      scelto ? 'border-oro bg-oro' : 'border-nebbia/25'}`} />
                    {o.it}
                  </button>
                )
              })}
            </div>
            {d.max_selezioni && (
              <p className="font-body text-[11px] text-nebbia/28 mt-2.5">
                {scelte.length} di {d.max_selezioni} scelte usate
              </p>
            )}
          </>
        )}

        {d.tipo === 'scala_1_5' && (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => onChange(n)}
                className={`flex-1 py-3 border font-body text-sm transition-colors ${
                  valore === n ? 'border-oro/60 bg-oro/10 text-oro'
                               : 'border-white/8 text-nebbia/50 hover:border-white/20'}`}>
                {n}
              </button>
            ))}
          </div>
        )}

        {d.tipo === 'testo_libero' && (
          <>
            <textarea
              value={valore ?? ''}
              onChange={e => onChange(e.target.value)}
              rows={5}
              maxLength={d.max_caratteri}
              placeholder="Scrivi qui…"
              className="w-full bg-petrolio/60 border border-white/10 px-3 py-2.5 font-body text-sm
                         text-nebbia placeholder:text-nebbia/20 focus:border-oro/40 outline-none resize-y"
            />
            <p className="font-body text-[11px] text-nebbia/25 mt-1.5 text-right">
              {(valore ?? '').length} / {d.max_caratteri}
            </p>
          </>
        )}
      </div>

      {errore && (
        <p className="font-body text-xs text-amber-400 mt-3 flex items-center gap-1.5">
          <AlertCircle size={12} /> {errore}
        </p>
      )}
    </div>
  )
}

export default function Questionario() {
  const { token } = useParams()
  const [stato, setStato] = useState('caricamento')  // caricamento | ok | inviato | <esito>
  const [dati, setDati] = useState(null)
  const [risposte, setRisposte] = useState({})
  const [mancanti, setMancanti] = useState({})
  const [inviando, setInviando] = useState(false)
  const [erroreInvio, setErroreInvio] = useState(null)
  const [ringraziamento, setRingraziamento] = useState('')

  useEffect(() => {
    let annullato = false
    ;(async () => {
      const { data, error } = await supabase.rpc('questionario_apri', { p_token: token })
      if (annullato) return
      if (error) { setStato('errore'); return }
      if (data?.esito !== 'ok') {
        setRingraziamento(data?.ringraziamento ?? '')
        setStato(data?.esito === 'gia_inviato' ? 'inviato' : (data?.esito ?? 'errore'))
        return
      }
      setDati(data)
      // La bozza vive solo in questa scheda: negli studi i computer sono condivisi.
      try {
        const b = sessionStorage.getItem(BOZZA(token))
        if (b) setRisposte(JSON.parse(b))
      } catch { /* niente bozza */ }
      setStato('ok')
    })()
    return () => { annullato = true }
  }, [token])

  const cambia = useCallback((codice, v) => {
    setRisposte(prev => {
      const n = { ...prev, [codice]: v }
      try { sessionStorage.setItem(BOZZA(token), JSON.stringify(n)) } catch { /* pieno */ }
      return n
    })
    setMancanti(prev => (prev[codice] ? { ...prev, [codice]: null } : prev))
  }, [token])

  async function invia() {
    const vuote = {}
    for (const d of dati.domande) {
      if (!d.obbligatoria) continue
      const v = risposte[d.codice]
      const vuoto = v === undefined || v === null || v === '' ||
                    (Array.isArray(v) && v.length === 0) ||
                    (typeof v === 'string' && v.trim() === '')
      if (vuoto) vuote[d.codice] = 'Questa risposta serve'
    }
    if (Object.keys(vuote).length) {
      setMancanti(vuote)
      setErroreInvio(`Mancano ${Object.keys(vuote).length} risposte.`)
      const primo = document.getElementById(`d-${Object.keys(vuote)[0]}`)
      primo?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setInviando(true); setErroreInvio(null)
    const { data, error } = await supabase.rpc('questionario_invia', {
      p_token: token, p_risposte: risposte,
    })
    setInviando(false)
    if (error) { setErroreInvio(error.message); return }
    if (data?.esito === 'inviato' || data?.esito === 'gia_inviato') {
      try { sessionStorage.removeItem(BOZZA(token)) } catch { /* niente */ }
      setRingraziamento(data?.ringraziamento ?? 'Grazie.')
      setStato('inviato')
      return
    }
    setStato(data?.esito ?? 'errore')
  }

  if (stato === 'caricamento') {
    return (
      <Guscio>
        <div className="flex items-center gap-3 text-nebbia/40 font-body text-sm">
          <Loader2 size={16} className="animate-spin" /> Un momento…
        </div>
      </Guscio>
    )
  }

  if (stato === 'inviato') {
    return (
      <Guscio>
        <div className="bg-slate border border-salvia/25 p-8">
          <div className="w-10 h-10 border border-salvia/40 bg-salvia/10 flex items-center justify-center mb-5">
            <Check size={18} className="text-salvia" />
          </div>
          <h1 className="font-display text-2xl font-light text-nebbia mb-3">Ricevuta</h1>
          <p className="font-body text-sm text-nebbia/55 leading-relaxed">
            {ringraziamento || 'Grazie: l’abbiamo ricevuta.'}
          </p>
          <a href="https://www.lexum.it"
             className="inline-block mt-7 font-body text-sm text-oro hover:text-oro/70">
            Torna a Lexum →
          </a>
        </div>
      </Guscio>
    )
  }

  if (stato !== 'ok') {
    const m = MESSAGGI[stato] ?? MESSAGGI.errore
    return <Esito titolo={m.t} testo={m.d} />
  }

  return (
    <Guscio>
      <div className="mb-7">
        <h1 className="font-display text-3xl font-light text-nebbia mb-3">{dati.titolo}</h1>
        {dati.intro && (
          <p className="font-body text-sm text-nebbia/55 leading-relaxed">{dati.intro}</p>
        )}
      </div>

      {/* Non e' anonimo, e va detto prima, non dopo. */}
      <div className="mb-6 px-4 py-3 border border-white/8 bg-white/[0.02]">
        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
          Le tue risposte sono collegate al tuo account, così possiamo ricontattarti se
          serve un chiarimento: non sono anonime.{' '}
          <a href="https://www.lexum.it/privacy" target="_blank" rel="noreferrer"
             className="text-oro/70 hover:text-oro">Informativa privacy</a>
        </p>
      </div>

      <div className="space-y-4">
        {dati.domande.map(d => (
          <div key={d.codice} id={`d-${d.codice}`}>
            <Domanda
              d={d}
              valore={risposte[d.codice]}
              onChange={v => cambia(d.codice, v)}
              errore={mancanti[d.codice]}
            />
          </div>
        ))}
      </div>

      {erroreInvio && (
        <div className="mt-5 p-3 bg-amber-900/10 border border-amber-500/25">
          <p className="font-body text-xs text-amber-300">{erroreInvio}</p>
        </div>
      )}

      <button onClick={invia} disabled={inviando}
        className="mt-7 w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5
                   bg-oro text-petrolio font-body text-sm font-semibold
                   hover:bg-oro/90 disabled:opacity-50 transition-colors">
        {inviando ? <><Loader2 size={15} className="animate-spin" /> Invio…</>
                  : <><Send size={15} /> Invia le risposte</>}
      </button>

      <p className="font-body text-[11px] text-nebbia/25 mt-4 mb-10">
        Puoi chiudere e riaprire questo collegamento finché non invii.
      </p>
    </Guscio>
  )
}
