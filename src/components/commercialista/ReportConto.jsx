// src/components/commercialista/ReportConto.jsx
//
// Reporting del conto economico (consuntivo, solo movimenti EFFETTIVI):
//   A) Andamento mensile dell'anno — entrate vs uscite
//   B) Composizione per categoria — uscite e entrate
//   C) Confronto pluriennale — entrate/uscite/saldo degli ultimi anni
// + export PDF (documento A4 stampabile). Port da CH, adattato IT (EUR).
// Gli stipendi dei dipendenti (voce uscite su CH) arriveranno con la Fase 4.
//
// Props:
//   clienteId  (string)       - cliente-azienda
//   mandatoId  (string|null)  - movimenti del mandato; altrimenti del cliente
//   anno       (number|null)  - anno iniziale

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, TrendingDown, FileDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtEUR, MESI_ABBR } from '@/lib/cassa'
import { costoPersonaleMeseAttivi, costoPersonaleProRataAnno, bonusDelMese, bonusDellAnnoX } from '@/lib/salariIT'

const sum = (arr) => arr.reduce((t, m) => t + (Number(m.importo) || 0), 0)
const N_ANNI = 4
const MESI_FULL = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

const escHtml = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
const eurP = (n) => '€ ' + Number(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function nomeClienteFmt(c) {
    if (!c) return '—'
    if (c.tipo_soggetto === 'persona_giuridica') return c.ragione_sociale ?? '—'
    return `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'
}

// Documento HTML A4 stampabile (tema chiaro) per l'export PDF del report.
function buildPrintHtml({ anno, intestazione, mesi, usciteCat, entrateCat, perAnno }) {
    const totE = mesi.reduce((t, m) => t + m.entrate, 0)
    const totU = mesi.reduce((t, m) => t + m.uscite, 0)
    const saldo = totE - totU
    const oggi = new Date().toLocaleDateString('it-IT')

    const rowsMesi = mesi.map(m =>
        `<tr><td>${MESI_FULL[m.mo]}</td><td class="r">${m.entrate ? eurP(m.entrate) : '—'}</td><td class="r">${m.uscite ? eurP(m.uscite) : '—'}</td><td class="r ${m.netto < 0 ? 'neg' : ''}">${eurP(m.netto)}</td></tr>`
    ).join('')

    const catRows = (arr) => {
        if (!arr.length) return `<tr><td colspan="3" class="muted">Nessun dato</td></tr>`
        const tot = arr.reduce((t, r) => t + r.val, 0)
        return arr.map(r => `<tr><td>${escHtml(r.cat)}</td><td class="r">${eurP(r.val)}</td><td class="r">${tot ? Math.round(r.val / tot * 100) : 0}%</td></tr>`).join('')
    }

    const rowsAnni = perAnno.map(a =>
        `<tr><td>${a.anno}</td><td class="r">${a.entrate ? eurP(a.entrate) : '—'}</td><td class="r">${a.uscite ? eurP(a.uscite) : '—'}</td><td class="r ${a.saldo < 0 ? 'neg' : ''}">${eurP(a.saldo)}</td></tr>`
    ).join('')

    const sub = [intestazione?.clienteNome, intestazione?.mandatoTitolo].filter(Boolean).map(escHtml).join(' · ')

    return `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Conto economico ${anno}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 11px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #555; font-size: 12px; margin: 0 0 2px; }
  .meta { color: #999; font-size: 10px; margin: 0 0 16px; }
  h2 { font-size: 13px; margin: 20px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  .kpis { display: flex; gap: 12px; margin: 12px 0; }
  .kpi { flex: 1; border: 1px solid #ddd; padding: 10px; }
  .kpi .lbl { color: #888; font-size: 9px; text-transform: uppercase; letter-spacing: .08em; }
  .kpi .val { font-size: 16px; font-weight: 600; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { padding: 4px 8px; border-bottom: 1px solid #eee; text-align: left; }
  th { font-size: 9px; text-transform: uppercase; letter-spacing: .06em; color: #888; }
  td.r, th.r { text-align: right; }
  tfoot td { border-top: 2px solid #ccc; font-weight: 600; }
  .neg { color: #b00020; }
  .pos { color: #2e7d32; }
  .muted { color: #aaa; }
  .cols { display: flex; gap: 20px; }
  .cols > div { flex: 1; }
</style></head><body>
  <h1>Conto economico ${anno}</h1>
  ${sub ? `<p class="sub">${sub}</p>` : ''}
  <p class="meta">Consuntivo generato il ${oggi}</p>
  <div class="kpis">
    <div class="kpi"><div class="lbl">Totale entrate</div><div class="val pos">${eurP(totE)}</div></div>
    <div class="kpi"><div class="lbl">Totale uscite</div><div class="val">${eurP(totU)}</div></div>
    <div class="kpi"><div class="lbl">Saldo</div><div class="val ${saldo < 0 ? 'neg' : 'pos'}">${eurP(saldo)}</div></div>
  </div>
  <h2>Andamento mensile</h2>
  <table><thead><tr><th>Mese</th><th class="r">Entrate</th><th class="r">Uscite</th><th class="r">Netto</th></tr></thead>
  <tbody>${rowsMesi}</tbody>
  <tfoot><tr><td>Totale</td><td class="r">${eurP(totE)}</td><td class="r">${eurP(totU)}</td><td class="r ${saldo < 0 ? 'neg' : ''}">${eurP(saldo)}</td></tr></tfoot></table>
  <div class="cols">
    <div><h2>Uscite per categoria</h2>
      <table><thead><tr><th>Categoria</th><th class="r">Importo</th><th class="r">%</th></tr></thead><tbody>${catRows(usciteCat)}</tbody></table></div>
    <div><h2>Entrate per categoria</h2>
      <table><thead><tr><th>Categoria</th><th class="r">Importo</th><th class="r">%</th></tr></thead><tbody>${catRows(entrateCat)}</tbody></table></div>
  </div>
  <h2>Confronto pluriennale</h2>
  <table><thead><tr><th>Anno</th><th class="r">Entrate</th><th class="r">Uscite</th><th class="r">Saldo</th></tr></thead><tbody>${rowsAnni}</tbody></table>
  <p class="meta" style="margin-top:16px">Report basato sui movimenti effettivi registrati. I dati previsti (budget) non sono inclusi.</p>
</body></html>`
}

export default function ReportConto({ clienteId, mandatoId = null, anno = null, refreshTrigger = 0 }) {
    const annoCorr = new Date().getFullYear()
    const [annoSel, setAnnoSel] = useState(anno ?? annoCorr)
    const [movimenti, setMovimenti] = useState([])
    const [dipendenti, setDipendenti] = useState([])
    const [bonus, setBonus] = useState([])
    const [loading, setLoading] = useState(true)
    const [intestazione, setIntestazione] = useState({ clienteNome: '', mandatoTitolo: null })

    useEffect(() => { carica() }, [clienteId, mandatoId, refreshTrigger])

    async function carica() {
        setLoading(true)
        let q = supabase.from('movimenti').select('*')
        q = mandatoId ? q.eq('mandato_id', mandatoId) : q.eq('cliente_id', clienteId)
        const [{ data: mov }, { data: cli }, { data: mand }, { data: dip }, { data: bon }] = await Promise.all([
            q,
            supabase.from('profiles').select('nome, cognome, ragione_sociale, tipo_soggetto').eq('id', clienteId).maybeSingle(),
            mandatoId
                ? supabase.from('mandati').select('titolo').eq('id', mandatoId).maybeSingle()
                : Promise.resolve({ data: null }),
            supabase.from('clienti_dipendenti').select('*').eq('cliente_id', clienteId),
            supabase.from('dipendenti_bonus').select('id, importo, data_bonus').eq('cliente_id', clienteId),
        ])
        setMovimenti(mov ?? [])
        setDipendenti(dip ?? [])
        setBonus(bon ?? [])
        setIntestazione({ clienteNome: nomeClienteFmt(cli), mandatoTitolo: mand?.titolo ?? null })
        setLoading(false)
    }

    // Solo consuntivo (i previsti sono budget)
    const eff = movimenti.filter(m => (m.stato ?? 'effettivo') === 'effettivo')
    const inAnnoMese = (m, mo, y) => { const d = new Date(m.data); return d.getFullYear() === y && d.getMonth() === mo }
    const annoDi = (m) => new Date(m.data).getFullYear()

    // A) Andamento mensile (uscite = costi movimenti + costo del personale del mese + bonus)
    const mesi = Array.from({ length: 12 }, (_, mo) => {
        const entrate = sum(eff.filter(m => m.tipo === 'entrata' && inAnnoMese(m, mo, annoSel)))
        const costi = sum(eff.filter(m => m.tipo === 'uscita' && inAnnoMese(m, mo, annoSel)))
        const personale = costoPersonaleMeseAttivi(dipendenti, mo, annoSel) + bonusDelMese(bonus, mo, annoSel)
        const uscite = costi + personale
        return { mo, entrate, uscite, netto: entrate - uscite }
    })
    const maxMese = Math.max(1, ...mesi.flatMap(m => [m.entrate, m.uscite]))

    // B) Composizione per categoria
    function raggruppa(tipo) {
        const map = new Map()
        for (const m of eff) {
            if (m.tipo !== tipo || annoDi(m) !== annoSel) continue
            const cat = (m.categoria ?? '').trim() || 'Senza categoria'
            const key = cat.toLowerCase()
            if (!map.has(key)) map.set(key, { cat, val: 0 })
            map.get(key).val += Number(m.importo) || 0
        }
        return [...map.values()]
    }
    const personaleAnnoSel = costoPersonaleProRataAnno(dipendenti, annoSel) + bonusDellAnnoX(bonus, annoSel)
    const usciteCat = raggruppa('uscita')
    if (personaleAnnoSel > 0) usciteCat.push({ cat: 'Costo del personale', val: personaleAnnoSel })
    usciteCat.sort((a, b) => b.val - a.val)
    const entrateCat = raggruppa('entrata').sort((a, b) => b.val - a.val)

    // C) Confronto pluriennale (uscite = costi movimenti + costo del personale)
    const anniReport = Array.from({ length: N_ANNI }, (_, i) => annoCorr - (N_ANNI - 1) + i)
    const perAnno = anniReport.map(y => {
        const entrate = sum(eff.filter(m => m.tipo === 'entrata' && annoDi(m) === y))
        const costi = sum(eff.filter(m => m.tipo === 'uscita' && annoDi(m) === y))
        const uscite = costi + costoPersonaleProRataAnno(dipendenti, y) + bonusDellAnnoX(bonus, y)
        return { anno: y, entrate, uscite, saldo: entrate - uscite }
    })
    const maxAnno = Math.max(1, ...perAnno.flatMap(a => [a.entrate, a.uscite]))

    // Anni disponibili
    const anniSet = new Set([annoCorr + 1, annoCorr, annoCorr - 1, annoCorr - 2, annoSel])
    if (anno) anniSet.add(anno)
    movimenti.forEach(m => { if (m.data) anniSet.add(annoDi(m)) })
    const anniDisponibili = [...anniSet].sort((a, b) => b - a)

    const haDatiAnno = mesi.some(m => m.entrate || m.uscite)

    function esportaPdf() {
        const html = buildPrintHtml({ anno: annoSel, intestazione, mesi, usciteCat, entrateCat, perAnno })
        const iframe = document.createElement('iframe')
        Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
        document.body.appendChild(iframe)
        const doc = iframe.contentWindow.document
        doc.open(); doc.write(html); doc.close()
        iframe.contentWindow.focus()
        setTimeout(() => {
            iframe.contentWindow.print()
            setTimeout(() => { try { document.body.removeChild(iframe) } catch { /* già rimosso */ } }, 1500)
        }, 300)
    }

    return (
        <div className="bg-slate border border-white/5 p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <BarChart3 size={15} className="text-oro/60" />
                    <h2 className="font-display text-lg text-nebbia">Conto economico</h2>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={esportaPdf} disabled={loading} title="Esporta il report in PDF"
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-nebbia/60 font-body text-xs hover:border-oro/30 hover:text-oro transition-colors disabled:opacity-40">
                        <FileDown size={12} /> Esporta PDF
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="font-body text-[10px] text-nebbia/30 uppercase tracking-widest">Anno</span>
                        <select value={annoSel} onChange={e => setAnnoSel(Number(e.target.value))}
                            className="bg-petrolio border border-white/10 text-nebbia font-body text-sm px-2.5 py-1.5 outline-none focus:border-oro/50">
                            {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <>
                    {/* Legenda */}
                    <div className="flex items-center gap-4 -mb-1">
                        <span className="flex items-center gap-1.5 font-body text-[11px] text-nebbia/40"><span className="w-3 h-2 bg-salvia/60 inline-block" /> Entrate</span>
                        <span className="flex items-center gap-1.5 font-body text-[11px] text-nebbia/40"><span className="w-3 h-2 bg-oro/60 inline-block" /> Uscite</span>
                    </div>

                    {/* A) Andamento mensile */}
                    <div>
                        <p className="section-label mb-3">Andamento mensile {annoSel}</p>
                        {!haDatiAnno ? (
                            <div className="bg-petrolio/40 border border-white/5 p-6 text-center font-body text-xs text-nebbia/30">
                                Nessun movimento registrato nel {annoSel}
                            </div>
                        ) : (
                            <>
                                <div className="flex items-stretch gap-1.5 h-36">
                                    {mesi.map(m => (
                                        <div key={m.mo} className="flex-1 flex flex-col items-center">
                                            <div className="flex-1 w-full flex items-end justify-center gap-0.5">
                                                <div className="w-1/2 bg-salvia/55 hover:bg-salvia/80 transition-colors"
                                                    style={{ height: `${(m.entrate / maxMese) * 100}%` }}
                                                    title={`${MESI_ABBR[m.mo]}: entrate € ${fmtEUR(m.entrate)}`} />
                                                <div className="w-1/2 bg-oro/55 hover:bg-oro/80 transition-colors"
                                                    style={{ height: `${(m.uscite / maxMese) * 100}%` }}
                                                    title={`${MESI_ABBR[m.mo]}: uscite € ${fmtEUR(m.uscite)}`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-1.5 mt-1">
                                    {mesi.map(m => <div key={m.mo} className="flex-1 text-center font-body text-[9px] text-nebbia/30 capitalize">{MESI_ABBR[m.mo]}</div>)}
                                </div>
                            </>
                        )}
                    </div>

                    {/* B) Composizione per categoria */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Composizione titolo="Uscite" tipo="uscita" righe={usciteCat} />
                        <Composizione titolo="Entrate" tipo="entrata" righe={entrateCat} />
                    </div>

                    {/* C) Confronto pluriennale */}
                    <div>
                        <p className="section-label mb-3">Confronto pluriennale</p>
                        <div className="flex items-stretch gap-3 h-28 mb-2">
                            {perAnno.map(a => (
                                <div key={a.anno} className="flex-1 flex flex-col items-center">
                                    <div className="flex-1 w-full flex items-end justify-center gap-1">
                                        <div className="w-1/3 bg-salvia/55" style={{ height: `${(a.entrate / maxAnno) * 100}%` }} title={`Entrate € ${fmtEUR(a.entrate)}`} />
                                        <div className="w-1/3 bg-oro/55" style={{ height: `${(a.uscite / maxAnno) * 100}%` }} title={`Uscite € ${fmtEUR(a.uscite)}`} />
                                    </div>
                                    <span className="font-body text-[9px] text-nebbia/30 mt-1">{a.anno}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border border-white/5 overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        {['Anno', 'Entrate', 'Uscite', 'Saldo'].map((h, i) => (
                                            <th key={h} className={`px-3 py-2 font-body text-[10px] font-medium text-nebbia/30 tracking-widest uppercase ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {perAnno.map(a => (
                                        <tr key={a.anno} className="border-b border-white/5 last:border-0">
                                            <td className="px-3 py-2 font-body text-xs text-nebbia/70">{a.anno}</td>
                                            <td className="px-3 py-2 text-right font-body text-xs text-salvia/80">{a.entrate ? `€ ${fmtEUR(a.entrate)}` : '—'}</td>
                                            <td className="px-3 py-2 text-right font-body text-xs text-oro/70">{a.uscite ? `€ ${fmtEUR(a.uscite)}` : '—'}</td>
                                            <td className={`px-3 py-2 text-right font-display text-sm ${a.saldo >= 0 ? 'text-salvia' : 'text-red-400'}`}>€ {fmtEUR(a.saldo)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <p className="font-body text-[11px] text-nebbia/25">
                        Report basato sui movimenti effettivi. I dati previsti (budget) sono nella sezione Budget e scostamenti.
                    </p>
                </>
            )}
        </div>
    )
}

function Composizione({ titolo, tipo, righe }) {
    const eEntrata = tipo === 'entrata'
    const barCls = eEntrata ? 'bg-salvia/50' : 'bg-oro/50'
    const tot = righe.reduce((t, r) => t + r.val, 0)
    const max = Math.max(1, ...righe.map(r => r.val))
    const top = righe.slice(0, 8)

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                {eEntrata ? <TrendingUp size={14} className="text-salvia" /> : <TrendingDown size={14} className="text-oro" />}
                <p className="section-label !m-0">{titolo}</p>
            </div>
            {top.length === 0 ? (
                <div className="bg-petrolio/40 border border-white/5 p-6 text-center font-body text-xs text-nebbia/30">Nessun dato</div>
            ) : (
                <div className="space-y-2.5">
                    {top.map((r, i) => {
                        const pct = tot ? Math.round((r.val / tot) * 100) : 0
                        return (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-1 gap-2">
                                    <span className="font-body text-xs text-nebbia/70 truncate">{r.cat}</span>
                                    <span className="font-body text-xs text-nebbia/40 shrink-0">€ {fmtEUR(r.val)} <span className="text-nebbia/25">({pct}%)</span></span>
                                </div>
                                <div className="h-1.5 bg-white/5">
                                    <div className={`h-full ${barCls}`} style={{ width: `${(r.val / max) * 100}%` }} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
