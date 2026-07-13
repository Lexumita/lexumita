// src/components/shared/DocumentiPortale.jsx
//
// Canale di condivisione documenti studio ⇄ cliente (portale).
// Lato studio: la scheda cliente usa questo box per PUBBLICARE un documento nel
// portale del cliente (tabella `documenti`, visibile_cliente = true) e per
// vedere anche i file caricati dal cliente. Il portale cliente legge la stessa
// tabella (cliente_id = auth.uid() AND visibile_cliente).
//
// Storage: bucket 'documenti', path `${clienteId}/<timestamp>.<ext>` così che il
// cliente (auth.uid() = clienteId) possa generare il signed URL sul proprio file.
//
// Props: clienteId (string, uuid del cliente/profilo)

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Upload, FileText, Eye, Trash2, AlertCircle, Share2 } from 'lucide-react'

function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function DocumentiPortale({ clienteId }) {
    const { profile } = useAuth()
    const [documenti, setDocumenti] = useState([])
    const [loading, setLoading] = useState(true)
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => { carica() }, [clienteId])

    async function carica() {
        setLoading(true)
        const { data } = await supabase
            .from('documenti')
            .select('id, nome, dimensione, tipo_mime, caricato_da, visibile_cliente, storage_path, created_at')
            .eq('cliente_id', clienteId)
            .order('created_at', { ascending: false })
        setDocumenti(data ?? [])
        setLoading(false)
    }

    async function condividi() {
        if (!file || !clienteId || !profile?.id) return
        setUploading(true); setErrore('')
        try {
            const ext = file.name.split('.').pop()
            const path = `${clienteId}/${Date.now()}.${ext}`

            const { error: storageErr } = await supabase.storage.from('documenti').upload(path, file)
            if (storageErr) throw new Error(storageErr.message)

            const { error: dbErr } = await supabase.from('documenti').insert({
                cliente_id: clienteId,
                nome: file.name,
                storage_path: path,
                tipo_mime: file.type,
                dimensione: file.size,
                studio_id: profile.studio_id ?? null,
                caricato_da: profile.id,
                visibile_cliente: true,
            })
            if (dbErr) throw new Error(dbErr.message)

            setFile(null)
            await carica()
        } catch (err) { setErrore(err.message) }
        finally { setUploading(false) }
    }

    async function apri(doc) {
        const { data } = await supabase.storage.from('documenti').createSignedUrl(doc.storage_path, 60)
        if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    }

    async function rimuovi(doc) {
        if (!confirm(`Rimuovere "${doc.nome}" dal portale del cliente?`)) return
        await supabase.storage.from('documenti').remove([doc.storage_path])
        await supabase.from('documenti').delete().eq('id', doc.id)
        await carica()
    }

    return (
        <div className="bg-slate border border-white/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
                <Share2 size={15} className="text-salvia" />
                <p className="section-label !mb-0">Documenti condivisi nel portale cliente</p>
            </div>
            <p className="font-body text-xs text-nebbia/40">
                I file qui pubblicati compaiono nel portale del cliente. Vedi anche quelli che il cliente carica per lo studio.
            </p>

            {/* Upload/condivisione */}
            <div className="flex items-center gap-3">
                <label className="cursor-pointer flex-1">
                    <div className={`border border-dashed p-3 text-center transition-all ${file ? 'border-salvia/30 bg-salvia/5' : 'border-white/15 hover:border-oro/30'}`}>
                        {file
                            ? <p className="font-body text-sm text-salvia truncate">{file.name}</p>
                            : <div className="flex items-center justify-center gap-2 text-nebbia/30">
                                <Upload size={15} /><span className="font-body text-sm">Seleziona un file da condividere</span>
                            </div>}
                    </div>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        onChange={e => { setFile(e.target.files?.[0] ?? null); setErrore('') }} />
                </label>
                <button onClick={condividi} disabled={!file || uploading}
                    className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                    {uploading ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full inline-block" /> : 'Condividi'}
                </button>
            </div>
            {errore && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-body p-2 bg-red-900/10 border border-red-500/20">
                    <AlertCircle size={13} /> {errore}
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center py-6">
                    <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : documenti.length === 0 ? (
                <p className="font-body text-sm text-nebbia/25 text-center py-4">Nessun documento condiviso</p>
            ) : (
                <div className="space-y-1.5">
                    {documenti.map(d => {
                        const daCliente = d.caricato_da === clienteId
                        return (
                            <div key={d.id} className="flex items-center gap-3 p-2.5 bg-petrolio/40 border border-white/5">
                                <FileText size={14} className="text-nebbia/30 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-body text-sm text-nebbia truncate">{d.nome}</p>
                                    <p className="font-body text-[11px] text-nebbia/35">
                                        {new Date(d.created_at).toLocaleDateString('it-IT')} · {formatSize(d.dimensione)}
                                    </p>
                                </div>
                                <span className={`font-body text-[10px] px-1.5 py-0.5 border shrink-0 ${daCliente ? 'bg-salvia/10 border-salvia/25 text-salvia/80' : 'bg-oro/10 border-oro/25 text-oro/80'}`}>
                                    {daCliente ? 'Dal cliente' : 'Dallo studio'}
                                </span>
                                <button onClick={() => apri(d)} title="Visualizza"
                                    className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors shrink-0">
                                    <Eye size={13} />
                                </button>
                                <button onClick={() => rimuovi(d)} title="Rimuovi dal portale"
                                    className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
