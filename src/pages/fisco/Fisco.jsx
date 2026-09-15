// src/pages/fisco/Fisco.jsx
//
// Posta fiscale dello studio. Si trascinano avvisi, cartelle e atti: Lexum li
// legge, trova il cliente dal codice fiscale e calcola le scadenze con la
// regola scritta in chiaro. Il professionista controlla e conferma; le
// scadenze vanno in agenda con i promemoria.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Inbox, KeyRound, Loader2, Sparkles } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/shared'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import CaricaFiscale from '@/components/fisco/CaricaFiscale'
import DocumentoFiscale from '@/components/fisco/DocumentoFiscale'
import DelegheFiscali from '@/components/fisco/DelegheFiscali'
import { conStatoVisibile, giorniMancanti, nomeDaProfilo } from '@/lib/fisco'

const DA_FARE = ['in_analisi', 'da_verificare', 'errore']

const FILTRI = [
    { id: 'da_fare', label: 'Da fare', passa: d => DA_FARE.includes(d.stato) },
    { id: 'confermati', label: 'Confermati', passa: d => d.stato === 'confermato' },
    { id: 'tutti', label: 'Tutti', passa: () => true },
]

const VISTE = [
    { id: 'documenti', label: 'Documenti', icon: Inbox },
    { id: 'deleghe', label: 'Deleghe', icon: KeyRound },
]

export default function Fisco() {
    const { profile } = useAuth()
    // ?doc= arriva da "Manda a Fisco" / "In Fisco" dell'Archivio: quella scheda si apre
    const [params] = useSearchParams()
    const docDaAprire = params.get('doc')
    const [vista, setVista] = useState('documenti')
    const [filtro, setFiltro] = useState(docDaAprire ? 'tutti' : 'da_fare')
    const [documenti, setDocumenti] = useState([])
    const [tipi, setTipi] = useState([])
    const [clienti, setClienti] = useState([])
    const [inArrivo, setInArrivo] = useState([])
    const [loading, setLoading] = useState(true)
    const [appena, setAppena] = useState(() => (docDaAprire ? [docDaAprire] : []))

    useEffect(() => {
        if (!docDaAprire || loading) return
        document.getElementById(`fisco-${docDaAprire}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, [docDaAprire, loading])

    const caricaDocumenti = useCallback(async () => {
        const { data } = await supabase
            .from('v_documenti_fiscali')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(300)
        setDocumenti(data ?? [])
    }, [])

    const ricaricaUno = useCallback(async id => {
        const { data } = await supabase.from('v_documenti_fiscali').select('*').eq('id', id).maybeSingle()
        setDocumenti(prev => {
            if (!data) return prev.filter(d => d.id !== id)
            return prev.some(d => d.id === id) ? prev.map(d => (d.id === id ? data : d)) : [data, ...prev]
        })
    }, [])

    useEffect(() => {
        async function avvio() {
            const [, { data: t }, { data: c }, { data: f }] = await Promise.all([
                caricaDocumenti(),
                supabase.from('fisco_tipi_documento')
                    .select('codice, label, azione, ammette_adesione')
                    .eq('attivo', true)
                    .order('ordine'),
                supabase.from('profiles')
                    .select('id, nome, cognome, ragione_sociale, cf, partita_iva')
                    .eq('role', 'cliente'),
                supabase.from('fisco_fonti').select('label').eq('stato', 'in_arrivo').order('ordine'),
            ])
            setTipi(t ?? [])
            setClienti((c ?? []).sort((a, b) => nomeDaProfilo(a).localeCompare(nomeDaProfilo(b), 'it')))
            setInArrivo((f ?? []).map(x => x.label))
            setLoading(false)
        }
        avvio()
    }, [caricaDocumenti])

    // Se la pagina si riapre mentre una lettura è in corso, se ne aspetta l'esito
    const letturaInCorso = documenti.some(d => d.stato === 'in_analisi')
    useEffect(() => {
        if (!letturaInCorso) return
        const giro = setInterval(caricaDocumenti, 4000)
        const basta = setTimeout(() => clearInterval(giro), 5 * 60 * 1000)
        return () => {
            clearInterval(giro)
            clearTimeout(basta)
        }
    }, [letturaInCorso, caricaDocumenti])

    async function caricato(id) {
        setAppena(a => [...a, id])
        setFiltro('da_fare')
        await ricaricaUno(id)
    }

    const visibili = useMemo(() => documenti.map(conStatoVisibile), [documenti])
    const conteggi = useMemo(
        () => Object.fromEntries(FILTRI.map(f => [f.id, visibili.filter(f.passa).length])),
        [visibili]
    )
    const elenco = useMemo(() => {
        const f = FILTRI.find(x => x.id === filtro) ?? FILTRI[0]
        const righe = visibili.filter(f.passa)
        if (filtro === 'confermati') {
            righe.sort((a, b) => (a.scadenza_prossima ?? '9999').localeCompare(b.scadenza_prossima ?? '9999'))
        }
        return righe
    }, [visibili, filtro])

    const daVerificare = visibili.filter(d => d.stato === 'da_verificare' || d.stato === 'errore').length
    const prossime = visibili.filter(d => {
        if (d.stato !== 'confermato') return false
        const g = giorniMancanti(d.scadenza_prossima)
        return g != null && g >= 0 && g <= 30
    }).length

    return (
        <div className="pb-16">
            <PageHeader
                label="Fisco"
                title="Posta fiscale"
                subtitle="Avvisi, cartelle e atti dei tuoi clienti, con le scadenze già calcolate."
            />

            <div className="flex gap-1 border-b border-white/5 mb-6 overflow-x-auto">
                {VISTE.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setVista(id)}
                        className={`flex items-center gap-2 px-4 min-h-[44px] font-body text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${vista === id
                            ? 'border-oro text-oro'
                            : 'border-transparent text-nebbia/50 hover:text-nebbia'}`}
                    >
                        <Icon size={15} /> {label}
                    </button>
                ))}
            </div>

            {vista === 'deleghe' ? (
                <DelegheFiscali clienti={clienti} meId={profile?.id} />
            ) : (
                <div className="space-y-5">
                    <CaricaFiscale onCaricato={caricato} onLetto={ricaricaUno} />

                    {(daVerificare > 0 || prossime > 0) && (
                        <p className="font-body text-sm">
                            {daVerificare > 0 && <span className="text-amber-400">{daVerificare} da verificare</span>}
                            {daVerificare > 0 && prossime > 0 && <span className="text-nebbia/30"> · </span>}
                            {prossime > 0 && (
                                <span className="text-nebbia/60">
                                    {prossime} {prossime === 1 ? 'scadenza' : 'scadenze'} nei prossimi 30 giorni
                                </span>
                            )}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {FILTRI.map(f => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setFiltro(f.id)}
                                className={`px-3 min-h-[36px] font-body text-xs border transition-colors ${filtro === f.id
                                    ? 'border-oro/50 text-oro bg-oro/10'
                                    : 'border-white/10 text-nebbia/50 hover:text-nebbia'}`}
                            >
                                {f.label} ({conteggi[f.id] ?? 0})
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 size={22} className="animate-spin text-oro" />
                        </div>
                    ) : elenco.length === 0 ? (
                        <EmptyState
                            icon={Inbox}
                            title={filtro === 'da_fare' ? 'Niente da fare' : 'Nessun documento'}
                            desc={filtro !== 'da_fare'
                                ? 'Qui trovi i documenti che hai confermato.'
                                : documenti.length === 0
                                    ? 'Trascina qui sopra il primo avviso o la prima cartella: al resto penso io.'
                                    : 'Hai controllato tutti i documenti.'}
                        />
                    ) : (
                        <div className="space-y-2">
                            {elenco.map(d => (
                                <DocumentoFiscale
                                    key={d.id}
                                    doc={d}
                                    tipi={tipi}
                                    clienti={clienti}
                                    meId={profile?.id}
                                    apertoIniziale={appena.includes(d.id)}
                                    onCambiato={ricaricaUno}
                                    onEliminato={id => setDocumenti(prev => prev.filter(x => x.id !== id))}
                                />
                            ))}
                        </div>
                    )}

                    {inArrivo.length > 0 && (
                        <p className="flex items-start gap-2 font-body text-xs text-nebbia/30 pt-2">
                            <Sparkles size={13} className="shrink-0 mt-0.5 text-oro/50" />
                            <span>In arrivo: {inArrivo.join(' · ')}.</span>
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
