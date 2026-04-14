import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { PageHeader, InputField } from '@/components/shared'

export default function ClienteProfilo() {
    const { profile } = useAuth()
    const [form, setForm] = useState({
        nome: profile?.nome ?? '',
        cognome: profile?.cognome ?? '',
        telefono: profile?.telefono ?? '',
        email: profile?.email ?? '',
        cf: profile?.cf ?? '',
        indirizzo: profile?.indirizzo ?? '',
    })
    const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

    return (
        <div className="space-y-5 max-w-2xl">
            <PageHeader label="Account" title="Il mio profilo" />

            {/* Info account */}
            <div className="bg-slate border border-white/5 p-5 space-y-3">
                <p className="section-label mb-1">Informazioni account</p>
                {[
                    ['Ruolo', 'Cliente'],
                    ['Studio', profile?.studio ?? '-'],
                    ['Avvocato', profile?.avvocato_id ? 'Assegnato' : '-'],
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
                <InputField label="Email" type="email"                     {...f('email')} />
                <InputField label="Indirizzo" placeholder="Via Roma 1, Milano" {...f('indirizzo')} />
                <button className="btn-primary text-sm">Salva modifiche</button>
            </div>

            {/* Password */}
            <div className="bg-slate border border-white/5 p-6 space-y-4">
                <p className="section-label">Cambia password</p>
                {['Nuova password', 'Conferma password'].map(l => (
                    <InputField key={l} label={l} type="password" placeholder="••••••••" />
                ))}
                <button className="btn-secondary text-sm">Aggiorna password</button>
            </div>
        </div>
    )
}