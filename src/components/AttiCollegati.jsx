// src/components/AttiCollegati.jsx
// Atti dello stesso orientamento collegati a una capofila (05/10/2026).
//   - ordinanze TAR / Consiglio di Stato 2000-2009 raggruppate per esito e motivazione
//     (tabella giurisprudenza_collegate, chiave giurisprudenza_id)
//   - decisioni dell'Arbitro Bancario Finanziario raggruppate per orientamento
//     (tabella prassi_abf_decisioni, chiave prassi_id)
// Lex legge solo la capofila; qui si vedono anche le altre, con il testo e il link alla fonte.

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Layers, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

const PER_PAGINA = 30

function collegioAbf(c) {
    if (!c) return null
    if (/^coordinamento$/i.test(c)) return 'Collegio di coordinamento'
    return /^collegio/i.test(c) ? c : `Collegio di ${c}`
}

const CONFIG = {
    ordinanze: {
        tabella: 'giurisprudenza_collegate',
        chiave: 'giurisprudenza_id',
        colonne: 'id, url_originale, numero, anno, data_deposito, data_decisione, oggetto',
        ordina: 'data_deposito',
        titolo: n => `Stesso orientamento in altre ${n.toLocaleString('it-IT')} ${n === 1 ? 'ordinanza' : 'ordinanze'}`,
        nota: 'Ordinanze della stessa sede con lo stesso esito e la stessa motivazione. Lex cita la capofila, cioè questa.',
        etichetta: r => `Ordinanza n. ${r.numero}/${r.anno}`,
        data: r => r.data_deposito ?? r.data_decisione,
        dettaglio: r => r.oggetto,
        url: r => r.url_originale,
    },
    abf: {
        tabella: 'prassi_abf_decisioni',
        chiave: 'prassi_id',
        colonne: 'id, url_pdf, numero, anno, data_decisione, collegio, oggetti',
        ordina: 'data_decisione',
        titolo: n => `Stesso orientamento in altre ${n.toLocaleString('it-IT')} ${n === 1 ? 'decisione' : 'decisioni'}`,
        nota: "Decisioni dell'Arbitro Bancario Finanziario conformi a questa. Non sono vincolanti: mostrano come l'ABF decide di solito casi simili.",
        etichetta: r => [collegioAbf(r.collegio), `decisione n. ${r.numero}/${r.anno}`].filter(Boolean).join(' — '),
        data: r => r.data_decisione,
        dettaglio: r => (r.oggetti ?? []).join('; '),
        url: r => r.url_pdf,
    },
}

function Riga({ cfg, riga }) {
    const [aperta, setAperta] = useState(false)
    const [testo, setTesto] = useState(null)
    const [caricando, setCaricando] = useState(false)

    async function apri() {
        const nuova = !aperta
        setAperta(nuova)
        if (nuova && testo === null) {
            setCaricando(true)
            const { data } = await supabase.from(cfg.tabella).select('testo').eq('id', riga.id).maybeSingle()
            setTesto(data?.testo ?? '')
            setCaricando(false)
        }
    }

    const data = cfg.data(riga)
    const url = cfg.url(riga)
    return (
        <div className="bg-petrolio/50 border border-white/5">
            <button onClick={apri} className="w-full text-left px-3 py-2.5 flex items-start justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                <div className="min-w-0">
                    <p className="font-body text-sm text-nebbia/80">
                        {cfg.etichetta(riga)}
                        {data && <span className="text-nebbia/35"> · {new Date(data).toLocaleDateString('it-IT')}</span>}
                    </p>
                    {cfg.dettaglio(riga) && (
                        <p className="font-body text-xs text-nebbia/40 mt-0.5 line-clamp-2 break-words">{cfg.dettaglio(riga)}</p>
                    )}
                </div>
                {aperta ? <ChevronUp size={14} className="text-nebbia/40 shrink-0 mt-1" /> : <ChevronDown size={14} className="text-nebbia/40 shrink-0 mt-1" />}
            </button>
            {aperta && (
                <div className="px-3 pb-3 space-y-2">
                    {caricando ? (
                        <span className="inline-block animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                    ) : testo ? (
                        <div className="bg-petrolio/60 border border-white/5 p-3 max-h-[50vh] overflow-y-auto">
                            <p className="font-body text-xs text-nebbia/65 whitespace-pre-line leading-relaxed break-words">{testo}</p>
                        </div>
                    ) : (
                        <p className="font-body text-xs text-nebbia/35">Testo non disponibile: il file sul sito ufficiale non è leggibile.</p>
                    )}
                    {url && (
                        <a href={url} target="_blank" rel="noreferrer"
                            className="font-body text-xs text-salvia hover:text-salvia/80 inline-flex items-center gap-1.5 py-2 -my-2">
                            <ExternalLink size={12} /> Fonte ufficiale
                        </a>
                    )}
                </div>
            )}
        </div>
    )
}

export default function AttiCollegati({ tipo, id }) {
    const cfg = CONFIG[tipo]
    const [righe, setRighe] = useState([])
    const [totale, setTotale] = useState(0)
    const [caricando, setCaricando] = useState(false)

    async function carica(da) {
        setCaricando(true)
        const { data, count } = await supabase
            .from(cfg.tabella)
            .select(cfg.colonne, { count: da === 0 ? 'exact' : undefined })
            .eq(cfg.chiave, id)
            .eq('capofila', false)
            .order(cfg.ordina, { ascending: false, nullsFirst: false })
            .order('anno', { ascending: false })
            .range(da, da + PER_PAGINA - 1)
        setRighe(prec => (da === 0 ? (data ?? []) : [...prec, ...(data ?? [])]))
        if (da === 0) setTotale(count ?? 0)
        setCaricando(false)
    }

    useEffect(() => {
        if (cfg && id) carica(0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipo, id])

    if (!cfg || totale === 0) return null

    return (
        <div className="bg-slate border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-2">
                <Layers size={13} className="text-oro/60" />
                <p className="section-label !m-0">{cfg.titolo(totale)}</p>
            </div>
            <p className="font-body text-xs text-nebbia/40 mb-3 leading-relaxed">{cfg.nota}</p>
            <div className="space-y-1.5">
                {righe.map(r => <Riga key={r.id} cfg={cfg} riga={r} />)}
            </div>
            {righe.length < totale && (
                <button onClick={() => carica(righe.length)} disabled={caricando}
                    className="mt-3 font-body text-xs text-nebbia/50 hover:text-oro transition-colors py-2 disabled:opacity-50">
                    {caricando ? 'Caricamento…' : `Mostra altre (${(totale - righe.length).toLocaleString('it-IT')})`}
                </button>
            )}
        </div>
    )
}
