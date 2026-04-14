// src/pages/admin/Sentenze.jsx

import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, BackButton, Badge, StatCard } from '@/components/shared'
import {
  Search, Eye, EyeOff, Trash2, FileText,
  Plus, ChevronRight, ChevronDown, Edit2, Check, X,
  FolderOpen, Tag, AlertCircle, Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// INLINE EDIT / ADD
// ─────────────────────────────────────────────────────────────
function InlineEdit({ value, onSave, onCancel, salvando }) {
  const [val, setVal] = useState(value)
  return (
    <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
      <input value={val} onChange={e => setVal(e.target.value)} autoFocus
        onKeyDown={e => { if (e.key === 'Enter') onSave(val); if (e.key === 'Escape') onCancel() }}
        className="flex-1 bg-petrolio border border-oro/40 text-nebbia font-body text-sm px-3 py-0.5 outline-none min-w-0" />
      <button onClick={() => onSave(val)} disabled={salvando} className="text-salvia p-0.5">
        {salvando ? <span className="animate-spin w-3 h-3 border border-salvia border-t-transparent rounded-full inline-block" /> : <Check size={13} />}
      </button>
      <button onClick={onCancel} className="text-nebbia/30 hover:text-red-400 p-0.5"><X size={13} /></button>
    </div>
  )
}

function AddInline({ placeholder, onSave, onCancel, salvando }) {
  const [val, setVal] = useState('')
  return (
    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
      <input value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder} autoFocus
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) onSave(val.trim()); if (e.key === 'Escape') onCancel() }}
        className="bg-petrolio border border-oro/30 text-nebbia font-body text-xs px-3 py-1.5 outline-none w-52 placeholder:text-nebbia/25" />
      <button onClick={() => val.trim() && onSave(val.trim())} disabled={salvando}
        className="font-body text-xs text-petrolio bg-oro px-3 py-1.5 hover:bg-oro/90 transition-colors disabled:opacity-40">
        {salvando ? '...' : 'Aggiungi'}
      </button>
      <button onClick={onCancel} className="text-nebbia/30 hover:text-red-400 p-1"><X size={13} /></button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// RIGA TIPOLOGIA
// ─────────────────────────────────────────────────────────────
function TipologiaRow({ tip, count, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function handleRename(nome) {
    setSalvando(true)
    await onRename(tip.id, nome)
    setSalvando(false)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 px-14 py-2 border-b border-white/5 group hover:bg-white/2 transition-colors last:border-0">
      <Tag size={11} className="text-oro/40 shrink-0" />
      {editing ? (
        <InlineEdit value={tip.nome} onSave={handleRename} onCancel={() => setEditing(false)} salvando={salvando} />
      ) : (
        <>
          <span className="flex-1 font-body text-xs text-nebbia/50">{tip.nome}</span>
          <span className="font-body text-[10px] text-nebbia/20 mr-2">{count} sentenze</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditing(true)} className="text-nebbia/25 hover:text-oro p-0.5"><Edit2 size={11} /></button>
            <button onClick={() => onDelete(tip.id)} className="text-nebbia/25 hover:text-red-400 p-0.5"><Trash2 size={11} /></button>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// RIGA SOTTO-CATEGORIA
// ─────────────────────────────────────────────────────────────
function SottoCategoriaRow({ sotto, contatori, onRename, onDelete, onAddTipo, onRenameTipo, onDeleteTipo }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [addTip, setAddTip] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvandoTip, setSalvandoTip] = useState(false)

  async function handleRename(nome) {
    setSalvando(true)
    await onRename(sotto.id, nome)
    setSalvando(false)
    setEditing(false)
  }

  async function handleAddTipo(nome) {
    setSalvandoTip(true)
    await onAddTipo(sotto.id, nome)
    setSalvandoTip(false)
    setAddTip(false)
  }

  const countSotto = contatori?.sotto?.[sotto.nome] ?? 0

  return (
    <div className="border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2 px-8 py-2.5 group cursor-pointer hover:bg-white/2 transition-colors"
        onClick={() => !editing && setOpen(v => !v)}>
        <div className="text-nebbia/20 group-hover:text-salvia/60 transition-colors shrink-0">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </div>
        {editing ? (
          <InlineEdit value={sotto.nome} onSave={handleRename} onCancel={() => setEditing(false)} salvando={salvando} />
        ) : (
          <>
            <span className="flex-1 font-body text-sm text-nebbia/65 group-hover:text-nebbia transition-colors">{sotto.nome}</span>
            {sotto.tipologie.length > 0 && (
              <div className="flex flex-wrap gap-1 mx-2">
                {sotto.tipologie.slice(0, 4).map(t => (
                  <span key={t.id} className="font-body text-[10px] px-2 py-0.5 bg-oro/8 border border-oro/15 text-oro/60">{t.nome}</span>
                ))}
                {sotto.tipologie.length > 4 && <span className="font-body text-[10px] text-nebbia/25">+{sotto.tipologie.length - 4}</span>}
              </div>
            )}
            <span className="font-body text-[10px] text-nebbia/20 shrink-0">{countSotto} sent.</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => setEditing(true)} className="text-nebbia/25 hover:text-oro p-0.5"><Edit2 size={11} /></button>
              <button onClick={() => onDelete(sotto.id)} className="text-nebbia/25 hover:text-red-400 p-0.5"><Trash2 size={11} /></button>
            </div>
          </>
        )}
      </div>

      {open && (
        <div className="bg-petrolio/30">
          {sotto.tipologie.map(t => (
            <TipologiaRow key={t.id} tip={t}
              count={contatori?.tipo?.[t.nome] ?? 0}   // ← t invece di tip
              onRename={onRenameTipo}
              onDelete={onDeleteTipo}
            />
          ))}
          {addTip ? (
            <div className="px-14 py-2.5">
              <AddInline placeholder="Nome tipologia..." onSave={handleAddTipo} onCancel={() => setAddTip(false)} salvando={salvandoTip} />
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); setAddTip(true) }}
              className="flex items-center gap-1.5 px-14 py-2 font-body text-xs text-nebbia/20 hover:text-oro transition-colors">
              <Plus size={10} /> Aggiungi tipologia
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// RIGA CATEGORIA
// ─────────────────────────────────────────────────────────────
function CategoriaRow({ cat, contatori, onRename, onDelete, onAddSotto, onRenameSotto, onDeleteSotto, onAddTipo, onRenameTipo, onDeleteTipo }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [addSub, setAddSub] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvandoSub, setSalvandoSub] = useState(false)

  async function handleRename(nome) {
    setSalvando(true)
    await onRename(cat.id, nome)
    setSalvando(false)
    setEditing(false)
  }

  async function handleAddSotto(nome) {
    setSalvandoSub(true)
    await onAddSotto(cat.id, nome)
    setSalvandoSub(false)
    setAddSub(false)
  }

  const countCat = contatori?.cat?.[cat.nome] ?? 0
  const totSotto = cat.sotto_categorie?.length ?? 0
  const totTipo = (cat.sotto_categorie ?? []).reduce((a, s) => a + (s.tipologie?.length ?? 0), 0)

  return (
    <div className="border border-white/8 mb-2 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate group cursor-pointer hover:bg-slate/70 transition-colors"
        onClick={() => !editing && setOpen(v => !v)}>
        <div className="text-nebbia/30 group-hover:text-oro transition-colors shrink-0">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>
        {editing ? (
          <InlineEdit value={cat.nome} onSave={handleRename} onCancel={() => setEditing(false)} salvando={salvando} />
        ) : (
          <>
            <span className="font-display text-base font-semibold text-nebbia flex-1">{cat.nome}</span>
            <div className="hidden sm:flex items-center gap-3 mx-2">
              <span className="font-body text-xs text-nebbia/30">{totSotto} sotto-cat.</span>
              <span className="text-nebbia/15">·</span>
              <span className="font-body text-xs text-nebbia/30">{totTipo} tipologie</span>
              <span className="text-nebbia/15">·</span>
              <span className="font-body text-xs text-oro/60">{countCat} sentenze</span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <button onClick={() => setEditing(true)} className="text-nebbia/30 hover:text-oro p-1"><Edit2 size={12} /></button>
              <button onClick={() => onDelete(cat.id)} className="text-nebbia/30 hover:text-red-400 p-1"><Trash2 size={12} /></button>
            </div>
          </>
        )}
      </div>

      {open && (
        <div className="bg-petrolio/20 border-t border-white/5">
          {totSotto === 0 && !addSub && (
            <p className="font-body text-xs text-nebbia/25 italic px-8 py-3">Nessuna sotto-categoria — aggiungine una</p>
          )}
          {(cat.sotto_categorie ?? []).map(sotto => (
            <SottoCategoriaRow key={sotto.id} sotto={sotto} contatori={contatori}
              onRename={onRenameSotto} onDelete={onDeleteSotto}
              onAddTipo={onAddTipo} onRenameTipo={onRenameTipo} onDeleteTipo={onDeleteTipo}
            />
          ))}
          {addSub ? (
            <div className="px-8 py-3 border-t border-white/5">
              <AddInline placeholder="Nome sotto-categoria..." onSave={handleAddSotto} onCancel={() => setAddSub(false)} salvando={salvandoSub} />
            </div>
          ) : (
            <button onClick={e => { e.stopPropagation(); setAddSub(true) }}
              className="flex items-center gap-2 px-8 py-2.5 w-full text-left font-body text-xs text-nebbia/25 hover:text-salvia transition-colors border-t border-white/5">
              <Plus size={11} /> Aggiungi sotto-categoria
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BLOCCO CATEGORIE
// ─────────────────────────────────────────────────────────────
function BloccoCategorie({ sentenze }) {
  const [open, setOpen] = useState(true)
  const [categorie, setCategorie] = useState([])
  const [loading, setLoading] = useState(true)
  const [catSearch, setCatSearch] = useState('')
  const [addCat, setAddCat] = useState(false)
  const [salvandoCat, setSalvandoCat] = useState(false)

  const caricaCategorie = useCallback(async () => {
    const { data } = await supabase
      .from('categorie')
      .select(`
        id, nome,
        sotto_categorie (
          id, nome,
          tipologie ( id, nome )
        )
      `)
      .order('nome')
    setCategorie(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { caricaCategorie() }, [caricaCategorie])

  // Contatori da sentenze reali
  const contatori = { cat: {}, sotto: {}, tipo: {} }
  sentenze.forEach(s => {
    if (s.categoria) contatori.cat[s.categoria] = (contatori.cat[s.categoria] ?? 0) + 1
    if (s.sotto_categoria) contatori.sotto[s.sotto_categoria] = (contatori.sotto[s.sotto_categoria] ?? 0) + 1
    if (s.tipologia) contatori.tipo[s.tipologia] = (contatori.tipo[s.tipologia] ?? 0) + 1
  })

  // ── CRUD CATEGORIE ──────────────────────────────────────────
  async function addCategoria(nome) {
    setSalvandoCat(true)
    const { error } = await supabase.from('categorie').insert({ nome })
    if (!error) await caricaCategorie()
    setSalvandoCat(false)
    setAddCat(false)
  }

  async function renameCategoria(id, nome) {
    await supabase.from('categorie').update({ nome }).eq('id', id)
    await caricaCategorie()
  }

  async function deleteCategoria(id) {
    if (!confirm('Eliminare questa categoria e tutte le sue sotto-categorie?')) return
    await supabase.from('categorie').delete().eq('id', id)
    await caricaCategorie()
  }

  // ── CRUD SOTTO-CATEGORIE ────────────────────────────────────
  async function addSottoCategoria(categoriaId, nome) {
    await supabase.from('sotto_categorie').insert({ categoria_id: categoriaId, nome })
    await caricaCategorie()
  }

  async function renameSottoCategoria(id, nome) {
    await supabase.from('sotto_categorie').update({ nome }).eq('id', id)
    await caricaCategorie()
  }

  async function deleteSottoCategoria(id) {
    if (!confirm('Eliminare questa sotto-categoria e tutte le sue tipologie?')) return
    await supabase.from('sotto_categorie').delete().eq('id', id)
    await caricaCategorie()
  }

  // ── CRUD TIPOLOGIE ──────────────────────────────────────────
  async function addTipologia(sottoCategoriaId, nome) {
    await supabase.from('tipologie').insert({ sotto_categoria_id: sottoCategoriaId, nome })
    await caricaCategorie()
  }

  async function renameTipologia(id, nome) {
    await supabase.from('tipologie').update({ nome }).eq('id', id)
    await caricaCategorie()
  }

  async function deleteTipologia(id) {
    await supabase.from('tipologie').delete().eq('id', id)
    await caricaCategorie()
  }

  const totSentenze = sentenze.length

  const categorieFiltered = categorie.filter(c =>
    !catSearch ||
    c.nome.toLowerCase().includes(catSearch.toLowerCase()) ||
    (c.sotto_categorie ?? []).some(s =>
      s.nome.toLowerCase().includes(catSearch.toLowerCase()) ||
      (s.tipologie ?? []).some(t => t.nome.toLowerCase().includes(catSearch.toLowerCase()))
    )
  )

  return (
    <div className="bg-slate border border-white/5">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-white/5 hover:bg-white/2 transition-colors">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={16} className="text-nebbia/40" /> : <ChevronRight size={16} className="text-nebbia/40" />}
          <FolderOpen size={16} className="text-oro/60" />
          <p className="font-display text-lg font-semibold text-nebbia">Categorie</p>
          <span className="font-body text-xs text-nebbia/30">
            {categorie.length} categorie · {totSentenze} sentenze totali
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-[10px] font-body text-nebbia/25">
          <span className="border border-oro/25 text-oro/70 px-2 py-0.5">1. Categoria</span>
          <ChevronRight size={10} />
          <span className="border border-salvia/25 text-salvia/70 px-2 py-0.5">2. Sotto-categoria</span>
          <ChevronRight size={10} />
          <span className="border border-white/15 px-2 py-0.5">3. Tipologia</span>
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
              <input placeholder="Cerca categoria, sotto-categoria, tipologia..."
                value={catSearch} onChange={e => setCatSearch(e.target.value)}
                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
              {catSearch && (
                <button onClick={() => setCatSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-oro">
                  <X size={13} />
                </button>
              )}
            </div>
            {addCat ? (
              <AddInline placeholder="Nome nuova categoria..." onSave={addCategoria} onCancel={() => setAddCat(false)} salvando={salvandoCat} />
            ) : (
              <button onClick={() => setAddCat(true)} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shrink-0">
                <Plus size={13} /> Nuova categoria
              </button>
            )}
          </div>

          <p className="font-body text-[10px] text-nebbia/25 px-1 pb-1 border-b border-white/5">
            Clicca su una categoria per espanderla. Passa il mouse sopra per rinominare o eliminare.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
            </div>
          ) : categorieFiltered.length === 0 ? (
            <p className="font-body text-sm text-nebbia/30 text-center py-6">
              {catSearch ? `Nessun risultato per "${catSearch}"` : 'Nessuna categoria'}
            </p>
          ) : categorieFiltered.map(cat => (
            <CategoriaRow key={cat.id} cat={cat} contatori={contatori}
              onRename={renameCategoria} onDelete={deleteCategoria}
              onAddSotto={addSottoCategoria} onRenameSotto={renameSottoCategoria} onDeleteSotto={deleteSottoCategoria}
              onAddTipo={addTipologia} onRenameTipo={renameTipologia} onDeleteTipo={deleteTipologia}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PAGINA PRINCIPALE
// ─────────────────────────────────────────────────────────────
export function AdminSentenze() {
  const [sentenze, setSentenze] = useState([])
  const [guadagni, setGuadagni] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statoF, setStatoF] = useState('')

  useEffect(() => {
    async function carica() {
      setLoading(true)
      const { data } = await supabase
        .from('sentenze')
        .select(`
    id, titolo, categoria, sotto_categoria, tipologia,
    stato, accessi, created_at,
    autore:autore_id(nome, cognome)
  `)
        .order('created_at', { ascending: false })
      setSentenze(data ?? [])
      setLoading(false)

      // Guadagni
      const { data: acc } = await supabase.from('accessi_sentenze').select('sentenza_id, quota_autore')
      const map = {}
        ; (acc ?? []).forEach(a => { map[a.sentenza_id] = (map[a.sentenza_id] ?? 0) + parseFloat(a.quota_autore ?? 0) })
      setGuadagni(map)
    }
    carica()
  }, [])

  async function toggleStato(id, statoAttuale) {
    const nuovoStato = statoAttuale === 'pubblica' ? 'sospesa' : 'pubblica'
    await supabase.from('sentenze').update({ stato: nuovoStato }).eq('id', id)
    setSentenze(prev => prev.map(s => s.id === id ? { ...s, stato: nuovoStato } : s))
  }

  async function elimina(id) {
    if (!confirm('Eliminare definitivamente questa sentenza?')) return
    await supabase.from('sentenze').delete().eq('id', id)
    setSentenze(prev => prev.filter(s => s.id !== id))
  }

  const rows = sentenze.filter(s => {
    if (statoF && s.stato !== statoF) return false
    if (search) {
      const avv = `${s.autore?.nome ?? ''} ${s.autore?.cognome ?? ''}`
      const cat = `${s.categoria ?? ''} ${s.sotto_categoria ?? ''} ${s.tipologia ?? ''}`
      if (!`${s.titolo} ${avv} ${cat}`.toLowerCase().includes(search.toLowerCase())) return false
    }
    return true
  })

  const STATO_BADGE = {
    pubblica: { label: 'Pubblica', variant: 'salvia' },
    in_revisione: { label: 'In revisione', variant: 'warning' },
    sospesa: { label: 'Sospesa', variant: 'gray' },
  }

  return (
    <div className="space-y-6">
      <PageHeader label="Admin" title="Banca dati"
        subtitle="Gestisci categorie (3 livelli) e modera le sentenze caricate dagli avvocati" />

      <BloccoCategorie sentenze={sentenze} />

      <div className="space-y-4">
        <p className="font-display text-lg font-semibold text-nebbia">
          Sentenze <span className="font-body text-sm text-nebbia/40 font-normal ml-2">{sentenze.length} totali</span>
        </p>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
            <input placeholder="Cerca titolo, avvocato, categoria..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25" />
          </div>
          <select value={statoF} onChange={e => setStatoF(e.target.value)}
            className="bg-slate border border-white/10 text-nebbia font-body text-sm px-4 py-2.5 outline-none focus:border-oro/50">
            <option value="">Tutti gli stati</option>
            <option value="pubblica">Pubblica</option>
            <option value="in_revisione">In revisione</option>
            <option value="sospesa">Sospesa</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="bg-slate border border-white/5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Titolo', 'Avvocato', 'Categoria', 'Accessi', 'Guadagno', 'Stato', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center font-body text-sm text-nebbia/30">
                    {sentenze.length === 0 ? 'Nessuna sentenza caricata' : 'Nessun risultato'}
                  </td></tr>
                ) : rows.map(s => {
                  const avv = `${s.autore?.nome ?? ''} ${s.autore?.cognome ?? ''}`.trim()
                  const cat = [s.categoria, s.sotto_categoria, s.tipologia].filter(Boolean).join(' › ')
                  const sb = STATO_BADGE[s.stato] ?? STATO_BADGE.in_revisione
                  return (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-petrolio/40 transition-colors">
                      <td className="px-4 py-3 font-body text-sm font-medium text-nebbia max-w-xs truncate">{s.titolo}</td>
                      <td className="px-4 py-3 font-body text-sm text-nebbia/60">Avv. {avv}</td>
                      <td className="px-4 py-3 font-body text-xs text-nebbia/50">{cat || '—'}</td>
                      <td className="px-4 py-3 font-body text-sm text-oro">{s.accessi ?? 0}</td>
                      <td className="px-4 py-3 font-body text-sm text-salvia">€ {(guadagni[s.id] ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3"><Badge label={sb.label} variant={sb.variant} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 items-center">
                          <Link to={`/admin/sentenze/${s.id}`} className="font-body text-xs text-oro hover:text-oro/70">Dettaglio →</Link>
                          <button onClick={() => elimina(s.id)} className="text-nebbia/20 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DETTAGLIO SENTENZA
// ─────────────────────────────────────────────────────────────
export function AdminSentenzeDettaglio() {
  const { id } = useParams()
  const [s, setS] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guadagno, setGuadagno] = useState(0)
  const [nAccessi, setNAccessi] = useState(0)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [cambiando, setCambiando] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    async function carica() {
      setLoading(true)
      const { data: sentenza } = await supabase
        .from('sentenze')
        .select('*, autore:autore_id(nome, cognome, email)')
        .eq('id', id).single()

      if (sentenza) {
        setS(sentenza)
        if (sentenza.storage_path) {
          const { data } = await supabase.storage.from('sentenze').createSignedUrl(sentenza.storage_path, 3600)
          setPdfUrl(data?.signedUrl ?? null)
        }
        const { data: acc } = await supabase.from('accessi_sentenze').select('quota_autore').eq('sentenza_id', id)
        const tot = (acc ?? []).reduce((a, c) => a + parseFloat(c.quota_autore ?? 0), 0)
        setNAccessi(acc?.length ?? 0)
        setGuadagno(tot)
      }
      setLoading(false)
    }
    carica()
  }, [id])

  async function cambiaStato(nuovoStato) {
    setCambiando(true)
    setErrore('')
    const { error } = await supabase.from('sentenze').update({ stato: nuovoStato }).eq('id', id)
    if (error) { setErrore(error.message); setCambiando(false); return }
    setS(prev => ({ ...prev, stato: nuovoStato }))
    setCambiando(false)
  }

  async function elimina() {
    if (!confirm('Eliminare definitivamente questa sentenza?')) return
    await supabase.from('sentenze').delete().eq('id', id)
    window.history.back()
  }

  if (loading) return <div className="flex items-center justify-center py-40"><span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" /></div>
  if (!s) return <div className="space-y-5"><BackButton to="/admin/sentenze" label="Banca dati" /><p className="font-body text-sm text-nebbia/40">Sentenza non trovata.</p></div>

  const STATO_BADGE = {
    pubblica: { label: 'Pubblica', variant: 'salvia' },
    in_revisione: { label: 'In revisione', variant: 'warning' },
    sospesa: { label: 'Sospesa', variant: 'gray' },
  }
  const sb = STATO_BADGE[s.stato] ?? STATO_BADGE.in_revisione
  const cat = [s.categoria, s.sotto_categoria, s.tipologia].filter(Boolean).join(' › ')

  return (
    <div className="space-y-6">
      <BackButton to="/admin/sentenze" label="Banca dati" />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="section-label mb-2">Sentenza</p>
          <h1 className="font-display text-3xl font-light text-nebbia">{s.titolo}</h1>
          <p className="font-body text-xs text-nebbia/40 mt-1">{cat} · {s.tribunale} · {s.anno}</p>
        </div>
        <Badge label={sb.label} variant={sb.variant} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Accessi totali" value={nAccessi} colorClass="text-oro" />
        <StatCard label="Guadagno generato" value={`€ ${guadagno.toFixed(2)}`} colorClass="text-salvia" />
        <StatCard label="Caricata il" value={new Date(s.created_at).toLocaleDateString('it-IT')} colorClass="text-nebbia/50" />
      </div>

      <div className="bg-slate border border-white/5 p-6 space-y-4">
        <p className="section-label">Metadati</p>
        {[
          ['Avvocato', `Avv. ${s.autore?.nome ?? ''} ${s.autore?.cognome ?? ''}`.trim()],
          ['Email', s.autore?.email ?? '—'],
          ['Categoria', cat || '—'],
          ['Tags', (s.tags ?? []).join(', ') || '—'],
          ['Caricata il', new Date(s.created_at).toLocaleDateString('it-IT')],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between border-b border-white/5 pb-3">
            <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
            <span className="font-body text-sm text-nebbia">{v}</span>
          </div>
        ))}
        {s.descrizione && (
          <div>
            <p className="font-body text-xs text-nebbia/30 uppercase tracking-widest mb-2">Massima</p>
            <p className="font-body text-sm text-nebbia/60 leading-relaxed">{s.descrizione}</p>
          </div>
        )}
      </div>

      <div className="bg-slate border border-white/5 p-6">
        <p className="section-label mb-4">Documento</p>
        {pdfUrl ? (
          <div className="space-y-3">
            <iframe src={pdfUrl} className="w-full rounded" style={{ height: 600 }} title={s.titolo} />
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn-secondary text-sm inline-flex items-center gap-2">
              <Download size={13} /> Scarica PDF
            </a>
          </div>
        ) : (
          <div className="border border-white/8 p-8 flex flex-col items-center text-center bg-petrolio/40">
            <FileText size={36} className="text-nebbia/15 mb-3" />
            <p className="font-body text-sm text-nebbia/30">Documento non disponibile</p>
          </div>
        )}
      </div>

      <div className="bg-slate border border-white/5 p-6">
        <p className="section-label mb-4">Moderazione</p>
        {errore && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-body p-3 bg-red-900/10 border border-red-500/20 mb-4">
            <AlertCircle size={14} /> {errore}
          </div>
        )}
        <div className="flex gap-3 flex-wrap">
          {s.stato !== 'pubblica' && (
            <button onClick={() => cambiaStato('pubblica')} disabled={cambiando}
              className="flex items-center gap-2 font-body text-sm px-4 py-2.5 border border-salvia/30 text-salvia hover:bg-salvia/10 transition-colors disabled:opacity-40">
              <Eye size={14} /> Pubblica
            </button>
          )}
          {s.stato === 'pubblica' && (
            <button onClick={() => cambiaStato('sospesa')} disabled={cambiando}
              className="flex items-center gap-2 font-body text-sm px-4 py-2.5 border border-amber-500/30 text-amber-400 hover:bg-amber-900/10 transition-colors disabled:opacity-40">
              <EyeOff size={14} /> Sospendi
            </button>
          )}
          {s.stato === 'in_revisione' && (
            <button onClick={() => cambiaStato('sospesa')} disabled={cambiando}
              className="flex items-center gap-2 font-body text-sm px-4 py-2.5 border border-white/10 text-nebbia/40 hover:border-amber-500/30 hover:text-amber-400 transition-colors disabled:opacity-40">
              <EyeOff size={14} /> Rifiuta
            </button>
          )}
          <button onClick={elimina}
            className="flex items-center gap-2 font-body text-sm px-4 py-2.5 border border-red-500/30 text-red-400 hover:bg-red-900/10 transition-colors">
            <Trash2 size={14} /> Elimina definitivamente
          </button>
        </div>
      </div>
    </div>
  )
}