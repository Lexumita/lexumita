// src/pages/cliente/Documenti.jsx

import { useState, useEffect } from 'react'
import { PageHeader, Badge } from '@/components/shared'
import { Upload, FileText, Eye, Lock, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function ClienteDocumenti() {
    const [documenti, setDocumenti] = useState([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState(null)
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [errore, setErrore] = useState('')

    useEffect(() => {
        async function carica() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setUserId(user.id)
            const { data } = await supabase
                .from('documenti')
                .select('id, nome, dimensione, tipo_mime, caricato_da, visibile_cliente, storage_path, created_at')
                .eq('cliente_id', user.id)
                .eq('visibile_cliente', true)
                .order('created_at', { ascending: false })
            setDocumenti(data ?? [])
            setLoading(false)
        }
        carica()
    }, [])

    async function handleUpload() {
        if (!file || !userId) return
        setUploading(true); setErrore('')
        try {
            const ext = file.name.split('.').pop()
            const fileName = `${Date.now()}.${ext}`
            const path = `${userId}/${fileName}`

            const { error: storageErr } = await supabase.storage
                .from('documenti')
                .upload(path, file)
            if (storageErr) throw new Error(storageErr.message)

            const { error: dbErr } = await supabase.from('documenti').insert({
                cliente_id: userId,
                nome: file.name,
                storage_path: path,
                tipo_mime: file.type,
                dimensione: file.size,
                caricato_da: 'cliente',
                visibile_cliente: true,
            })
            if (dbErr) throw new Error(dbErr.message)

            // Ricarica lista
            const { data } = await supabase
                .from('documenti')
                .select('id, nome, dimensione, tipo_mime, caricato_da, visibile_cliente, storage_path, created_at')
                .eq('cliente_id', userId).eq('visibile_cliente', true)
                .order('created_at', { ascending: false })
            setDocumenti(data ?? [])
            setFile(null)
        } catch (err) { setErrore(err.message) }
        finally { setUploading(false) }
    }

    async function apriDoc(doc) {
        const { data } = await supabase.storage.from('documenti').createSignedUrl(doc.storage_path, 60)
        if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    }

    return (
        <div className="space-y-5">
            <PageHeader label="Portale cliente" title="Documenti" />

            {/* Upload */}
            <div className="bg-slate border border-white/5 p-5">
                <p className="section-label mb-3">Carica un documento</p>
                <div className="flex items-center gap-3">
                    <label className="cursor-pointer flex-1">
                        <div className={`border border-dashed p-4 text-center transition-all ${file ? 'border-salvia/30 bg-salvia/5' : 'border-white/15 hover:border-oro/30'}`}>
                            {file
                                ? <p className="font-body text-sm text-salvia">{file.name}</p>
                                : <div className="flex items-center justify-center gap-2 text-nebbia/30">
                                    <Upload size={16} />
                                    <span className="font-body text-sm">Seleziona un file</span>
                                </div>
                            }
                        </div>
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={e => { setFile(e.target.files?.[0] ?? null); setErrore('') }} />
                    </label>
                    <button onClick={handleUpload} disabled={!file || uploading}
                        className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                        {uploading ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : 'Carica'}
                    </button>
                </div>
                {errore && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-body mt-2 p-2 bg-red-900/10 border border-red-500/20">
                        <AlertCircle size={13} /> {errore}
                    </div>
                )}
                <p className="font-body text-xs text-nebbia/25 mt-2">Formati accettati: PDF, JPG, PNG, DOC, DOCX</p>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="bg-slate border border-white/5">
                    {documenti.length === 0 ? (
                        <div className="py-12 text-center">
                            <FileText size={36} className="text-nebbia/15 mx-auto mb-3" />
                            <p className="font-body text-sm text-nebbia/30">Nessun documento disponibile</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {['Documento', 'Caricato da', 'Data', 'Dimensione', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {documenti.map(d => (
                                    <tr key={d.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <FileText size={14} className="text-nebbia/30 shrink-0" />
                                                <span className="font-body text-sm text-nebbia">{d.nome}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge label={d.caricato_da === 'avvocato' ? 'Studio' : 'Tu'} variant={d.caricato_da === 'avvocato' ? 'oro' : 'salvia'} />
                                        </td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/50 whitespace-nowrap">
                                            {new Date(d.created_at).toLocaleDateString('it-IT')}
                                        </td>
                                        <td className="px-4 py-3 font-body text-xs text-nebbia/40">{formatSize(d.dimensione)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => apriDoc(d)} className="inline-flex items-center gap-1.5 font-body text-xs text-oro hover:text-oro/70 transition-colors">
                                                <Eye size={13} /> Visualizza
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
            <p className="font-body text-xs text-nebbia/25 flex items-center gap-1.5">
                <Lock size={11} /> I documenti sono visualizzabili solo nel portale.
            </p>
        </div>
    )
}