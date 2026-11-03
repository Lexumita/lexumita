// src/components/avvocato/ParcellaCampi.jsx
//
// 03-11-2026: il calcolo della parcella e i suoi campi, staccati dalla finestra del wizard fattura
// (CalcolaParcellaModal) per usarli anche nella pagina pubblica /strumenti/calcolo-parcella-avvocato.
// Motore e tabelle: src/lib/parametriForensi.

import { useMemo, useState, useEffect } from 'react'
import { Info, AlertTriangle } from 'lucide-react'
import {
  GRUPPI_COMPETENZE, SCAGLIONI, FASI, LIVELLI, AUMENTI, RIDUZIONI,
  INDETERMINABILE, VERSIONE_DEFAULT, pctAumentoParti, getCompetenza,
  getFasi, DISCLAIMER,
} from '@/lib/parametriForensi/catalogo'
import { calcolaParcella, scaglioneDaValore, fasiDisponibili } from '@/lib/parametriForensi/engine'
import { hasDati, metaTabella } from '@/lib/parametriForensi/tabelle'

// Fasi iniziali: tutte le disponibili incluse, livello medio.
function fasiIniziali(disponibili) {
  const o = {}
  for (const f of FASI) o[f.id] = { incluso: disponibili.includes(f.id), livello: 'medio' }
  return o
}

export function useCalcoloParcella() {
  const versione = VERSIONE_DEFAULT

  // Gruppi/competenze con dati caricati.
  const gruppiDisponibili = useMemo(() =>
    GRUPPI_COMPETENZE
      .map(g => ({ ...g, voci: g.voci.filter(v => hasDati(v.key, versione)) }))
      .filter(g => g.voci.length > 0)
  , [versione])

  const primaCompetenza = gruppiDisponibili[0]?.voci[0]?.key ?? ''

  const [competenzaKey, setCompetenzaKey] = useState(primaCompetenza)
  const [scaglioneId, setScaglioneId] = useState('da_5201_26000')
  const [valoreCausa, setValoreCausa] = useState('')
  const [fasi, setFasi] = useState(() => fasiIniziali(FASI.map(f => f.id)))
  const [aumenti, setAumenti] = useState({})   // { id: { attivo, pct, nParti } }
  const [riduzioni, setRiduzioni] = useState({}) // { id: { attivo, pct } }
  const [includiSpeseGenerali, setIncludiSpeseGenerali] = useState(true)
  const [applicaRitenuta, setApplicaRitenuta] = useState(false)

  const competenza = getCompetenza(competenzaKey)
  const isPenale = competenza?.tipo === 'penale'
  const meta = metaTabella(competenzaKey, versione)
  const fasiCompetenza = useMemo(() => getFasi(competenzaKey), [competenzaKey])

  // Fasi disponibili per competenza/scaglione correnti.
  const disponibili = useMemo(
    () => fasiDisponibili(competenzaKey, versione, isPenale ? null : scaglioneId),
    [competenzaKey, versione, scaglioneId, isPenale]
  )

  // Quando cambia competenza/scaglione, riallinea le fasi incluse a quelle disponibili.
  useEffect(() => {
    setFasi(prev => {
      const o = {}
      for (const f of fasiCompetenza) {
        const disp = disponibili.includes(f.id)
        o[f.id] = { incluso: disp && (prev[f.id]?.incluso ?? true), livello: prev[f.id]?.livello ?? 'medio' }
      }
      return o
    })
  }, [disponibili, fasiCompetenza])

  // valore causa → scaglione automatico
  function onValoreCausa(v) {
    setValoreCausa(v)
    const s = scaglioneDaValore(v)
    if (s) setScaglioneId(s)
  }

  // Aumenti/riduzioni risolti per il motore.
  const aumentiRisolti = useMemo(() =>
    AUMENTI.filter(a => aumenti[a.id]?.attivo).map(a => ({
      id: a.id,
      label: a.label,
      pct: a.tipo === 'parti' ? pctAumentoParti(aumenti[a.id]?.nParti ?? 2) : (aumenti[a.id]?.pct ?? a.pct),
    }))
  , [aumenti])

  const riduzioniRisolte = useMemo(() =>
    RIDUZIONI.filter(r => riduzioni[r.id]?.attivo).map(r => ({
      id: r.id, label: r.label, pct: riduzioni[r.id]?.pct ?? r.pct,
    }))
  , [riduzioni])

  const risultato = useMemo(() => calcolaParcella({
    versione, competenzaKey, scaglioneId: isPenale ? null : scaglioneId,
    fasi, aumenti: aumentiRisolti, riduzioni: riduzioniRisolte,
    includiSpeseGenerali, applicaRitenuta,
  }), [versione, competenzaKey, scaglioneId, isPenale, fasi, aumentiRisolti, riduzioniRisolte, includiSpeseGenerali, applicaRitenuta])

  const rp = risultato.riepilogo

  function toggleAumento(a) {
    setAumenti(prev => ({ ...prev, [a.id]: { attivo: !prev[a.id]?.attivo, pct: prev[a.id]?.pct ?? a.pct, nParti: prev[a.id]?.nParti ?? 2 } }))
  }
  function setPctAumento(a, pct) {
    setAumenti(prev => ({ ...prev, [a.id]: { ...prev[a.id], attivo: true, pct: Number(pct) } }))
  }
  function setNParti(a, n) {
    setAumenti(prev => ({ ...prev, [a.id]: { ...prev[a.id], attivo: true, nParti: Number(n) } }))
  }
  function toggleRiduzione(r) {
    setRiduzioni(prev => ({ ...prev, [r.id]: { attivo: !prev[r.id]?.attivo, pct: prev[r.id]?.pct ?? r.pct } }))
  }
  function setPctRiduzione(r, pct) {
    setRiduzioni(prev => ({ ...prev, [r.id]: { attivo: true, pct: Number(pct) } }))
  }

  return {
    versione, gruppiDisponibili, competenzaKey, setCompetenzaKey, scaglioneId, setScaglioneId,
    valoreCausa, setValoreCausa, onValoreCausa, fasi, setFasi, aumenti, riduzioni,
    includiSpeseGenerali, setIncludiSpeseGenerali, applicaRitenuta, setApplicaRitenuta,
    isPenale, meta, fasiCompetenza, disponibili, risultato,
    toggleAumento, setPctAumento, setNParti, toggleRiduzione, setPctRiduzione,
  }
}

// I campi del calcolo. avvisoFonte: il testo per i valori non confrontati con la Gazzetta.
export function ParcellaCampi({ calcolo, avvisoFonte = null }) {
  const {
    gruppiDisponibili, competenzaKey, setCompetenzaKey, scaglioneId, setScaglioneId,
    valoreCausa, setValoreCausa, onValoreCausa, fasi, setFasi, aumenti, riduzioni,
    includiSpeseGenerali, setIncludiSpeseGenerali, applicaRitenuta, setApplicaRitenuta,
    isPenale, meta, fasiCompetenza, disponibili,
    toggleAumento, setPctAumento, setNParti, toggleRiduzione, setPctRiduzione,
  } = calcolo

  return (
    <>
              {/* Competenza + scaglione */}
              <div className="space-y-4">
                <div>
                  <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Competenza</label>
                  <select value={competenzaKey} onChange={e => setCompetenzaKey(e.target.value)}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                    {gruppiDisponibili.map(g => (
                      <optgroup key={g.gruppo} label={g.gruppo}>
                        {g.voci.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  {meta && meta.confidenza !== 'high' && (
                    <p className="font-body text-xs text-amber-400/70 mt-1.5 flex items-center gap-1.5">
                      <AlertTriangle size={11} /> {avvisoFonte ?? `Valori con confidenza ${meta.confidenza} — da validare contro la Gazzetta Ufficiale.`}
                    </p>
                  )}
                </div>

                {!isPenale && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Valore della causa (€)</label>
                      <input type="number" min="0" step="100" placeholder="Es. 15000"
                        value={valoreCausa} onChange={e => onValoreCausa(e.target.value)}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
                      <p className="font-body text-xs sm:text-[11px] text-nebbia/30 mt-1">Imposta automaticamente lo scaglione.</p>
                    </div>
                    <div>
                      <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Scaglione di valore</label>
                      <select value={scaglioneId} onChange={e => { setScaglioneId(e.target.value); setValoreCausa('') }}
                        className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                        {SCAGLIONI.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {!isPenale && (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-1.5">
                    <span className="w-full sm:w-auto font-body text-xs sm:text-[11px] text-nebbia/30 sm:self-center sm:mr-1">Valore indeterminabile:</span>
                    {INDETERMINABILE.map(o => (
                      <button key={o.id} type="button"
                        onClick={() => { setScaglioneId(o.scaglione); setValoreCausa('') }}
                        className="font-body text-xs sm:text-[11px] min-h-[40px] sm:min-h-0 px-3 py-2 sm:px-2 sm:py-1 border border-white/10 text-nebbia/50 hover:border-oro/40 hover:text-oro transition-colors">
                        {o.label.replace('Indeterminabile — ', '')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fasi */}
              <div className="border-t border-white/5 pt-4">
                <p className="section-label mb-3">{fasiCompetenza[0]?.id === 'compenso' ? 'Compenso' : 'Fasi'}</p>
                <div className="space-y-2">
                  {fasiCompetenza.map(f => {
                    const disp = disponibili.includes(f.id)
                    const cfg = fasi[f.id] ?? { incluso: false, livello: 'medio' }
                    return (
                      <div key={f.id} className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 border ${cfg.incluso && disp ? 'border-oro/20 bg-oro/5' : 'border-white/5'} ${!disp ? 'opacity-40' : ''}`}>
                        <label className="flex items-center gap-3 sm:flex-1 min-w-0 cursor-pointer py-1 sm:py-0">
                          <input type="checkbox" disabled={!disp} checked={cfg.incluso && disp}
                            onChange={e => setFasi(prev => ({ ...prev, [f.id]: { ...prev[f.id], incluso: e.target.checked } }))}
                            className="w-4 h-4 accent-oro shrink-0" />
                          <span className="font-body text-sm text-nebbia sm:flex-1">{f.label}</span>
                        </label>
                        {disp ? (
                          <div className="flex items-center gap-1.5 sm:gap-1 shrink-0">
                            {LIVELLI.map(l => (
                              <button key={l.id} type="button"
                                onClick={() => setFasi(prev => ({ ...prev, [f.id]: { ...prev[f.id], incluso: true, livello: l.id } }))}
                                className={`font-body text-xs sm:text-[11px] flex-1 sm:flex-none min-h-[40px] sm:min-h-0 px-2 py-2 sm:py-1 border transition-colors ${cfg.livello === l.id ? 'border-oro/50 bg-oro/10 text-oro' : 'border-white/10 text-nebbia/40 hover:text-nebbia'}`}>
                                {l.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="font-body text-xs sm:text-[11px] text-nebbia/25 shrink-0">non prevista</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Aumenti / Riduzioni */}
              <div className="border-t border-white/5 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="section-label mb-3">Aumenti</p>
                  <div className="space-y-2">
                    {AUMENTI.map(a => {
                      const st = aumenti[a.id] ?? { attivo: false }
                      return (
                        <div key={a.id} className="space-y-1">
                          <label className="flex items-start gap-2.5 sm:gap-2 cursor-pointer py-1.5 sm:py-0">
                            <input type="checkbox" checked={!!st.attivo} onChange={() => toggleAumento(a)} className="w-4 h-4 accent-oro mt-0.5 shrink-0" />
                            <span className="font-body text-xs text-nebbia/80 leading-snug">{a.label}
                              <span className="text-nebbia/30"> · {a.riferimento}</span></span>
                          </label>
                          {st.attivo && a.tipo === 'parti' && (
                            <div className="pl-6 flex items-center gap-2">
                              <span className="font-body text-xs sm:text-[11px] text-nebbia/40">Numero parti</span>
                              <input type="number" min="2" max="30" value={st.nParti ?? 2}
                                onChange={e => setNParti(a, e.target.value)}
                                className="w-20 sm:w-16 bg-petrolio border border-white/10 text-nebbia font-body text-xs px-2 py-2 sm:py-1 outline-none focus:border-oro/50" />
                              <span className="font-body text-xs sm:text-[11px] text-oro/70">+{pctAumentoParti(st.nParti ?? 2)}%</span>
                            </div>
                          )}
                          {st.attivo && a.tipo !== 'parti' && (
                            <div className="pl-6 flex items-center gap-2">
                              <input type="number" min="0" max={a.pct} value={st.pct ?? a.pct}
                                onChange={e => setPctAumento(a, e.target.value)}
                                className="w-20 sm:w-16 bg-petrolio border border-white/10 text-nebbia font-body text-xs px-2 py-2 sm:py-1 outline-none focus:border-oro/50" />
                              <span className="font-body text-xs sm:text-[11px] text-nebbia/40">% (max {a.pct})</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="section-label mb-3">Riduzioni</p>
                  <div className="space-y-2">
                    {RIDUZIONI.map(r => {
                      const st = riduzioni[r.id] ?? { attivo: false }
                      return (
                        <div key={r.id} className="space-y-1">
                          <label className="flex items-start gap-2.5 sm:gap-2 cursor-pointer py-1.5 sm:py-0">
                            <input type="checkbox" checked={!!st.attivo} onChange={() => toggleRiduzione(r)} className="w-4 h-4 accent-oro mt-0.5 shrink-0" />
                            <span className="font-body text-xs text-nebbia/80 leading-snug">{r.label}
                              <span className="text-nebbia/30"> · {r.riferimento}</span></span>
                          </label>
                          {st.attivo && (
                            <div className="pl-6 flex items-center gap-2">
                              <input type="number" min="0" max={r.pct} value={st.pct ?? r.pct}
                                onChange={e => setPctRiduzione(r, e.target.value)}
                                className="w-20 sm:w-16 bg-petrolio border border-white/10 text-nebbia font-body text-xs px-2 py-2 sm:py-1 outline-none focus:border-oro/50" />
                              <span className="font-body text-xs sm:text-[11px] text-nebbia/40">% (max {r.pct})</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Opzioni parcella */}
              <div className="border-t border-white/5 pt-4 flex flex-wrap gap-x-4 gap-y-1 sm:gap-4">
                <label className="flex items-center gap-2 cursor-pointer py-1.5 sm:py-0">
                  <input type="checkbox" checked={includiSpeseGenerali} onChange={e => setIncludiSpeseGenerali(e.target.checked)} className="w-4 h-4 accent-oro" />
                  <span className="font-body text-xs text-nebbia/80">Spese generali forfettarie 15%</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer py-1.5 sm:py-0">
                  <input type="checkbox" checked={applicaRitenuta} onChange={e => setApplicaRitenuta(e.target.checked)} className="w-4 h-4 accent-oro" />
                  <span className="font-body text-xs text-nebbia/80">Anteprima con ritenuta 20%</span>
                </label>
              </div>

              {/* Disclaimer */}
              <div className="bg-petrolio/40 border border-white/5 p-3 flex items-start gap-2">
                <Info size={13} className="text-salvia/70 shrink-0 mt-0.5" />
                <p className="font-body text-xs sm:text-[11px] text-nebbia/50 leading-relaxed">{DISCLAIMER}</p>
              </div>
    </>
  )
}
