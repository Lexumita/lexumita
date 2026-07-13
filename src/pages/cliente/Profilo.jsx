// src/pages/cliente/Profilo.jsx
//
// Profilo del cliente nel portale. Prima era un placeholder (bottoni senza
// handler). Ora: salvataggio anagrafica su profiles + cambio password via
// supabase.auth.updateUser. L'email resta in sola lettura (cambiarla richiede
// il flusso di verifica auth, non gestito qui).

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTipoStudio } from '@/hooks/useTipoStudio'
import { PageHeader, InputField } from '@/components/shared'
import { supabase } from '@/lib/supabase'

export default function ClienteProfilo() {
    const { profile } = useAuth()
    const { labelProfessionista } = useTipoStudio()

    const [form, setForm] = useState({
        nome: profile?.nome ?? '',
        cognome: profile?.cognome ?? '',
        telefono: profile?.telefono ?? '',
        cf: profile?.cf ?? '',
        indirizzo: profile?.indirizzo ?? '',
    })
    const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

    const [salvando, setSalvando] = useState(false)
    const [esitoProfilo, setEsitoProfilo] = useState(null) // { ok, msg }

    const [pw, setPw] = useState({ nuova: '', conferma: '' })
    const [pwLoading, setPwLoading] = useState(false)
    const [esitoPw, setEsitoPw] = useState(null)

    async function salvaProfilo() {
        setSalvando(true); setEsitoProfilo(null)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setSalvando(false); setEsitoProfilo({ ok: false, msg: 'Sessione scaduta. Rientra e riprova.' }); return }
        const { error } = await supabase
            .from('profiles')
            .update({
                nome: form.nome.trim() || null,
                cognome: form.cognome.trim() || null,
                telefono: form.telefono.trim() || null,
                cf: form.cf.trim() || null,
                indirizzo: form.indirizzo.trim() || null,
            })
            .eq('id', user.id)
        setSalvando(false)
        setEsitoProfilo(error ? { ok: false, msg: error.message } : { ok: true, msg: 'Dati salvati.' })
    }

    async function aggiornaPassword() {
        setEsitoPw(null)
        if (pw.nuova.length < 8) { setEsitoPw({ ok: false, msg: 'La password deve avere almeno 8 caratteri.' }); return }
        if (pw.nuova !== pw.conferma) { setEsitoPw({ ok: false, msg: 'Le due password non coincidono.' }); return }
        setPwLoading(true)
        const { error } = await supabase.auth.updateUser({ password: pw.nuova })
        setPwLoading(false)
        if (error) { setEsitoPw({ ok: false, msg: error.message }); return }
        setPw({ nuova: '', conferma: '' })
        setEsitoPw({ ok: true, msg: 'Password aggiornata.' })
    }

    const esitoCls = (e) => e.ok ? 'text-salvia' : 'text-red-400'

    return (
        <div className="space-y-5 max-w-2xl">
            <PageHeader label="Account" title="Il mio profilo" />

            {/* Info account */}
            <div className="bg-slate border border-white/5 p-5 space-y-3">
                <p className="section-label mb-1">Informazioni account</p>
                {[
                    ['Ruolo', 'Cliente'],
                    ['Email', profile?.email ?? '-'],
                    ['Studio', profile?.studio ?? '-'],
                    [labelProfessionista, profile?.avvocato_id ? 'Assegnato' : '-'],
                ].map(([l, v]) => (
                    <div key={l} className="flex justify-between border-b border-white/5 pb-2">
                        <span className="font-body text-xs text-nebbia/30 uppercase tracking-widest">{l}</span>
                        <span className="font-body text-sm text-nebbia">{v}</span>
                    </div>
                ))}
            </div>

            {/* Dati personali */}
            <div className="bg-slate border border-white/5 p-6 space-y-5">
                <p className="section-label">Dati personali</p>
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="Nome"    {...f('nome')} />
                    <InputField label="Cognome" {...f('cognome')} />
                </div>
                <InputField label="Codice fiscale" placeholder="RSSMRA80A01H501U" {...f('cf')} />
                <InputField label="Telefono" placeholder="+39 02 1234567"    {...f('telefono')} />
                <InputField label="Indirizzo" placeholder="Via Roma 1, Milano" {...f('indirizzo')} />
                <div className="flex items-center gap-3">
                    <button onClick={salvaProfilo} disabled={salvando} className="btn-primary text-sm disabled:opacity-50">
                        {salvando ? 'Salvataggio…' : 'Salva modifiche'}
                    </button>
                    {esitoProfilo && <span className={`font-body text-sm ${esitoCls(esitoProfilo)}`}>{esitoProfilo.msg}</span>}
                </div>
            </div>

            {/* Password */}
            <div className="bg-slate border border-white/5 p-6 space-y-4">
                <p className="section-label">Cambia password</p>
                <InputField label="Nuova password" type="password" placeholder="••••••••"
                    value={pw.nuova} onChange={e => setPw(p => ({ ...p, nuova: e.target.value }))} />
                <InputField label="Conferma password" type="password" placeholder="••••••••"
                    value={pw.conferma} onChange={e => setPw(p => ({ ...p, conferma: e.target.value }))} />
                <div className="flex items-center gap-3">
                    <button onClick={aggiornaPassword} disabled={pwLoading} className="btn-secondary text-sm disabled:opacity-50">
                        {pwLoading ? 'Aggiornamento…' : 'Aggiorna password'}
                    </button>
                    {esitoPw && <span className={`font-body text-sm ${esitoCls(esitoPw)}`}>{esitoPw.msg}</span>}
                </div>
            </div>
        </div>
    )
}
