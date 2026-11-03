// src/components/avvocato/CalcolaParcellaModal.jsx
//
// Calcolatore del compenso avvocato sui parametri forensi (DM 55/2014, tabelle
// 2022 vigenti agg. DM 147/2022). Usato dal wizard fattura: produce le righe
// (una per fase + aumenti/riduzioni + spese generali) e le inserisce nella
// fattura. CPA/IVA/ritenuta restano gestiti dal wizard sull'imponibile.

import { X, Scale, Plus, Replace, AlertTriangle } from 'lucide-react'
import { VERSIONI } from '@/lib/parametriForensi/catalogo'
import { formatImporto } from '@/lib/prezzi'
import { useCalcoloParcella, ParcellaCampi } from './ParcellaCampi'

export default function CalcolaParcellaModal({ onClose, onInserisci }) {
  const calcolo = useCalcoloParcella()
  const { versione, gruppiDisponibili, risultato, applicaRitenuta } = calcolo

  const rp = risultato.riepilogo

  function inserisci(modalita) {
    if (!risultato.ok) return
    onInserisci(risultato.righe, modalita)
    onClose()
  }

  const nessunDato = gruppiDisponibili.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-petrolio/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate border border-white/10 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 min-w-0">
            <Scale size={15} className="text-oro shrink-0" />
            <p className="font-body text-sm font-medium text-nebbia">Calcola parcella — parametri forensi</p>
            <span className="font-body text-xs text-nebbia/30">DM 55/2014 · {VERSIONI.find(v => v.id === versione)?.label}</span>
          </div>
          <button onClick={onClose} className="shrink-0 p-2 -mr-2 text-nebbia/40 hover:text-nebbia transition-colors"><X size={16} /></button>
        </div>

        {nessunDato ? (
          <div className="p-8 text-center">
            <AlertTriangle size={28} className="text-amber-400/70 mx-auto mb-3" />
            <p className="font-body text-sm text-nebbia/70">Nessuna tabella dei parametri è ancora caricata.</p>
            <p className="font-body text-xs text-nebbia/40 mt-1">Le tabelle verranno popolate con i valori validati del DM 147/2022.</p>
          </div>
        ) : (
          <>
            {/* Body scroll */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              <ParcellaCampi calcolo={calcolo} />
            </div>

            {/* Riepilogo + azioni */}
            <div className="border-t border-white/10 px-4 sm:px-5 py-4 shrink-0 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <p className="font-body text-xs sm:text-[10px] text-nebbia/30 uppercase tracking-widest">Compenso</p>
                  <p className="font-body text-sm text-nebbia">{formatImporto(rp?.compenso)}</p>
                </div>
                <div>
                  <p className="font-body text-xs sm:text-[10px] text-nebbia/30 uppercase tracking-widest">Imponibile</p>
                  <p className="font-body text-sm text-nebbia">{formatImporto(rp?.imponibile)}</p>
                </div>
                <div>
                  <p className="font-body text-xs sm:text-[10px] text-nebbia/30 uppercase tracking-widest">Tot. fattura</p>
                  <p className="font-body text-sm font-semibold text-oro">{formatImporto(rp?.totaleLordo)}</p>
                </div>
                <div>
                  <p className="font-body text-xs sm:text-[10px] text-nebbia/30 uppercase tracking-widest">{applicaRitenuta ? 'Netto' : 'Righe'}</p>
                  <p className="font-body text-sm text-salvia">{applicaRitenuta ? `${formatImporto(rp?.totaleNetto)}` : (risultato.righe?.length ?? 0)}</p>
                </div>
              </div>

              {risultato.errore && (
                <p className="font-body text-xs text-amber-400/80 flex items-center gap-1.5"><AlertTriangle size={12} /> {risultato.errore}</p>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap gap-2 sm:justify-end">
                <button onClick={onClose} className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors">Annulla</button>
                <button onClick={() => inserisci('aggiungi')} disabled={!risultato.ok}
                  className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-1.5 px-4 py-3 sm:py-2 border border-oro/30 text-oro font-body text-xs hover:bg-oro/10 transition-colors disabled:opacity-40">
                  <Plus size={14} /> Aggiungi alle righe
                </button>
                <button onClick={() => inserisci('sostituisci')} disabled={!risultato.ok}
                  className="btn-primary w-full sm:w-auto text-xs flex items-center justify-center sm:justify-start gap-1.5 disabled:opacity-40">
                  <Replace size={14} /> Inserisci nella fattura
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
