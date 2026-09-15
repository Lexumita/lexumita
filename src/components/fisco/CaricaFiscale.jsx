// src/components/fisco/CaricaFiscale.jsx
//
// Ingresso della posta fiscale: si trascina (o si fotografa) il documento e
// basta. Per ogni file: caricamento nell'archivio → scheda "Sto leggendo…"
// → lettura automatica → scheda da verificare.

import { useRef, useState } from 'react'
import { Upload, Camera, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { FORMATI_ACCETTATI, verificaSpazio, caricaDocumentoFiscale, analizzaDocumento } from '@/lib/fisco'

export default function CaricaFiscale({ clienteId = null, compatto = false, onCaricato, onLetto }) {
    const { profile } = useAuth()
    const fileRef = useRef(null)
    const fotoRef = useRef(null)
    const [sopra, setSopra] = useState(false)
    const [inCorso, setInCorso] = useState(0)
    const [errori, setErrori] = useState([])

    async function gestisci(lista) {
        const files = Array.from(lista ?? [])
        if (files.length === 0 || !profile?.id) return
        setErrori([])

        const titolareId = profile.titolare_id ?? profile.id
        const blocco = await verificaSpazio(titolareId, profile.id)
        if (blocco) {
            setErrori([blocco])
            return
        }

        setInCorso(n => n + files.length)
        for (const file of files) {
            try {
                const doc = await caricaDocumentoFiscale({ file, titolareId, userId: profile.id, clienteId })
                await onCaricato?.(doc.id)
                // la lettura prosegue da sola: l'esito compare nella scheda
                analizzaDocumento(doc.id).finally(() => {
                    setInCorso(n => n - 1)
                    onLetto?.(doc.id)
                })
            } catch (e) {
                setErrori(prev => [...prev, `${file.name}: ${e.message}`])
                setInCorso(n => n - 1)
            }
        }
    }

    function scegli(e) {
        gestisci(e.target.files)
        e.target.value = ''
    }

    const Icona = inCorso > 0 ? Loader2 : Upload

    return (
        <div>
            <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click() } }}
                onDragOver={e => { e.preventDefault(); setSopra(true) }}
                onDragLeave={() => setSopra(false)}
                onDrop={e => { e.preventDefault(); setSopra(false); gestisci(e.dataTransfer.files) }}
                className={`cursor-pointer text-center border border-dashed transition-colors ${compatto ? 'p-5' : 'p-8 lg:p-10'} ${sopra
                    ? 'border-oro bg-oro/5'
                    : 'border-oro/30 bg-slate hover:border-oro/60'}`}
            >
                <Icona size={compatto ? 22 : 28} className={`mx-auto mb-3 text-oro/80 ${inCorso > 0 ? 'animate-spin' : ''}`} />
                <p className={`font-body text-nebbia ${compatto ? 'text-sm' : 'text-base'}`}>
                    {inCorso > 0
                        ? `Sto leggendo ${inCorso === 1 ? 'il documento' : `${inCorso} documenti`}…`
                        : 'Trascina qui avvisi, cartelle e atti'}
                </p>
                <p className="font-body text-xs text-nebbia/40 mt-1.5">oppure tocca per scegliere un file · PDF o foto</p>
                {!compatto && (
                    <p className="font-body text-xs text-nebbia/30 mt-3 max-w-md mx-auto leading-relaxed">
                        Riconosco il documento, trovo il cliente dal codice fiscale e calcolo la scadenza.
                        Tu controlli e confermi.
                    </p>
                )}
            </div>

            <button
                type="button"
                onClick={() => fotoRef.current?.click()}
                className="lg:hidden mt-2 w-full flex items-center justify-center gap-2 min-h-[44px] border border-white/10 text-nebbia/60 font-body text-sm hover:text-oro hover:border-oro/30 transition-colors"
            >
                <Camera size={15} /> Fotografa il documento
            </button>

            {errori.map((e, i) => (
                <p key={i} className="mt-2 flex items-start gap-2 font-body text-xs text-red-400">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" /> {e}
                </p>
            ))}

            <input ref={fileRef} type="file" multiple accept={FORMATI_ACCETTATI} className="hidden" onChange={scegli} />
            <input ref={fotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={scegli} />
        </div>
    )
}
