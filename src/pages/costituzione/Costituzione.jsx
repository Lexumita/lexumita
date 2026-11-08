// src/pages/costituzione/Costituzione.jsx
//
// 08-11-2026: l'indice della Costituzione, diviso come il testo (Principi fondamentali, Parte I, Parte II,
// Disposizioni transitorie e finali). Ogni articolo ha la sua pagina; gli abrogati restano qui, senza pagina.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { TestataPagina, Apertura, CAMPO } from '@/components/strumenti/Pagina'
import { PERCORSO, AGGIORNATA_AL, META_INDICE, VOCI, gruppi, percorsoDi, nomeDi, anteprima, testoPiano, dataLunga } from '@/lib/costituzione'

const normalizza = (t) => (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// «13», «art 13», «art. 13», «xii»: il numero; altrimenti le parole nel testo e nel nome
function cerca(voci, testo) {
    const q = normalizza(testo).replace(/^(art(icolo)?\.?|disp(osizione)?\.?)\s*/, '').trim()
    if (!q) return null
    if (/^(\d+|[ivxl]+)$/.test(q)) return voci.filter(v => normalizza(v.numero) === q)
    const parole = q.split(/\s+/)
    return voci.filter(v => {
        const t = normalizza(`${nomeDi(v) ?? ''} ${testoPiano(v.commi.join(' '))}`)
        return parole.every(p => t.includes(p))
    })
}

function Voce({ voce }) {
    const nome = nomeDi(voce)
    if (voce.abrogato) {
        return (
            <li className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-3 border-b border-white/5">
                <span className="font-body text-sm text-nebbia/25 w-28 shrink-0">{voce.etichetta}</span>
                <span className="font-body text-sm text-nebbia/25">Abrogato{voce.modifiche[0] ? ` dalla ${voce.modifiche[0].nome.charAt(0).toLowerCase()}${voce.modifiche[0].nome.slice(1)}` : ''}</span>
            </li>
        )
    }
    return (
        <li className="border-b border-white/5">
            <Link to={percorsoDi(voce)} className="group flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-3">
                <span className="font-body text-sm text-oro w-28 shrink-0">{voce.etichetta}</span>
                <span className="min-w-0">
                    {nome && <span className="block font-body text-sm text-nebbia group-hover:text-oro transition-colors">{nome}</span>}
                    <span className={`block font-body text-sm leading-relaxed ${nome ? 'text-nebbia/40' : 'text-nebbia/60 group-hover:text-nebbia'} transition-colors`}>
                        {anteprima(voce, 150)}
                    </span>
                </span>
            </Link>
        </li>
    )
}

export default function Costituzione() {
    const [testo, setTesto] = useState('')
    const trovate = useMemo(() => cerca(VOCI, testo), [testo])

    return (
        <div className="min-h-screen bg-petrolio text-nebbia overflow-x-hidden pt-20">
            <TestataPagina percorso={PERCORSO} titolo={META_INDICE.titolo} descrizione={META_INDICE.descrizione} />
            <Apertura
                etichetta="Costituzione"
                titolo="La Costituzione italiana,"
                evidenza="articolo per articolo."
                testo={`Il testo in vigore della Costituzione della Repubblica italiana, aggiornato all'ultima modifica del ${dataLunga(AGGIORNATA_AL)}. Per ogni articolo: la spiegazione in parole semplici, le modifiche, la fonte ufficiale e le sentenze nella Banca Dati.`}
                garanzie={['Testo in vigore', 'Fonte: Normattiva', 'Gratis, senza registrazione']}
            />

            <section className="max-w-4xl mx-auto px-6 pb-24">
                <label className="relative block mb-10">
                    <span className="sr-only">Cerca un articolo</span>
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                    <input type="search" value={testo} onChange={e => setTesto(e.target.value)}
                        placeholder="Cerca un articolo: «13», «sciopero», «Presidente della Repubblica»…"
                        className={`${CAMPO} pl-9`} />
                </label>

                {trovate ? (
                    trovate.length ? (
                        <ul>{trovate.map(v => <Voce key={v.slug} voce={v} />)}</ul>
                    ) : (
                        <p className="font-body text-sm text-nebbia/40">Nessun articolo contiene tutte queste parole.</p>
                    )
                ) : (
                    gruppi().map((g, i, tutti) => {
                        const prima = tutti[i - 1]
                        const nuovaParte = g.parte?.nome !== prima?.parte?.nome
                        const nuovoTitolo = nuovaParte || g.titolo?.nome !== prima?.titolo?.nome
                        return (
                            <div key={g.chiave} className={nuovaParte && i > 0 ? 'mt-16' : 'mt-8'}>
                                {nuovaParte && (
                                    <h2 className="font-display text-3xl font-light mb-2">
                                        {g.parte?.numero && <span className="text-oro">{g.parte.numero} · </span>}{g.parte?.nome}
                                    </h2>
                                )}
                                {nuovoTitolo && g.titolo && (
                                    <h3 className="font-body text-xs text-nebbia/40 tracking-[0.25em] uppercase mt-6 mb-1">
                                        {g.titolo.numero} · {g.titolo.nome}
                                    </h3>
                                )}
                                {g.sezione && (
                                    <h4 className="font-body text-sm text-salvia mt-4 mb-1">{g.sezione.numero} · {g.sezione.nome}</h4>
                                )}
                                <ul>{g.voci.map(v => <Voce key={v.slug} voce={v} />)}</ul>
                            </div>
                        )
                    })
                )}
            </section>

            <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
                <h2 className="font-display text-3xl font-light mb-4">Dal testo al tuo caso, <span className="text-oro">c'è Lex.</span></h2>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed mb-7">
                    Lex è l'intelligenza artificiale di Lexum per il diritto e il fisco: risponde con le norme e le sentenze collegate, sui tuoi casi e sui tuoi documenti. Con un account gratuito la prima domanda è in omaggio.
                </p>
                <Link to="/registrati" className="inline-flex items-center gap-2 px-6 py-3 bg-oro text-petrolio font-body text-sm font-medium hover:bg-oro/90 transition-colors">
                    Iscriviti gratis <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    )
}
