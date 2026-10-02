// src/pages/admin/Testi.jsx
//
// I testi del sito, modificabili senza passare da VS Code.
// Copia del pannello di Lexum CH, con una sola lingua: l'italiano.
//
// Il gesto è uno: scrivi, premi Salva, la frase è online entro mezzo minuto.
// Non c'è un secondo passaggio di pubblicazione. Ogni frase si può riportare
// al testo del codice o a una delle sue versioni precedenti.
//
// Due schede come su CH: Vetrina (le pagine pubbliche) e Backend (l'area
// riservata). Per ora i testi sono solo quelli della vetrina: la scheda
// Backend si vede ma è spenta, «in arrivo».

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { PageHeader, EmptyState, LoadingSpinner, Badge } from '@/components/shared'
import { supabase } from '@/lib/supabase'
import {
  Search, Save, RotateCcw, RefreshCw, Download, Languages, AlertTriangle,
  Check, Power, Eye, Lock, ChevronRight, FileWarning, History,
} from 'lucide-react'
import { valida, promemoria } from '@/lib/testi/regole'
import {
  salvaFrase, ripristinaFrase, storicoFrase, tornaAllaVersione,
  sincronizzaDalCodice, esportaFile, impostaAttivo,
} from '@/lib/testi/servizio'
import { LINGUA, etichettaNs, rottaAnteprima } from '@/lib/testi/forma'
import { ELENCO_NS } from '@/lib/testi/elenco-ns'

const CHIAVE_BOZZA = 'lexum_testi_bozza'

const AZIONE = {
  modifica: 'modificata', ripristino: 'riportata al codice',
  versione: 'tornata a una versione', sincronizzazione: 'riallineata al codice',
}
const quando = (d) => new Date(d).toLocaleString('it-IT', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

// ─────────────────────────────────────────────────────────────
// Le versioni precedenti di una frase
// ─────────────────────────────────────────────────────────────
function Versioni({ riga, attuale, onTorna, occupato }) {
  const [voci, setVoci] = useState(null)
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    let vivo = true
    storicoFrase(riga.id)
      .then(v => { if (vivo) setVoci(v) })
      .catch(e => { if (vivo) setErrore(e.message) })
    return () => { vivo = false }
  }, [riga.id, riga.it_visto])

  if (errore) return <p className="font-body text-[10px] text-red-400">{errore}</p>
  if (!voci) return <p className="font-body text-[10px] text-nebbia/30">carico le versioni…</p>
  if (voci.length === 0) {
    return <p className="font-body text-[10px] text-nebbia/30">Nessuna modifica dal pannello: è ancora il testo del codice.</p>
  }

  return (
    <div className="border border-white/5 bg-petrolio/40 divide-y divide-white/5">
      {voci.map(v => {
        const corrente = v.valore_dopo === attuale
        return (
          <div key={v.id} className="px-3 py-2 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-body text-[10px] text-nebbia/30 mb-0.5">
                {quando(v.quando)} · {AZIONE[v.azione] ?? v.azione}
              </p>
              <p className="font-body text-xs text-nebbia/70 whitespace-pre-wrap break-words">{v.valore_dopo}</p>
            </div>
            {corrente ? (
              <span className="font-body text-[10px] text-salvia shrink-0 mt-3">online ora</span>
            ) : (
              <button onClick={() => onTorna(v)} disabled={occupato}
                className="shrink-0 mt-2.5 flex items-center gap-1 px-2 py-1 border border-oro/30 font-body text-[10px] text-oro hover:bg-oro/10 disabled:opacity-40">
                <RotateCcw size={9} /> rimetti questa
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Una riga: una frase
// ─────────────────────────────────────────────────────────────
function Riga({ riga, bozza, onBozza, onSalva, onRipristina, onTorna, occupato }) {
  const [storicoAperto, setStoricoAperto] = useState(false)
  const salvato = riga.it ?? ''
  const base = riga.it_file ?? ''
  const valore = bozza !== undefined ? bozza : salvato
  const sporco = valore !== salvato
  const modificato = salvato !== base
  const errori = useMemo(() => valida(riga, valore), [riga, valore])
  const tecnico = riga.tipo === 'enum' || riga.tipo === 'booleano'
  const aiuto = promemoria(riga)
  const righe = Math.min(12, Math.max(1, Math.ceil((valore.length || 1) / 110)))

  return (
    <div className="border-b border-white/5 px-4 py-3 hover:bg-white/[0.015]">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <code className="font-mono text-[10px] text-nebbia/25 break-all">{riga.percorso}</code>
        <div className="flex items-center gap-2 shrink-0">
          {modificato && !sporco && (
            <span className="flex items-center gap-1 font-body text-[10px] text-oro/80">
              <span className="w-1.5 h-1.5 rounded-full bg-oro" /> cambiata dal pannello
            </span>
          )}
          {riga.tipo !== 'testo' && (
            <span className="flex items-center gap-1 font-body text-[10px] text-nebbia/30">
              <Lock size={9} /> valore tecnico
            </span>
          )}
          {riga.array_padre && (
            <span className="font-body text-[10px] text-nebbia/20" title="fa parte di un elenco a lunghezza fissa">
              elenco · voce {riga.array_indice + 1}
            </span>
          )}
        </div>
      </div>

      {aiuto && (
        <p className="font-mono text-[10px] text-salvia/50 mb-2">
          deve restare nel testo: {aiuto}
        </p>
      )}

      {tecnico ? (
        <select
          value={valore}
          disabled={occupato}
          onChange={(e) => onBozza(e.target.value)}
          className="w-full bg-petrolio/60 border border-white/10 px-2 py-1.5 font-mono text-xs text-nebbia/70 focus:border-oro/40 outline-none"
        >
          {(riga.tipo === 'booleano' ? ['true', 'false'] : riga.enum_valori ?? []).map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      ) : (
        <textarea
          value={valore}
          rows={righe}
          disabled={occupato}
          onChange={(e) => onBozza(e.target.value)}
          className={`w-full bg-petrolio/60 border px-2 py-1.5 font-body text-xs leading-relaxed
            text-nebbia resize-y outline-none transition-colors
            ${errori.length ? 'border-red-500/50' : sporco ? 'border-oro/50' : 'border-white/10 focus:border-oro/30'}`}
        />
      )}

      {errori.length > 0 && (
        <p className="mt-1 font-body text-[10px] text-red-400 leading-snug">{errori.join(' · ')}</p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        {sporco && errori.length === 0 && (
          <>
            <button onClick={onSalva} disabled={occupato}
              className="flex items-center gap-1 px-2 py-1 bg-oro/15 border border-oro/30 font-body text-[11px] text-oro hover:bg-oro/25 disabled:opacity-40">
              <Save size={11} /> Salva
            </button>
            <button onClick={() => onBozza(undefined)} disabled={occupato}
              className="font-body text-[11px] text-nebbia/30 hover:text-nebbia/60">
              annulla
            </button>
          </>
        )}
        {!sporco && modificato && (
          <button onClick={onRipristina} disabled={occupato}
            className="flex items-center gap-1 font-body text-[10px] text-nebbia/25 hover:text-nebbia/60">
            <RotateCcw size={9} /> torna al testo del codice
          </button>
        )}
        <button onClick={() => setStoricoAperto(a => !a)}
          className="flex items-center gap-1 font-body text-[10px] text-nebbia/25 hover:text-nebbia/60">
          <History size={9} /> {storicoAperto ? 'chiudi le versioni' : 'versioni precedenti'}
        </button>
      </div>

      {storicoAperto && (
        <div className="mt-2">
          <Versioni riga={riga} attuale={salvato} occupato={occupato}
            onTorna={(v) => onTorna(riga, v)} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// La pagina
// ─────────────────────────────────────────────────────────────
export default function AdminTesti() {
  const gruppo = 'vetrina'
  const [riepilogo, setRiepilogo] = useState([])
  const [stato, setStato] = useState(null)
  const [nsAttivo, setNsAttivo] = useState(null)
  const [righe, setRighe] = useState([])
  const [caricando, setCaricando] = useState(true)
  const [caricandoRighe, setCaricandoRighe] = useState(false)
  const [occupato, setOccupato] = useState(false)
  const [avviso, setAvviso] = useState(null)      // {tipo, testo}
  const [bozze, setBozze] = useState({})
  const [ricerca, setRicerca] = useState('')
  const [risultati, setRisultati] = useState(null)
  const [filtroNs, setFiltroNs] = useState('')
  const [soloCambiate, setSoloCambiate] = useState(false)
  const [avanzamento, setAvanzamento] = useState(null)
  const timerRicerca = useRef(null)
  // Registro di ogni riga incontrata: id -> 'ns.percorso'. Serve all'anteprima,
  // che deve conoscere le bozze anche delle sezioni non più a schermo.
  const registro = useRef({})

  const messaggio = (tipo, testo) => {
    setAvviso({ tipo, testo })
    if (tipo !== 'errore') setTimeout(() => setAvviso(null), 4000)
  }

  const caricaRiepilogo = useCallback(async () => {
    const [{ data: r }, { data: s }] = await Promise.all([
      supabase.rpc('testi_riepilogo'),
      supabase.from('testi_stato').select('*').single(),
    ])
    setRiepilogo(r ?? [])
    setStato(s ?? null)
    setCaricando(false)
  }, [])

  useEffect(() => { caricaRiepilogo() }, [caricaRiepilogo])

  // Le bozze non salvate vivono solo in questo browser: servono all'anteprima.
  useEffect(() => {
    const per = {}
    for (const [id, v] of Object.entries(bozze)) {
      if (v === undefined) continue
      const pieno = registro.current[id]
      if (pieno) (per[LINGUA] ??= {})[pieno] = v
    }
    try { localStorage.setItem(CHIAVE_BOZZA, JSON.stringify(per)) } catch { /* spazio pieno */ }
  }, [bozze])

  async function apriNs(ns) {
    setNsAttivo(ns); setRisultati(null); setRicerca(''); setCaricandoRighe(true)
    const { data, error } = await supabase.rpc('testi_elenco', { p_ns: ns })
    if (error) messaggio('errore', error.message)
    for (const r of data ?? []) registro.current[r.id] = `${ns}.${r.percorso}`
    setRighe(data ?? [])
    setCaricandoRighe(false)
  }

  function cerca(testo) {
    setRicerca(testo)
    clearTimeout(timerRicerca.current)
    if (testo.trim().length < 2) { setRisultati(null); return }
    timerRicerca.current = setTimeout(async () => {
      const { data, error } = await supabase.rpc('testi_cerca', {
        p_testo: testo.trim(), p_gruppo: gruppo, p_limite: 300,
      })
      if (error) return messaggio('errore', error.message)
      setRisultati(data ?? [])
      setNsAttivo(null)
    }, 350)
  }

  const setBozza = (id, v) =>
    setBozze(b => {
      const n = { ...b }
      if (v === undefined) delete n[id]
      else n[id] = v
      return n
    })

  const aggiornaRiga = (id, valore, visto) =>
    setRighe(rs => rs.map(r => r.id === id ? { ...r, it: valore, it_visto: visto } : r))

  async function salva(riga) {
    const v = bozze[riga.id]
    if (v === undefined) return
    setOccupato(true)
    try {
      const visto = await salvaFrase(riga.id, v, riga.it_visto)
      aggiornaRiga(riga.id, v, visto)
      setBozza(riga.id, undefined)
      messaggio('ok', 'Salvato. Online entro mezzo minuto.')
      caricaRiepilogo()
    } catch (e) { messaggio('errore', e.message) }
    finally { setOccupato(false) }
  }

  async function ripristina(riga) {
    setOccupato(true)
    try {
      const { visto, valore } = await ripristinaFrase(riga.id)
      aggiornaRiga(riga.id, valore, visto)
      setBozza(riga.id, undefined)
      messaggio('ok', 'Ripristinato il testo del codice.')
      caricaRiepilogo()
    } catch (e) { messaggio('errore', e.message) }
    finally { setOccupato(false) }
  }

  async function tornaA(riga, versione) {
    setOccupato(true)
    try {
      const { visto, valore } = await tornaAllaVersione(riga.id, versione.id, riga.it_visto)
      aggiornaRiga(riga.id, valore, visto)
      setBozza(riga.id, undefined)
      messaggio('ok', 'Rimessa online la versione scelta.')
      caricaRiepilogo()
    } catch (e) { messaggio('errore', e.message) }
    finally { setOccupato(false) }
  }

  async function sincronizza() {
    setOccupato(true); setAvanzamento({ fatti: 0, su: 1, cosa: 'avvio' })
    try {
      const esito = await sincronizzaDalCodice(ELENCO_NS, (fatti, su, cosa) =>
        setAvanzamento({ fatti, su, cosa }))
      messaggio('ok', `Riallineato al codice: ${esito.nuove} frasi nuove, ` +
        `${esito.base_aggiornata} aggiornate, ${esito.modifiche_tenute} tue modifiche difese, ` +
        `${esito.sparite} non più nel sito.`)
      await caricaRiepilogo()
      if (nsAttivo) apriNs(nsAttivo)
    } catch (e) { messaggio('errore', e.message) }
    finally { setOccupato(false); setAvanzamento(null) }
  }

  async function scarica() {
    setOccupato(true)
    try {
      const n = await esportaFile()
      messaggio('ok', `Scaricato lexum-testi.json con ${n} sezioni. ` +
        'Riversalo nei file con: node scripts/testi-applica.mjs ~/Downloads/lexum-testi.json')
      caricaRiepilogo()
    } catch (e) { messaggio('errore', e.message) }
    finally { setOccupato(false) }
  }

  async function commutaAttivo() {
    const nuovo = !stato?.attivo
    if (!nuovo && !window.confirm(
      'Spegnere i testi del pannello?\n\nIl sito torna esattamente ai testi ' +
      'dell\'ultimo deploy entro mezzo minuto. Le tue modifiche restano salvate ' +
      'qui e si riaccendono quando vuoi.')) return
    setOccupato(true)
    try {
      await impostaAttivo(nuovo)
      messaggio('ok', nuovo ? 'Testi del pannello riaccesi.' : 'Sito riportato ai testi del deploy.')
      caricaRiepilogo()
    } catch (e) { messaggio('errore', e.message) }
    finally { setOccupato(false) }
  }

  const nsDelGruppo = riepilogo.filter(r => r.gruppo === gruppo)
  const nsVisibili = nsDelGruppo.filter(r =>
    (!filtroNs || r.etichetta.toLowerCase().includes(filtroNs.toLowerCase()) ||
      r.ns.includes(filtroNs.toLowerCase())) &&
    (!soloCambiate || Number(r.n_modificate) > 0))

  const totali = nsDelGruppo.reduce((a, r) => ({
    frasi: a.frasi + Number(r.n_frasi),
    modificate: a.modificate + Number(r.n_modificate),
  }), { frasi: 0, modificate: 0 })

  const giorniDaExport = stato?.ultimo_export
    ? Math.floor((Date.now() - new Date(stato.ultimo_export).getTime()) / 86400000)
    : null
  const vuoto = riepilogo.length === 0

  if (caricando) return <LoadingSpinner fullPage />

  return (
    <div className="space-y-5">
      <PageHeader
        label="Admin"
        title="Testi"
        subtitle="Le parole del sito. Salvi e vanno online."
        action={
          <div className="flex items-center gap-2">
            <button onClick={sincronizza} disabled={occupato}
              className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-40">
              <RefreshCw size={14} className={occupato && avanzamento ? 'animate-spin' : ''} />
              Rileggi dal codice
            </button>
            <button onClick={scarica} disabled={occupato || vuoto}
              className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-40">
              <Download size={14} /> Scarica i file
            </button>
          </div>
        }
      />

      {avviso && (
        <div className={`p-3 border font-body text-xs flex items-start gap-2 ${
          avviso.tipo === 'errore'
            ? 'bg-red-900/10 border-red-500/25 text-red-300'
            : 'bg-salvia/10 border-salvia/25 text-salvia'}`}>
          {avviso.tipo === 'errore' ? <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                    : <Check size={14} className="shrink-0 mt-0.5" />}
          <span>{avviso.testo}</span>
        </div>
      )}

      {avanzamento && (
        <div className="p-3 bg-slate border border-oro/20">
          <p className="font-body text-xs text-nebbia/60 mb-2">
            {avanzamento.cosa} — {avanzamento.fatti} di {avanzamento.su}
          </p>
          <div className="h-1 bg-white/5">
            <div className="h-full bg-oro transition-all"
                 style={{ width: `${(avanzamento.fatti / Math.max(1, avanzamento.su)) * 100}%` }} />
          </div>
        </div>
      )}

      {vuoto ? (
        <EmptyState
          icon={Languages}
          title="Il catalogo è vuoto"
          desc="Premi «Rileggi dal codice»: il pannello legge i testi che questo deploy sta già servendo e li porta qui. Nessun testo viene cambiato."
        />
      ) : (
        <>
          {/* Schede: per ora solo la vetrina */}
          <div className="flex items-center gap-1 border-b border-white/5">
            <span className="px-4 py-2.5 font-body text-sm border-b-2 -mb-px border-oro text-oro">
              Vetrina
              <span className="ml-2 font-body text-[10px] text-nebbia/25">le pagine pubbliche</span>
            </span>
            <span className="px-4 py-2.5 font-body text-sm border-b-2 -mb-px border-transparent text-nebbia/20 cursor-default"
              title="l'area riservata passerà ai file di traduzione in una fase successiva">
              Backend
              <span className="ml-2 font-body text-[10px] text-nebbia/20">in arrivo</span>
            </span>
          </div>

          {/* Ricerca + stato */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/25" />
              <input
                value={ricerca}
                onChange={(e) => cerca(e.target.value)}
                placeholder="Dove compare… (cerca una frase)"
                className="w-full bg-slate border border-white/10 pl-9 pr-3 py-2.5 font-body text-sm text-nebbia placeholder:text-nebbia/25 focus:border-oro/40 outline-none"
              />
            </div>
            <div className="flex items-center gap-3 font-body text-xs text-nebbia/40">
              <span>{totali.frasi} frasi</span>
              {totali.modificate > 0 && <span className="text-oro">{totali.modificate} cambiate</span>}
            </div>
          </div>

          {(giorniDaExport === null || giorniDaExport > 14) && totali.modificate > 0 && (
            <div className="p-3 bg-amber-900/10 border border-amber-500/20 flex items-start gap-2">
              <FileWarning size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="font-body text-xs text-amber-200/80 leading-relaxed">
                I file del repo non vengono riallineati da {giorniDaExport === null ? 'sempre' : `${giorniDaExport} giorni`}.
                Sono loro che Google legge e che si vedono se il database non risponde: ogni tanto premi
                «Scarica i file» e riversali nel progetto.
              </p>
            </div>
          )}

          {stato && !stato.attivo && (
            <div className="p-3 bg-red-900/10 border border-red-500/25 flex items-center justify-between gap-3">
              <p className="font-body text-xs text-red-300">
                I testi del pannello sono <strong>spenti</strong>: il sito mostra quelli dell'ultimo deploy.
              </p>
              <button onClick={commutaAttivo} disabled={occupato}
                className="btn-secondary text-xs flex items-center gap-1.5 shrink-0">
                <Power size={12} /> Riaccendi
              </button>
            </div>
          )}

          <div className="grid lg:grid-cols-[240px_1fr] gap-5 items-start">
            {/* Barra laterale */}
            <div className="bg-slate border border-white/5">
              <div className="p-2 border-b border-white/5 space-y-2">
                <input
                  value={filtroNs}
                  onChange={(e) => setFiltroNs(e.target.value)}
                  placeholder="filtra sezioni…"
                  className="w-full bg-petrolio/60 border border-white/10 px-2 py-1.5 font-body text-xs text-nebbia placeholder:text-nebbia/25 focus:border-oro/30 outline-none"
                />
                <label className="flex items-center gap-2 font-body text-[11px] text-nebbia/40 cursor-pointer px-1">
                  <input type="checkbox" checked={soloCambiate}
                    onChange={(e) => setSoloCambiate(e.target.checked)} className="accent-oro" />
                  solo quelle con frasi cambiate
                </label>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {nsVisibili.map(r => (
                  <button key={r.ns} onClick={() => apriNs(r.ns)}
                    className={`w-full text-left px-3 py-2 border-b border-white/[0.03] transition-colors flex items-center gap-2 ${
                      nsAttivo === r.ns ? 'bg-oro/10 text-oro' : 'text-nebbia/60 hover:bg-white/[0.03]'}`}>
                    <span className="flex-1 min-w-0 font-body text-xs truncate">{r.etichetta}</span>
                    {Number(r.n_modificate) > 0 &&
                      <span className="w-1.5 h-1.5 rounded-full bg-oro shrink-0" title={`${r.n_modificate} cambiate`} />}
                    <ChevronRight size={12} className="shrink-0 opacity-30" />
                  </button>
                ))}
                {nsVisibili.length === 0 && (
                  <p className="p-4 font-body text-xs text-nebbia/25">Nessuna sezione.</p>
                )}
              </div>
            </div>

            {/* Contenuto */}
            <div className="bg-slate border border-white/5 min-h-[50vh]">
              {risultati ? (
                <>
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <p className="font-body text-xs text-nebbia/50">
                      {risultati.length} risultati per «{ricerca}»
                      {risultati.length === 300 && ' (mostro i primi 300)'}
                    </p>
                  </div>
                  {risultati.length === 0 ? (
                    <EmptyState icon={Search} title="Nessuna frase trovata"
                      desc="Prova con una parola più corta." />
                  ) : risultati.map(r => (
                    <button key={r.id} onClick={() => apriNs(r.ns)}
                      className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/[0.02]">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-body text-[11px] text-oro/70">{r.etichetta}</span>
                        <code className="font-mono text-[10px] text-nebbia/20 break-all">{r.percorso}</code>
                      </div>
                      <p className="font-body text-xs text-nebbia/70 line-clamp-2">{r.it}</p>
                    </button>
                  ))}
                </>
              ) : !nsAttivo ? (
                <EmptyState icon={Languages} title="Scegli una sezione"
                  desc="A sinistra le sezioni del sito. Oppure cerca direttamente la frase che vuoi cambiare." />
              ) : caricandoRighe ? (
                <div className="flex items-center justify-center py-20">
                  <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-light text-nebbia truncate">
                        {etichettaNs(nsAttivo)}
                      </p>
                      <code className="font-mono text-[10px] text-nebbia/20">{nsAttivo}</code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {rottaAnteprima(nsAttivo) && (
                        <a href={rottaAnteprima(nsAttivo)} target="_blank" rel="noreferrer"
                          title="apre la pagina vera con le modifiche non ancora salvate, solo in questo browser"
                          className="btn-secondary text-xs flex items-center gap-1.5">
                          <Eye size={12} /> Anteprima
                        </a>
                      )}
                      <Badge label={`${righe.length} frasi`} variant="gray" />
                    </div>
                  </div>
                  {righe.map(r => (
                    <Riga key={r.id} riga={r} bozza={bozze[r.id]}
                      onBozza={(v) => setBozza(r.id, v)}
                      onSalva={() => salva(r)} onRipristina={() => ripristina(r)}
                      onTorna={tornaA} occupato={occupato} />
                  ))}
                </>
              )}
            </div>
          </div>

          {stato?.attivo && (
            <div className="flex justify-end">
              <button onClick={commutaAttivo} disabled={occupato}
                className="flex items-center gap-1.5 font-body text-[11px] text-nebbia/25 hover:text-red-400">
                <Power size={11} /> riporta il sito ai testi dell'ultimo deploy
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
