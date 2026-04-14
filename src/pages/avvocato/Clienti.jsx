// src/pages/avvocato/Clienti.jsx

import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { PageHeader, BackButton, Badge, InputField, TextareaField, EmptyState } from '@/components/shared'
import {
  Plus, Search, Upload, Send, Lock, FileText, MessageSquare,
  CreditCard, StickyNote, User, FolderOpen, ArrowRight, Sparkles,
  ChevronUp, ChevronDown, ArrowUpDown, Edit2, Check, X,
  Calendar, Clock, AlertCircle, CheckCircle, Download, Trash2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────
const STATI_PRATICA = {
  aperta: { label: 'Aperta', variant: 'salvia' },
  chiusa: { label: 'Chiusa', variant: 'gray' },
}

const STATI_FATTURA = {
  in_attesa: { label: 'In attesa', variant: 'warning' },
  pagata: { label: 'Pagata', variant: 'salvia' },
  scaduta: { label: 'Scaduta', variant: 'red' },
  annullata: { label: 'Annullata', variant: 'gray' },
}

const TABS = [
  { id: 'panoramica', label: 'Panoramica', icon: User },
  { id: 'pratiche', label: 'Pratiche', icon: FolderOpen },
  { id: 'documenti', label: 'Documenti', icon: FileText },
  { id: 'comunicazioni', label: 'Comunicazioni', icon: MessageSquare },
  { id: 'note_interne', label: 'Note interne', icon: Lock },
  { id: 'pagamenti', label: 'Pagamenti', icon: CreditCard },
]

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function SortTh({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field
  return (
    <th className="px-4 py-3 text-left">
      <button onClick={() => onSort(field)}
        className="flex items-center gap-1.5 font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase hover:text-oro transition-colors group">
        {label}
        <span className="text-nebbia/20 group-hover:text-oro/60">
          {active ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={11} />}
        </span>
      </button>
    </th>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB DOCUMENTI
// ─────────────────────────────────────────────────────────────
function TabDocumenti({ clienteId }) {
  const [documenti, setDocumenti] = useState([])
  const [pratiche, setPratiche] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [file, setFile] = useState(null)
  const [praticaId, setPraticaId] = useState('')
  const [visibileCliente, setVisibileCliente] = useState(true)
  const [errore, setErrore] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => { caricaTutto() }, [clienteId])

  async function caricaTutto() {
    setLoading(true)
    const [{ data: docs }, { data: prat }] = await Promise.all([
      supabase.from('documenti').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }),
      supabase.from('pratiche').select('id, titolo').eq('cliente_id', clienteId).order('created_at', { ascending: false }),
    ])
    setDocumenti(docs ?? [])
    setPratiche(prat ?? [])
    setLoading(false)
  }

  async function handleUpload() {
    if (!file) return setErrore('Seleziona un file')
    setErrore('')
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const storagePath = `${clienteId}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('documenti').upload(storagePath, file, { contentType: file.type })
      if (upErr) throw new Error(upErr.message)
      const { error: dbErr } = await supabase.from('documenti').insert({
        nome: file.name, storage_path: storagePath, tipo_mime: file.type,
        dimensione: file.size, cliente_id: clienteId, pratica_id: praticaId || null,
        caricato_da: user.id, visibile_cliente: visibileCliente,
      })
      if (dbErr) throw new Error(dbErr.message)
      setFile(null); setPraticaId(''); setVisibileCliente(true); setShowForm(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await caricaTutto()
    } catch (err) {
      setErrore(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function scarica(doc) {
    const { data } = await supabase.storage.from('documenti').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function elimina(doc) {
    if (!confirm(`Eliminare "${doc.nome}"?`)) return
    await supabase.storage.from('documenti').remove([doc.storage_path])
    await supabase.from('documenti').delete().eq('id', doc.id)
    setDocumenti(prev => prev.filter(d => d.id !== doc.id))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="font-body text-sm text-nebbia/40">{documenti.length} {documenti.length === 1 ? 'documento' : 'documenti'}</p>
        <a
          href={`/archivio?cliente_id=${clienteId}`}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Upload size={14} /> Carica in archivio
        </a>
      </div>

      {showForm && (
        <div className="bg-slate border border-oro/20 p-5 space-y-4">
          <p className="section-label">Carica nuovo documento</p>
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">File *</label>
            <input ref={fileInputRef} type="file" onChange={e => setFile(e.target.files[0] ?? null)}
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 file:mr-4 file:py-1 file:px-3 file:border-0 file:bg-oro/20 file:text-oro file:font-body file:text-xs file:cursor-pointer" />
            {file && <p className="font-body text-xs text-nebbia/40 mt-1">{file.name} · {formatSize(file.size)}</p>}
          </div>
          {pratiche.length > 0 && (
            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Collega a pratica <span className="text-nebbia/25 normal-case tracking-normal">— opzionale</span></label>
              <select value={praticaId} onChange={e => setPraticaId(e.target.value)}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                <option value="">Nessuna pratica</option>
                {pratiche.map(p => <option key={p.id} value={p.id}>{p.titolo}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-3 mt-1">
            <button type="button" onClick={() => setVisibileCliente(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative shrink-0 overflow-hidden ${visibileCliente ? 'bg-salvia' : 'bg-white/10'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${visibileCliente ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="font-body text-sm text-nebbia/60">Visibile al cliente</span>
          </div>
          {errore && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20">
              <AlertCircle size={14} /> {errore}
            </div>
          )}
          <button onClick={handleUpload} disabled={uploading || !file} className="btn-primary text-sm flex items-center gap-2">
            {uploading ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Upload size={14} /> Carica</>}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
      ) : documenti.length === 0 ? (
        <EmptyState icon={FileText} title="Nessun documento" desc="Carica il primo documento per questo cliente" />
      ) : (
        <div className="bg-slate border border-white/5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Nome file', 'Pratica', 'Dimensione', 'Visibile', 'Caricato il', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documenti.map(doc => (
                <tr key={doc.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-oro/60 shrink-0" />
                      <span className="font-body text-sm text-nebbia truncate max-w-xs">{doc.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-nebbia/40">{pratiche.find(p => p.id === doc.pratica_id)?.titolo ?? '—'}</td>
                  <td className="px-4 py-3 font-body text-xs text-nebbia/40">{formatSize(doc.dimensione)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-body text-xs px-2 py-0.5 border ${doc.visibile_cliente ? 'border-salvia/25 text-salvia bg-salvia/5' : 'border-white/10 text-nebbia/30'}`}>
                      {doc.visibile_cliente ? 'Sì' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{new Date(doc.created_at).toLocaleDateString('it-IT')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => scarica(doc)} className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors"><Download size={13} /></button>
                      <button onClick={() => elimina(doc)} className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB NOTE INTERNE
// ─────────────────────────────────────────────────────────────
function TabNoteInterne({ clienteId }) {
  const [noteList, setNoteList] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuovaNota, setNuovaNota] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [errore, setErrore] = useState('')

  useEffect(() => { caricaNote() }, [clienteId])

  async function caricaNote() {
    setLoading(true)
    const { data } = await supabase.from('note_interne')
      .select('id, testo, created_at, autore:autore_id(nome, cognome)')
      .eq('cliente_id', clienteId).order('created_at', { ascending: false })
    setNoteList(data ?? [])
    setLoading(false)
  }

  async function aggiungiNota() {
    if (!nuovaNota.trim()) return
    setErrore(''); setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('note_interne')
        .insert({ cliente_id: clienteId, autore_id: user.id, testo: nuovaNota.trim() })
        .select('id, testo, created_at, autore:autore_id(nome, cognome)').single()
      if (error) throw new Error(error.message)
      setNoteList(prev => [data, ...prev]); setNuovaNota('')
    } catch (err) { setErrore(err.message) } finally { setSalvando(false) }
  }

  async function salvaNota(id) {
    if (!editVal.trim()) return
    await supabase.from('note_interne').update({ testo: editVal.trim() }).eq('id', id)
    setNoteList(prev => prev.map(n => n.id === id ? { ...n, testo: editVal.trim() } : n))
    setEditingId(null)
  }

  async function eliminaNota(id) {
    if (!confirm('Eliminare questa nota?')) return
    await supabase.from('note_interne').delete().eq('id', id)
    setNoteList(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-4 bg-amber-900/10 border border-amber-500/20">
        <Lock size={14} className="text-amber-400 shrink-0" />
        <p className="font-body text-xs text-amber-400">Queste note sono visibili solo a te e agli amministratori.</p>
      </div>
      <div className="bg-slate border border-white/5 p-5">
        <p className="section-label mb-3">Aggiungi nota</p>
        <textarea rows={4} value={nuovaNota} onChange={e => setNuovaNota(e.target.value)}
          placeholder="Strategia difensiva, punti critici, promemoria interni..."
          className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
        {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20 mt-3"><AlertCircle size={14} /> {errore}</div>}
        <button onClick={aggiungiNota} disabled={salvando || !nuovaNota.trim()} className="btn-primary text-sm mt-3 flex items-center gap-2">
          {salvando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : <><Plus size={14} /> Aggiungi nota</>}
        </button>
      </div>
      <div className="bg-slate border border-white/5 p-5">
        <p className="section-label mb-4">Storico note</p>
        {loading ? <div className="flex items-center justify-center py-8"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
          : noteList.length === 0 ? <EmptyState icon={StickyNote} title="Nessuna nota salvata" />
            : (
              <div className="space-y-3">
                {noteList.map(n => (
                  <div key={n.id} className="border border-white/5 p-4 group">
                    {editingId === n.id ? (
                      <div className="space-y-2">
                        <textarea rows={3} value={editVal} onChange={e => setEditVal(e.target.value)}
                          className="w-full bg-petrolio border border-oro/30 text-nebbia font-body text-sm px-3 py-2 outline-none resize-none focus:border-oro/50" />
                        <div className="flex gap-2">
                          <button onClick={() => salvaNota(n.id)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"><Check size={12} /> Salva</button>
                          <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3 py-1.5">Annulla</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-body text-sm text-nebbia/70 leading-relaxed">{n.testo}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <Clock size={11} className="text-nebbia/25" />
                            <span className="font-body text-xs text-nebbia/30">{n.autore?.nome} {n.autore?.cognome} · {new Date(n.created_at).toLocaleString('it-IT')}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingId(n.id); setEditVal(n.testo) }} className="text-nebbia/30 hover:text-oro p-1 transition-colors"><Edit2 size={12} /></button>
                            <button onClick={() => eliminaNota(n.id)} className="text-nebbia/30 hover:text-red-400 p-1 transition-colors"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB PAGAMENTI
// ─────────────────────────────────────────────────────────────
function TabPagamenti({ clienteId, avvocatoId }) {
  const [fatture, setFatture] = useState([])
  const [pratiche, setPratiche] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState('')
  const [form, setForm] = useState({
    numero: '', importo: '', descrizione: '', pratica_id: '', stato: 'in_attesa',
    data_emissione: new Date().toISOString().slice(0, 10), data_scadenza: '',
  })
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  useEffect(() => { caricaTutto() }, [clienteId])

  async function caricaTutto() {
    setLoading(true)
    const [{ data: fatt }, { data: prat }] = await Promise.all([
      supabase.from('fatture').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }),
      supabase.from('pratiche').select('id, titolo').eq('cliente_id', clienteId),
    ])
    setFatture(fatt ?? []); setPratiche(prat ?? [])
    const anno = new Date().getFullYear()
    setForm(p => ({ ...p, numero: `F-${anno}-${String((fatt?.length ?? 0) + 1).padStart(3, '0')}` }))
    setLoading(false)
  }

  async function handleSalva(e) {
    e.preventDefault(); setErrore('')
    if (!form.importo || isNaN(parseFloat(form.importo))) return setErrore('Inserisci un importo valido')
    if (!form.numero.trim()) return setErrore('Il numero fattura è obbligatorio')
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('fatture').insert({
        numero: form.numero.trim(), cliente_id: clienteId,
        avvocato_id: avvocatoId ?? user.id,
        pratica_id: form.pratica_id || null,
        importo: parseFloat(form.importo),
        descrizione: form.descrizione.trim() || null,
        stato: form.stato, data_emissione: form.data_emissione,
        data_scadenza: form.data_scadenza || null,
      }).select().single()
      if (error) throw new Error(error.message)
      setFatture(prev => [data, ...prev]); setShowForm(false)
    } catch (err) { setErrore(err.message) } finally { setSalvando(false) }
  }

  async function segnaComePagata(id) {
    const oggi = new Date().toISOString().slice(0, 10)
    await supabase.from('fatture').update({ stato: 'pagata', data_pagamento: oggi }).eq('id', id)
    setFatture(prev => prev.map(f => f.id === id ? { ...f, stato: 'pagata', data_pagamento: oggi } : f))
  }

  const totaleAperto = fatture.filter(f => ['in_attesa', 'scaduta'].includes(f.stato)).reduce((a, f) => a + parseFloat(f.importo ?? 0), 0)
  const totalePagato = fatture.filter(f => f.stato === 'pagata').reduce((a, f) => a + parseFloat(f.importo ?? 0), 0)

  return (
    <div className="space-y-4">
      {fatture.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate border border-white/5 p-4">
            <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Da incassare</p>
            <p className="font-display text-2xl font-semibold text-oro">€ {totaleAperto.toFixed(2)}</p>
          </div>
          <div className="bg-slate border border-white/5 p-4">
            <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Incassato</p>
            <p className="font-display text-2xl font-semibold text-salvia">€ {totalePagato.toFixed(2)}</p>
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <button onClick={() => { setShowForm(v => !v); setErrore('') }} className="btn-primary text-sm flex items-center gap-2">
          <Plus size={14} />{showForm ? 'Annulla' : 'Nuova fattura'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleSalva} className="bg-slate border border-oro/20 p-5 space-y-4">
          <p className="section-label">Nuova fattura</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Numero *</label>
              <input {...f('numero')} className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50" />
            </div>
            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Importo (€) *</label>
              <input type="number" step="0.01" min="0" placeholder="0.00" {...f('importo')}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
            </div>
          </div>
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Descrizione</label>
            <input placeholder="Es. Consulenza legale — Ottobre 2024" {...f('descrizione')}
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
          </div>
          {pratiche.length > 0 && (
            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Pratica collegata <span className="text-nebbia/25 normal-case tracking-normal">— opzionale</span></label>
              <select value={form.pratica_id} onChange={e => setForm(p => ({ ...p, pratica_id: e.target.value }))}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
                <option value="">Nessuna pratica</option>
                {pratiche.map(p => <option key={p.id} value={p.id}>{p.titolo}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Data emissione</label>
              <input type="date" {...f('data_emissione')} className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50" />
            </div>
            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Data scadenza <span className="text-nebbia/25 normal-case tracking-normal">— opzionale</span></label>
              <input type="date" {...f('data_scadenza')} className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50" />
            </div>
          </div>
          {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm flex-1">Annulla</button>
            <button type="submit" disabled={salvando} className="btn-primary text-sm flex-1 justify-center">
              {salvando ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : 'Crea fattura'}
            </button>
          </div>
        </form>
      )}
      {loading ? <div className="flex items-center justify-center py-12"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
        : fatture.length === 0 ? <EmptyState icon={CreditCard} title="Nessuna fattura" desc="Crea la prima fattura per questo cliente" />
          : (
            <div className="bg-slate border border-white/5 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Numero', 'Importo', 'Descrizione', 'Emessa il', 'Scadenza', 'Stato', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fatture.map(fatt => {
                    const sc = STATI_FATTURA[fatt.stato] ?? STATI_FATTURA.in_attesa
                    return (
                      <tr key={fatt.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                        <td className="px-4 py-3 font-body text-xs text-nebbia/60 font-medium">{fatt.numero}</td>
                        <td className="px-4 py-3 font-body text-sm font-semibold text-oro">€ {parseFloat(fatt.importo).toFixed(2)}</td>
                        <td className="px-4 py-3 font-body text-xs text-nebbia/50 max-w-xs truncate">{fatt.descrizione ?? '—'}</td>
                        <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{new Date(fatt.data_emissione).toLocaleDateString('it-IT')}</td>
                        <td className="px-4 py-3 font-body text-xs text-nebbia/40 whitespace-nowrap">{fatt.data_scadenza ? new Date(fatt.data_scadenza).toLocaleDateString('it-IT') : '—'}</td>
                        <td className="px-4 py-3"><Badge label={sc.label} variant={sc.variant} /></td>
                        <td className="px-4 py-3 text-right">
                          {fatt.stato === 'in_attesa' && (
                            <button onClick={() => segnaComePagata(fatt.id)} className="font-body text-xs text-salvia hover:text-salvia/70 transition-colors whitespace-nowrap">Segna pagata</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB COMUNICAZIONI
// ─────────────────────────────────────────────────────────────
function TabComunicazioni({ clienteId }) {
  const [tickets, setTickets] = useState([])
  const [ticketAperto, setTicketAperto] = useState(null)
  const [messaggi, setMessaggi] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titolo: '' })
  const [testo, setTesto] = useState('')
  const [loading, setLoading] = useState(true)
  const [meId, setMeId] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => { caricaTickets() }, [clienteId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messaggi])

  async function caricaTickets() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setMeId(user.id)
    const { data } = await supabase.from('ticket_assistenza')
      .select('*, messaggi:messaggi_ticket(id, autore_tipo, created_at)')
      .or(`and(mittente_id.eq.${user.id},destinatario_id.eq.${clienteId}),and(mittente_id.eq.${clienteId},destinatario_id.eq.${user.id})`)
      .order('created_at', { ascending: false })
    setTickets(data ?? [])
    setLoading(false)
  }

  async function apriTicket(ticket) {
    setTicketAperto(ticket)
    const { data } = await supabase.from('messaggi_ticket').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true })
    setMessaggi(data ?? [])
  }

  async function creaNuovoTicket() {
    if (!form.titolo.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('ticket_assistenza').insert({
      mittente_id: user.id, destinatario_id: clienteId,
      oggetto: form.titolo.trim(), mittente_ruolo: 'avvocato', stato: 'aperto',
    }).select().single()
    if (error) return
    setTickets(prev => [data, ...prev]); setShowForm(false); setForm({ titolo: '' })
    apriTicket(data)
  }

  async function inviaMessaggio() {
    if (!testo.trim() || ticketAperto?.stato === 'chiuso') return
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('messaggi_ticket')
      .insert({ ticket_id: ticketAperto.id, autore_id: user.id, autore_tipo: 'avvocato', testo: testo.trim() })
      .select().single()
    if (error) return
    setMessaggi(prev => [...prev, data]); setTesto('')
  }

  async function chiudiTicket() {
    await supabase.from('ticket_assistenza').update({ stato: 'chiuso' }).eq('id', ticketAperto.id)
    setTicketAperto(prev => ({ ...prev, stato: 'chiuso' }))
    setTickets(prev => prev.map(t => t.id === ticketAperto.id ? { ...t, stato: 'chiuso' } : t))
  }

  if (ticketAperto) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setTicketAperto(null); setMessaggi([]) }} className="text-nebbia/40 hover:text-nebbia transition-colors">
              <ArrowRight size={16} className="rotate-180" />
            </button>
            <p className="font-body text-sm font-medium text-nebbia">{ticketAperto.oggetto}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-body text-xs px-2 py-0.5 border ${ticketAperto.stato === 'aperto' ? 'border-salvia/25 text-salvia bg-salvia/5' : 'border-white/10 text-nebbia/30'}`}>
              {ticketAperto.stato === 'aperto' ? 'Aperto' : 'Chiuso'}
            </span>
            {ticketAperto.stato === 'aperto' && (
              <button onClick={chiudiTicket} className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors border border-white/10 hover:border-red-500/30 px-3 py-1">Chiudi ticket</button>
            )}
          </div>
        </div>
        <div className="bg-slate border border-white/5 flex flex-col" style={{ height: 420 }}>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messaggi.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <MessageSquare size={28} className="text-nebbia/15" />
                <p className="font-body text-sm text-nebbia/30">Nessun messaggio</p>
              </div>
            ) : messaggi.map(msg => {
              const isMio = msg.autore_id === meId
              return (
                <div key={msg.id} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm px-4 py-2.5 ${isMio ? 'bg-oro/15 border border-oro/20' : 'bg-petrolio border border-white/10'}`}>
                    <p className="font-body text-sm text-nebbia leading-relaxed">{msg.testo}</p>
                    <p className={`font-body text-[10px] mt-1 ${isMio ? 'text-oro/50 text-right' : 'text-nebbia/30'}`}>
                      {new Date(msg.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          {ticketAperto.stato === 'aperto' ? (
            <div className="border-t border-white/5 p-4 flex gap-3 items-end">
              <textarea rows={2} value={testo} onChange={e => setTesto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); inviaMessaggio() } }}
                placeholder="Scrivi un messaggio..."
                className="flex-1 bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 resize-none placeholder:text-nebbia/25" />
              <button onClick={inviaMessaggio} disabled={!testo.trim()} className="btn-primary text-sm self-end px-4 py-3 shrink-0 disabled:opacity-40"><Send size={15} /></button>
            </div>
          ) : (
            <div className="border-t border-white/5 p-4 text-center">
              <p className="font-body text-xs text-nebbia/30">Ticket chiuso</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-body text-sm text-nebbia/40">{tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}</p>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm flex items-center gap-2">
          <Plus size={14} />{showForm ? 'Annulla' : 'Nuovo ticket'}
        </button>
      </div>
      {showForm && (
        <div className="bg-slate border border-oro/20 p-5 space-y-4">
          <p className="section-label">Nuovo ticket</p>
          <div>
            <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Titolo *</label>
            <input value={form.titolo} onChange={e => setForm(p => ({ ...p, titolo: e.target.value }))}
              placeholder="Es. Documenti mancanti, aggiornamento pratica..."
              className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm flex-1">Annulla</button>
            <button onClick={creaNuovoTicket} disabled={!form.titolo.trim()} className="btn-primary text-sm flex-1 justify-center disabled:opacity-40">Apri ticket</button>
          </div>
        </div>
      )}
      {loading ? <div className="flex items-center justify-center py-12"><span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" /></div>
        : tickets.length === 0 ? <EmptyState icon={MessageSquare} title="Nessun ticket" desc="Apri un ticket per comunicare con il cliente" />
          : (
            <div className="space-y-2">
              {tickets.map(t => {
                const msgs = [...(t.messaggi ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                const nonLetto = t.stato === 'aperto' && msgs.length > 0 && msgs[0]?.autore_tipo !== 'avvocato'
                return (
                  <button key={t.id} onClick={() => apriTicket(t)} className="w-full text-left bg-slate border border-white/5 hover:border-oro/20 p-4 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {nonLetto && <span className="w-1.5 h-1.5 rounded-full bg-oro shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-body text-sm font-medium text-nebbia truncate">{t.oggetto}</p>
                          <p className="font-body text-xs text-nebbia/25 mt-1">{new Date(t.created_at).toLocaleDateString('it-IT')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-body text-xs px-2 py-0.5 border ${t.stato === 'aperto' ? 'border-salvia/25 text-salvia bg-salvia/5' : 'border-white/10 text-nebbia/30'}`}>
                          {t.stato === 'aperto' ? 'Aperto' : 'Chiuso'}
                        </span>
                        <ArrowRight size={14} className="text-nebbia/20" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
    </div>
  )
}

function PannelloPratica({ pratica, onClose }) {
  const [documenti, setDocumenti] = useState([])
  const [ricerche, setRicerche] = useState([])
  const [loadingExtra, setLoadingExtra] = useState(true)
  const sc = STATI_PRATICA[pratica.stato] ?? { label: pratica.stato ?? 'Aperta', variant: 'salvia' }

  useEffect(() => {
    async function carica() {
      setLoadingExtra(true)
      const [{ data: docs }, { data: rich }] = await Promise.all([
        supabase.from('documenti_pratiche')
          .select('id, nome_file, dimensione, created_at')
          .eq('pratica_id', pratica.id)
          .order('created_at', { ascending: false }),
        supabase.from('note_interne')
          .select('id, tipo, testo, metadati, created_at, autore:autore_id(nome, cognome)')
          .eq('pratica_id', pratica.id)
          .in('tipo', ['ricerca_ai', 'ricerca_manuale', 'sentenza_acquistata'])
          .order('created_at', { ascending: false }),
      ])
      setDocumenti(docs ?? [])
      setRicerche(rich ?? [])
      setLoadingExtra(false)
    }
    carica()
  }, [pratica.id])

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-1">Pratica</p>
          <h3 className="font-display text-xl font-semibold text-nebbia">{pratica.titolo}</h3>
          <p className="font-body text-xs text-nebbia/40 mt-1">{pratica.tipo ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge label={sc.label} variant={sc.variant} />
          {onClose && (
            <button onClick={onClose} className="text-nebbia/20 hover:text-nebbia p-1 ml-1">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Bottone modifica */}
      <Link
        to={`/pratiche/${pratica.id}`}
        className="flex items-center justify-center gap-2 w-full py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors"
      >
        <ArrowRight size={13} /> Apri e modifica pratica completa
      </Link>

      {/* Dettagli */}
      <div className="bg-petrolio/40 border border-white/5 p-4 space-y-2">
        <p className="section-label mb-2">Dettagli</p>
        {[
          ['Tipo', pratica.tipo ?? '—'],
          ['Creata il', new Date(pratica.created_at).toLocaleDateString('it-IT')],
          ['Stato', sc.label],
          ...(pratica.esito ? [['Esito', pratica.esito.charAt(0).toUpperCase() + pratica.esito.slice(1)]] : []),
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between border-b border-white/5 pb-2">
            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
            <span className="font-body text-sm text-nebbia">{v}</span>
          </div>
        ))}
      </div>

      {/* Udienza */}
      {pratica.prossima_udienza ? (
        <div className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-500/25">
          <Calendar size={16} className="text-red-400" />
          <div>
            <p className="font-body text-xs text-red-400/60 uppercase tracking-widest mb-0.5">Prossima udienza</p>
            <span className="font-body text-sm text-red-400">{new Date(pratica.prossima_udienza).toLocaleDateString('it-IT')}</span>
          </div>
        </div>
      ) : (
        <EmptyState icon={Calendar} title="Nessuna scadenza" />
      )}

      {/* Note */}
      {pratica.note && (
        <div className="bg-petrolio/40 border border-white/5 p-4">
          <p className="section-label mb-2">Note interne</p>
          <p className="font-body text-sm text-nebbia/60 leading-relaxed whitespace-pre-line line-clamp-4">{pratica.note}</p>
        </div>
      )}

      {loadingExtra ? (
        <div className="flex justify-center py-4">
          <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Documenti */}
          <div className="bg-petrolio/40 border border-white/5 p-4">
            <p className="section-label mb-3">Documenti ({documenti.length})</p>
            {documenti.length === 0 ? (
              <p className="font-body text-xs text-nebbia/30">Nessun documento</p>
            ) : documenti.map(d => (
              <div key={d.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                <FileText size={12} className="text-nebbia/30 shrink-0" />
                <p className="font-body text-xs text-nebbia/70 truncate flex-1">{d.nome_file}</p>
                <span className="font-body text-xs text-nebbia/25">
                  {new Date(d.created_at).toLocaleDateString('it-IT')}
                </span>
              </div>
            ))}
          </div>

          {/* Ricerche */}
          <div className="bg-petrolio/40 border border-white/5 p-4">
            <p className="section-label mb-3">Ricerche ({ricerche.length})</p>
            {ricerche.length === 0 ? (
              <p className="font-body text-xs text-nebbia/30">Nessuna ricerca salvata</p>
            ) : ricerche.map(r => (
              <div key={r.id} className="py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  {r.tipo === 'ricerca_ai'
                    ? <Sparkles size={10} className="text-salvia shrink-0" />
                    : <Search size={10} className="text-oro shrink-0" />
                  }
                  <p className="font-body text-xs font-medium text-nebbia/70 truncate">
                    {r.metadati?.domanda ?? '—'}
                  </p>
                </div>
                <p className="font-body text-xs text-nebbia/40 line-clamp-2 ml-4">{r.testo}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 1. LISTA CLIENTI
// ─────────────────────────────────────────────────────────────
function ProssimiAppuntamenti({ clienteId }) {
  const [appuntamenti, setAppuntamenti] = useState([])

  useEffect(() => {
    async function carica() {
      const oggi = new Date().toISOString()
      const { data } = await supabase
        .from('appuntamenti')
        .select('id, titolo, tipo, data_ora_inizio, stato')
        .eq('cliente_id', clienteId)
        .eq('stato', 'programmato')
        .gte('data_ora_inizio', oggi)
        .order('data_ora_inizio', { ascending: true })
        .limit(3)
      setAppuntamenti(data ?? [])
    }
    carica()
  }, [clienteId])

  if (appuntamenti.length === 0) return null

  return (
    <div className="bg-slate border border-white/5 p-5">
      <p className="section-label mb-3">Prossimi appuntamenti</p>
      <div className="space-y-2">
        {appuntamenti.map(a => (
          <div key={a.id} className={`flex items-center gap-3 p-3 border ${a.tipo === 'udienza' ? 'bg-red-900/10 border-red-500/20' : 'bg-petrolio/40 border-white/5'
            }`}>
            <Calendar size={13} className={a.tipo === 'udienza' ? 'text-red-400 shrink-0' : 'text-nebbia/30 shrink-0'} />
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm text-nebbia truncate">{a.titolo}</p>
              <p className={`font-body text-xs mt-0.5 ${a.tipo === 'udienza' ? 'text-red-400/60' : 'text-nebbia/30'}`}>
                {new Date(a.data_ora_inizio).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                {' — '}
                {new Date(a.data_ora_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {a.tipo === 'udienza' && (
              <span className="font-body text-xs text-red-400/60 border border-red-500/20 px-2 py-0.5 shrink-0">Udienza</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function AvvocatoClienti() {
  const [search, setSearch] = useState('')
  const [avvF, setAvvF] = useState('')
  const [sortField, setSortField] = useState('cognome')
  const [sortDir, setSortDir] = useState('asc')
  const [clienti, setClienti] = useState([])
  const [collaboratori, setCollaboratori] = useState([])
  const [isStudio, setIsStudio] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    async function carica() {
      setLoading(true); setErrore('')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profilo } = await supabase
        .from('profiles')
        .select('posti_acquistati, titolare_id')
        .eq('id', user.id).single()

      // Determina se è titolare di studio
      const haStudio = (profilo?.posti_acquistati ?? 1) > 1
      setIsStudio(haStudio)

      let ids = [user.id]

      if (haStudio) {
        const { data: collabs } = await supabase
          .from('profiles').select('id, nome, cognome').eq('titolare_id', user.id)
        setCollaboratori(collabs ?? [])
        ids = [user.id, ...(collabs ?? []).map(c => c.id)]
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, cognome, email, telefono, created_at, avvocato_id')
        .eq('role', 'cliente')
        .in('avvocato_id', ids)
        .order('cognome')

      if (error) { setErrore('Errore nel caricamento dei clienti'); setLoading(false); return }
      setClienti(data ?? [])
      setLoading(false)
    }
    carica()
  }, [])

  function handleSort(f) {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(f); setSortDir('asc') }
  }

  const rows = clienti
    .filter(c => {
      if (avvF && c.avvocato_id !== avvF) return false
      if (search) return `${c.nome} ${c.cognome} ${c.email}`.toLowerCase().includes(search.toLowerCase())
      return true
    })
    .sort((a, b) => {
      const va = String(a[sortField] ?? '').toLowerCase()
      const vb = String(b[sortField] ?? '').toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  return (
    <div className="space-y-5">
      <PageHeader
        label="Clienti"
        title={isStudio ? 'Clienti dello studio' : 'I tuoi clienti'}
        action={<Link to="/clienti/nuovo" className="btn-primary text-sm"><Plus size={15} />Nuovo cliente</Link>}
      />
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
          <input placeholder="Cerca nome, email..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
        </div>
        {isStudio && collaboratori.length > 0 && (
          <select value={avvF} onChange={e => setAvvF(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
            <option value="">Tutti gli avvocati</option>
            {collaboratori.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
          </select>
        )}
        {(search || avvF) && (
          <button onClick={() => { setSearch(''); setAvvF('') }}
            className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors px-3 py-2.5 border border-white/5 hover:border-red-500/30">
            Reset
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
      ) : errore ? (
        <div className="flex items-center gap-2 text-red-400 text-xs font-body p-4 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>
      ) : (
        <div className="bg-slate border border-white/5 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <SortTh label="Cliente" field="cognome" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Email" field="email" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Telefono</th>
                {isStudio && <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Avvocato</th>}
                <SortTh label="Creato il" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={isStudio ? 6 : 5} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">Nessun cliente trovato</td></tr>
              ) : rows.map(c => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                  <td className="px-4 py-3"><p className="font-body text-sm font-medium text-nebbia">{c.nome} {c.cognome}</p></td>
                  <td className="px-4 py-3 font-body text-sm text-nebbia/60">{c.email}</td>
                  <td className="px-4 py-3 font-body text-sm text-nebbia/50">{c.telefono ?? '—'}</td>
                  {isStudio && (
                    <td className="px-4 py-3 font-body text-sm text-nebbia/60">
                      {collaboratori.find(col => col.id === c.avvocato_id)
                        ? `${collaboratori.find(col => col.id === c.avvocato_id).nome} ${collaboratori.find(col => col.id === c.avvocato_id).cognome}`
                        : 'Tu'}
                    </td>
                  )}
                  <td className="px-4 py-3 font-body text-sm text-nebbia/50 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString('it-IT')}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/clienti/${c.id}`} className="inline-flex items-center justify-center w-7 h-7 text-nebbia/20 hover:text-oro hover:bg-oro/10 transition-colors">
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 2. NUOVO CLIENTE
// ─────────────────────────────────────────────────────────────
export function AvvocatoClientiNuovo() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', telefono: '', cf: '', indirizzo: '', note: '', avvocato_id: '' })
  const [collaboratori, setCollaboratori] = useState([])
  const [isStudio, setIsStudio] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [success, setSuccess] = useState(false)
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  useEffect(() => {
    async function caricaContesto() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setForm(p => ({ ...p, avvocato_id: user.id }))
      const { data: profilo } = await supabase.from('profiles').select('posti_acquistati').eq('id', user.id).single()
      if ((profilo?.posti_acquistati ?? 1) <= 1) return
      setIsStudio(true)
      const { data: collabs } = await supabase.from('profiles').select('id, nome, cognome').eq('titolare_id', user.id)
      setCollaboratori(collabs ?? [])
    }
    caricaContesto()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault(); setErrore('')
    if (!form.nome.trim()) return setErrore('Il nome è obbligatorio')
    if (!form.cognome.trim()) return setErrore('Il cognome è obbligatorio')
    if (!form.email.trim()) return setErrore("L'email è obbligatoria")
    if (!/\S+@\S+\.\S+/.test(form.email)) return setErrore('Email non valida')
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          nome: form.nome.trim(), cognome: form.cognome.trim(),
          email: form.email.trim().toLowerCase(),
          telefono: form.telefono.trim() || null, cf: form.cf.trim() || null,
          indirizzo: form.indirizzo.trim() || null, note: form.note.trim() || null,
          avvocato_id: form.avvocato_id || null,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setSuccess(true)
      setTimeout(() => navigate('/clienti'), 1500)
    } catch (err) { setErrore(err.message) } finally { setLoading(false) }
  }

  if (success) return (
    <div className="space-y-5 max-w-2xl">
      <BackButton to="/clienti" label="Tutti i clienti" />
      <div className="bg-slate border border-white/5 p-10 flex flex-col items-center text-center gap-4">
        <CheckCircle size={40} className="text-salvia" />
        <h2 className="font-display text-2xl text-nebbia">Cliente creato</h2>
        <p className="font-body text-sm text-nebbia/50">Le credenziali saranno inviate via email al cliente.</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 max-w-2xl">
      <BackButton to="/clienti" label="Tutti i clienti" />
      <PageHeader label="Clienti" title="Nuovo cliente" />
      <form onSubmit={handleSubmit}>
        <div className="bg-slate border border-white/5 p-6 space-y-5">
          <p className="section-label">Dati anagrafici</p>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Nome *" placeholder="Anna"  {...f('nome')} />
            <InputField label="Cognome *" placeholder="Rossi" {...f('cognome')} />
          </div>
          <InputField label="Email *" type="email" placeholder="anna@email.it" {...f('email')} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Telefono" placeholder="+39 333 000 1111"    {...f('telefono')} />
            <InputField label="Codice fiscale" placeholder="RSSMRA80A01H501Z"    {...f('cf')} />
          </div>
          <InputField label="Indirizzo" placeholder="Via Roma 1, Milano" {...f('indirizzo')} />
          {isStudio && collaboratori.length > 0 && (
            <div>
              <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">Avvocato assegnato *</label>
              <select value={form.avvocato_id} onChange={e => setForm(p => ({ ...p, avvocato_id: e.target.value }))}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50">
                <option value="">Tu</option>
                {collaboratori.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
              </select>
            </div>
          )}
          <TextareaField label="Note iniziali" placeholder="Primo contatto, situazione generale..." rows={3} {...f('note')} />
          {errore && <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20"><AlertCircle size={14} /> {errore}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/clienti')} className="btn-secondary text-sm flex-1">Annulla</button>
            <button type="submit" disabled={loading} className="btn-primary text-sm flex-1 justify-center">
              {loading ? <span className="animate-spin w-4 h-4 border-2 border-petrolio border-t-transparent rounded-full" /> : 'Crea cliente'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 3. DETTAGLIO CLIENTE
// ─────────────────────────────────────────────────────────────
export function AvvocatoClientiDettaglio() {
  const { id } = useParams()
  const [cliente, setCliente] = useState(null)
  const [tab, setTab] = useState('panoramica')
  const [pratiche, setPratiche] = useState([])
  const [collaboratori, setCollaboratori] = useState([])
  const [isStudio, setIsStudio] = useState(false)
  const [praticaSelezionata, setPraticaSelezionata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editPanoramica, setEditPanoramica] = useState(false)
  const [formCliente, setFormCliente] = useState({})
  const [salvandoCliente, setSalvandoCliente] = useState(false)
  const [avvocatoId, setAvvocatoId] = useState('')
  const [meId, setMeId] = useState(null)

  useEffect(() => {
    async function carica() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setMeId(user.id)

      const { data: c } = await supabase.from('profiles')
        .select('id, nome, cognome, email, telefono, cf, indirizzo, note_iniziali, avvocato_id, created_at')
        .eq('id', id).single()
      if (c) { setCliente(c); setFormCliente(c); setAvvocatoId(c.avvocato_id ?? '') }

      const { data: pr } = await supabase.from('pratiche').select('*').eq('cliente_id', id).order('created_at', { ascending: false })
      setPratiche(pr ?? [])

      const { data: profilo } = await supabase.from('profiles').select('posti_acquistati').eq('id', user.id).single()
      if ((profilo?.posti_acquistati ?? 1) > 1) {
        setIsStudio(true)
        const { data: collabs } = await supabase.from('profiles').select('id, nome, cognome').eq('titolare_id', user.id)
        setCollaboratori(collabs ?? [])
      }
      setLoading(false)
    }
    carica()
  }, [id])

  async function salvaCliente() {
    setSalvandoCliente(true)
    await supabase.from('profiles').update({
      nome: formCliente.nome, cognome: formCliente.cognome,
      email: formCliente.email, telefono: formCliente.telefono,
      cf: formCliente.cf, indirizzo: formCliente.indirizzo,
      avvocato_id: avvocatoId || null,
    }).eq('id', id)
    setCliente(prev => ({ ...prev, ...formCliente, avvocato_id: avvocatoId }))
    setEditPanoramica(false); setSalvandoCliente(false)
  }

  const fc = k => ({ value: formCliente[k] ?? '', onChange: e => setFormCliente(p => ({ ...p, [k]: e.target.value })) })
  const nomeAvvocato = avvocatoId === meId ? 'Tu'
    : collaboratori.find(c => c.id === avvocatoId)
      ? `${collaboratori.find(c => c.id === avvocatoId).nome} ${collaboratori.find(c => c.id === avvocatoId).cognome}`
      : '—'

  if (loading) return <div className="flex items-center justify-center py-40"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
  if (!cliente) return <div className="space-y-5"><BackButton to="/clienti" label="Tutti i clienti" /><p className="font-body text-sm text-nebbia/40">Cliente non trovato.</p></div>

  return (
    <div className="space-y-5">
      <BackButton to="/clienti" label="Tutti i clienti" />
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="section-label mb-2">Scheda cliente</p>
          <h1 className="font-display text-4xl font-light text-nebbia">{cliente.nome} {cliente.cognome}</h1>
          <p className="font-body text-sm text-nebbia/40 mt-1">{cliente.email} · {cliente.telefono ?? '—'}</p>
        </div>
        {isStudio && (
          <div className="flex items-center gap-2">
            <span className="font-body text-xs text-nebbia/30">Assegnato a</span>
            <select value={avvocatoId} onChange={e => setAvvocatoId(e.target.value)}
              className="bg-slate border border-white/10 text-nebbia font-body text-sm px-3 py-1.5 outline-none focus:border-oro/50">
              <option value={meId}>Tu</option>
              {collaboratori.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-0 border-b border-white/8 overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} onClick={() => { setTab(tid); setPraticaSelezionata(null) }}
            className={`flex items-center gap-2 px-4 py-3 font-body text-sm whitespace-nowrap border-b-2 transition-colors ${tab === tid ? 'border-oro text-oro' : 'border-transparent text-nebbia/40 hover:text-nebbia'
              } ${tid === 'note_interne' ? 'text-amber-400/70 hover:text-amber-400' : ''}`}>
            <Icon size={14} strokeWidth={1.5} />{label}
            {tid === 'note_interne' && <Lock size={11} className="opacity-50" />}
          </button>
        ))}
      </div>

      {tab === 'panoramica' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-slate border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="section-label">Dati anagrafici</p>
              {!editPanoramica
                ? <button onClick={() => setEditPanoramica(true)} className="flex items-center gap-1.5 font-body text-xs text-nebbia/30 hover:text-oro transition-colors"><Edit2 size={12} /> Modifica</button>
                : <div className="flex gap-2">
                  <button onClick={salvaCliente} disabled={salvandoCliente} className="flex items-center gap-1 font-body text-xs text-salvia">
                    {salvandoCliente ? <span className="animate-spin w-3 h-3 border border-salvia border-t-transparent rounded-full" /> : <Check size={12} />} Salva
                  </button>
                  <button onClick={() => { setFormCliente({ ...cliente }); setEditPanoramica(false) }} className="font-body text-xs text-nebbia/30 hover:text-red-400"><X size={12} /></button>
                </div>
              }
            </div>
            {editPanoramica ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Nome"    {...fc('nome')} />
                  <InputField label="Cognome" {...fc('cognome')} />
                </div>
                <InputField label="Email" type="email" {...fc('email')} />
                <InputField label="Telefono"                    {...fc('telefono')} />
                <InputField label="Codice fiscale"              {...fc('cf')} />
                <InputField label="Indirizzo"                   {...fc('indirizzo')} />
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  ['Nome completo', `${cliente.nome} ${cliente.cognome}`],
                  ['Email', cliente.email],
                  ['Telefono', cliente.telefono || '—'],
                  ['Codice fiscale', cliente.cf || '—'],
                  ['Indirizzo', cliente.indirizzo || '—'],
                  ...(isStudio ? [['Avvocato assegnato', nomeAvvocato]] : []),
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                    <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                    <span className="font-body text-sm text-nebbia">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <ProssimiAppuntamenti clienteId={id} />
        </div>
      )}

      {tab === 'pratiche' && (
        <div className="flex gap-4 min-h-[500px]">
          <div className={`flex flex-col gap-2 ${praticaSelezionata ? 'w-[20%] shrink-0' : 'flex-1'}`}>
            <div className="flex justify-end mb-1">
              <Link to={`/pratiche/nuova?cliente_id=${id}`} className="btn-primary text-sm flex items-center gap-2"><Plus size={14} />Nuova pratica</Link>
            </div>
            {pratiche.length === 0 ? (
              <div className="bg-slate border border-white/5 p-8 text-center"><p className="font-body text-sm text-nebbia/30">Nessuna pratica — creane una</p></div>
            ) : pratiche.map(p => {
              const sc = STATI_PRATICA[p.stato] ?? STATI_PRATICA.in_corso
              const sel = praticaSelezionata?.id === p.id
              return (
                <button key={p.id} onClick={() => setPraticaSelezionata(sel ? null : p)}
                  className={`w-full text-left p-4 border transition-all ${sel ? 'bg-oro/8 border-oro/30' : 'bg-slate border-white/5 hover:border-oro/20'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm font-medium text-nebbia truncate">{p.titolo}</p>
                      <p className="font-body text-xs text-nebbia/40 mt-0.5">{p.tipo}</p>
                    </div>
                    {p.prossima_udienza && (
                      <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 bg-red-900/20 border border-red-500/25">
                        <Calendar size={10} className="text-red-400" />
                        <span className="font-body text-xs text-red-400/80">
                          Udienza {new Date(p.prossima_udienza).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    )}
                    <Badge label={sc.label} variant={sc.variant} />
                  </div>
                </button>
              )
            })}
          </div>
          {praticaSelezionata && (
            <div className="w-[80%] bg-slate border border-white/5 p-5 overflow-y-auto">
              <PannelloPratica pratica={praticaSelezionata} onClose={() => setPraticaSelezionata(null)} />
            </div>
          )}
        </div>
      )}

      {tab === 'documenti' && <TabDocumenti clienteId={id} />}
      {tab === 'comunicazioni' && <TabComunicazioni clienteId={id} />}
      {tab === 'note_interne' && <TabNoteInterne clienteId={id} />}
      {tab === 'pagamenti' && <TabPagamenti clienteId={id} avvocatoId={avvocatoId} />}
    </div>
  )
}