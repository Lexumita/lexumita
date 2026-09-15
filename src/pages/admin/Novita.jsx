// src/pages/admin/Novita.jsx
//
// Il blog "Novità" della vetrina, scritto qui. Le bozze restano invisibili
// fuori da questa pagina; alla pubblicazione il sito si rigenera da solo, così
// l'articolo nasce con la sua testata per Google e per le anteprime dei link.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared'
import {
    Plus, Save, Send, Eye, Trash2, Loader2, ArrowLeft,
    RefreshCw, AlertCircle, CheckCircle, Newspaper, Link2,
} from 'lucide-react'
import { slugDa, firmaAutore, fmtDataLunga } from '@/lib/novita'

const VUOTO = {
    titolo: '', slug: '', sommario: '', contenuto: '',
    autore: '', categoria: '', copertina_url: '', stato: 'bozza',
}

const CAMPO = 'w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-3 py-2.5 outline-none focus:border-oro/50 transition-colors'
const ETICHETTA = 'block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-1.5'
const BOTTONE = 'flex items-center justify-center gap-2 min-h-[42px] px-4 border border-white/10 text-nebbia/60 font-body text-sm hover:text-oro hover:border-oro/30 transition-colors disabled:opacity-40'

export default function AdminNovita() {
    const { profile } = useAuth()
    const [articoli, setArticoli] = useState([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState(null)          // null = elenco, oggetto = editor
    const [salvando, setSalvando] = useState(false)
    const [msg, setMsg] = useState('')
    const [errore, setErrore] = useState('')
    const [hook, setHook] = useState('')
    const [salvandoHook, setSalvandoHook] = useState(false)

    async function carica() {
        const { data } = await supabase
            .from('novita')
            .select('*')
            .order('created_at', { ascending: false })
        setArticoli(data ?? [])
        setLoading(false)
    }

    useEffect(() => {
        carica()
        supabase.from('impostazioni_sito').select('valore').eq('chiave', 'vercel_deploy_hook').maybeSingle()
            .then(({ data }) => setHook(data?.valore ?? ''))
    }, [])

    async function rigeneraSito() {
        const { data, error } = await supabase.functions.invoke('rigenera-sito')
        if (error) return 'Il sito non è ripartito: controlla l\'indirizzo di rilascio.'
        if (data?.ok === false) return data.error
        return null
    }

    async function salva(pubblica) {
        if (!form.titolo.trim()) {
            setErrore('Manca il titolo.')
            return
        }
        setSalvando(true)
        setErrore('')
        setMsg('')

        const riga = {
            titolo: form.titolo.trim(),
            slug: (form.slug || slugDa(form.titolo)).trim(),
            sommario: form.sommario?.trim() || null,
            contenuto: form.contenuto ?? '',
            autore: form.autore?.trim() || null,
            categoria: form.categoria?.trim() || null,
            copertina_url: form.copertina_url?.trim() || null,
            stato: pubblica ? 'pubblicato' : form.stato,
        }

        const { error } = form.id
            ? await supabase.from('novita').update(riga).eq('id', form.id)
            : await supabase.from('novita').insert({ ...riga, creato_da: profile?.id })

        setSalvando(false)
        if (error) {
            setErrore(error.code === '23505' ? 'Esiste già un articolo con questo indirizzo: cambia il titolo o lo slug.' : error.message)
            return
        }

        setMsg(pubblica ? 'Articolo pubblicato. Il sito si sta rigenerando.' : 'Bozza salvata.')
        setForm(null)
        carica()
        if (pubblica) {
            const problema = await rigeneraSito()
            if (problema) setErrore(problema)
        }
    }

    async function cambiaStato(a, stato) {
        await supabase.from('novita').update({ stato }).eq('id', a.id)
        carica()
        const problema = await rigeneraSito()
        setMsg(problema ? '' : stato === 'pubblicato' ? 'Articolo pubblicato.' : 'Articolo ritirato dalla vetrina.')
        if (problema) setErrore(problema)
    }

    async function elimina(a) {
        if (!confirm(`Eliminare "${a.titolo}"?`)) return
        await supabase.from('novita').delete().eq('id', a.id)
        carica()
        if (a.stato === 'pubblicato') await rigeneraSito()
    }

    async function salvaHook() {
        setSalvandoHook(true)
        setErrore('')
        const { error } = await supabase.from('impostazioni_sito').upsert({
            chiave: 'vercel_deploy_hook',
            valore: hook.trim() || null,
            aggiornato_il: new Date().toISOString(),
            aggiornato_da: profile?.id,
        })
        setSalvandoHook(false)
        if (error) setErrore(error.message)
        else setMsg('Indirizzo di rilascio salvato.')
    }

    // ─── EDITOR ───
    if (form) {
        const anteprimaSlug = (form.slug || slugDa(form.titolo)) || '…'
        return (
            <div className="space-y-5 pb-16">
                <button type="button" onClick={() => setForm(null)} className="flex items-center gap-2 font-body text-sm text-nebbia/40 hover:text-oro transition-colors">
                    <ArrowLeft size={15} /> Tutti gli articoli
                </button>

                <PageHeader
                    label="Novità"
                    title={form.id ? 'Modifica articolo' : 'Nuovo articolo'}
                    subtitle={`lexum.it/novita/${anteprimaSlug}`}
                />

                <div className="bg-slate border border-white/5 p-5 space-y-4">
                    <div>
                        <label className={ETICHETTA}>Titolo</label>
                        <input
                            className={CAMPO}
                            value={form.titolo}
                            onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))}
                            placeholder="Il Processo Civile Telematico arriva su Lexum"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                            <label className={ETICHETTA}>Indirizzo (slug)</label>
                            <input
                                className={CAMPO}
                                value={form.slug}
                                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                                placeholder={slugDa(form.titolo) || 'indirizzo-articolo'}
                            />
                        </div>
                        <div>
                            <label className={ETICHETTA}>Categoria</label>
                            <input
                                className={CAMPO}
                                value={form.categoria}
                                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                                placeholder="Funzioni nuove"
                            />
                        </div>
                        <div>
                            <label className={ETICHETTA}>Autore</label>
                            <input
                                className={CAMPO}
                                value={form.autore}
                                onChange={e => setForm(f => ({ ...f, autore: e.target.value }))}
                                placeholder="Lexum"
                            />
                            <p className="font-body text-xs text-nebbia/30 mt-1">Se lo lasci vuoto l'articolo si firma Lexum.</p>
                        </div>
                    </div>

                    <div>
                        <label className={ETICHETTA}>Sommario</label>
                        <textarea
                            rows={2}
                            className={`${CAMPO} resize-none`}
                            value={form.sommario}
                            onChange={e => setForm(f => ({ ...f, sommario: e.target.value }))}
                            placeholder="Una o due righe: è quello che si legge nell'elenco e nelle anteprime dei link."
                        />
                    </div>

                    <div>
                        <label className={ETICHETTA}>Immagine di copertina (indirizzo)</label>
                        <input
                            className={CAMPO}
                            value={form.copertina_url}
                            onChange={e => setForm(f => ({ ...f, copertina_url: e.target.value }))}
                            placeholder="https://…"
                        />
                    </div>

                    <div>
                        <label className={ETICHETTA}>Testo</label>
                        <textarea
                            rows={18}
                            className={`${CAMPO} font-mono`}
                            value={form.contenuto}
                            onChange={e => setForm(f => ({ ...f, contenuto: e.target.value }))}
                            placeholder={'## Un sottotitolo\n\nIl testo dell\'articolo.\n\n- un elenco\n- di punti\n\n**Grassetto** e [collegamenti](https://www.lexum.it).'}
                        />
                        <p className="font-body text-xs text-nebbia/30 mt-1">
                            Si scrive in Markdown: <code className="text-salvia">##</code> per i sottotitoli, <code className="text-salvia">**grassetto**</code>, <code className="text-salvia">-</code> per gli elenchi.
                        </p>
                    </div>

                    {errore && (
                        <p className="flex items-start gap-2 font-body text-sm text-red-400">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {errore}
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button type="button" onClick={() => salva(true)} disabled={salvando} className="btn-primary text-sm justify-center">
                            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                            {form.stato === 'pubblicato' ? 'Aggiorna e ripubblica' : 'Pubblica'}
                        </button>
                        <button type="button" onClick={() => salva(false)} disabled={salvando} className={BOTTONE}>
                            <Save size={15} /> Salva bozza
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ─── ELENCO ───
    return (
        <div className="space-y-5 pb-16">
            <PageHeader
                label="Vetrina"
                title="Novità"
                subtitle="Gli articoli pubblicati qui compaiono su lexum.it/novita."
                action={
                    <button type="button" onClick={() => { setForm({ ...VUOTO }); setErrore(''); setMsg('') }} className="btn-primary text-sm">
                        <Plus size={15} /> Nuovo articolo
                    </button>
                }
            />

            {msg && (
                <p className="flex items-center gap-2 font-body text-sm text-salvia">
                    <CheckCircle size={15} /> {msg}
                </p>
            )}
            {errore && (
                <p className="flex items-start gap-2 font-body text-sm text-red-400">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {errore}
                </p>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={20} className="animate-spin text-oro" />
                </div>
            ) : articoli.length === 0 ? (
                <div className="bg-slate border border-white/5 p-10 text-center">
                    <Newspaper size={30} className="mx-auto text-nebbia/10 mb-3" />
                    <p className="font-body text-sm text-nebbia/40">Nessun articolo. Il primo può raccontare l'ultima funzione uscita.</p>
                </div>
            ) : (
                <div className="bg-slate border border-white/5 divide-y divide-white/5">
                    {articoli.map(a => (
                        <div key={a.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-body text-sm text-nebbia break-words">{a.titolo}</p>
                                    <span className={`font-body text-xs px-2 py-0.5 border ${a.stato === 'pubblicato'
                                        ? 'border-salvia/30 text-salvia bg-salvia/10'
                                        : 'border-white/10 text-nebbia/40'}`}
                                    >
                                        {a.stato === 'pubblicato' ? 'Pubblicato' : 'Bozza'}
                                    </span>
                                </div>
                                <p className="font-body text-xs text-nebbia/40 mt-1">
                                    {firmaAutore(a.autore)}
                                    {a.pubblicato_il && ` · ${fmtDataLunga(a.pubblicato_il)}`}
                                    {a.categoria && ` · ${a.categoria}`}
                                    <span className="text-nebbia/20"> · /novita/{a.slug}</span>
                                </p>
                            </div>
                            <div className="grid grid-cols-2 lg:flex gap-2">
                                <button type="button" onClick={() => { setForm({ ...VUOTO, ...a }); setErrore(''); setMsg('') }} className={BOTTONE}>
                                    Modifica
                                </button>
                                {a.stato === 'pubblicato' ? (
                                    <>
                                        <a href={`/novita/${a.slug}`} target="_blank" rel="noreferrer" className={BOTTONE}>
                                            <Eye size={15} /> Vedi
                                        </a>
                                        <button type="button" onClick={() => cambiaStato(a, 'bozza')} className={BOTTONE}>
                                            Ritira
                                        </button>
                                    </>
                                ) : (
                                    <button type="button" onClick={() => cambiaStato(a, 'pubblicato')} className={BOTTONE}>
                                        <Send size={15} /> Pubblica
                                    </button>
                                )}
                                <button type="button" onClick={() => elimina(a)} className={`${BOTTONE} hover:!text-red-400 hover:!border-red-500/30`}>
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Rilascio automatico del sito */}
            <div className="bg-slate border border-white/5 p-5 space-y-3">
                <p className="section-label">Rilascio del sito</p>
                <p className="font-body text-sm text-nebbia/50 leading-relaxed">
                    Quando pubblichi, il sito riparte da solo: serve perché l'articolo abbia il suo titolo su Google e
                    nelle anteprime dei link. Incolla qui l'indirizzo del "Deploy Hook" che trovi su Vercel, in
                    Impostazioni → Git → Deploy Hooks.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        className={CAMPO}
                        value={hook}
                        onChange={e => setHook(e.target.value)}
                        placeholder="https://api.vercel.com/v1/integrations/deploy/…"
                    />
                    <button type="button" onClick={salvaHook} disabled={salvandoHook} className={BOTTONE}>
                        {salvandoHook ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Salva
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            const problema = await rigeneraSito()
                            setErrore(problema ?? '')
                            setMsg(problema ? '' : 'Rilascio avviato.')
                        }}
                        className={BOTTONE}
                    >
                        <RefreshCw size={15} /> Rigenera ora
                    </button>
                </div>
            </div>
        </div>
    )
}
