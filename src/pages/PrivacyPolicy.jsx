// src/pages/PrivacyPolicy.jsx
import { Shield, Lock, Eye, Server, Mail, FileText } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useTranslation, Trans } from 'react-i18next'

function Section({ title, children }) {
    return (
        <div className="space-y-4">
            <h2 className="font-display text-2xl font-light text-nebbia border-b border-white/5 pb-3">{title}</h2>
            <div className="font-body text-sm text-nebbia/60 leading-relaxed space-y-3">
                {children}
            </div>
        </div>
    )
}

function Sub({ title, children }) {
    return (
        <div className="space-y-2 pl-4 border-l border-white/8">
            <p className="font-body text-sm font-medium text-nebbia/80">{title}</p>
            <div className="font-body text-sm text-nebbia/55 leading-relaxed space-y-2">{children}</div>
        </div>
    )
}

export default function PrivacyPolicy() {
    const { t } = useTranslation('privacy')

    return (
        <div className="min-h-screen bg-petrolio text-nebbia pt-20">
            <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">
                <Helmet>
                    <title>{t('meta.title')}</title>
                    <meta
                        name="description"
                        content={t('meta.description')}
                    />
                    <meta name="robots" content="noindex, follow" />
                    <link rel="canonical" href="https://www.lexum.it/privacy" />
                </Helmet>
                {/* Header */}
                <div className="space-y-4">
                    <p className="font-body text-xs text-salvia/60 tracking-[0.3em] uppercase">{t('header.label')}</p>
                    <h1 className="font-display text-5xl font-light text-nebbia">{t('header.title')}</h1>
                    <p className="font-body text-sm text-nebbia/40">
                        {t('header.updated', { data: new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) })}
                    </p>
                    <div className="bg-slate border border-salvia/15 p-4 flex items-start gap-3">
                        <Shield size={14} className="text-salvia shrink-0 mt-0.5" />
                        <p className="font-body text-xs text-nebbia/50 leading-relaxed">
                            {t('header.notice')}
                        </p>
                    </div>
                </div>

                {/* 1. Titolare */}
                <Section title={t('titolare.title')}>
                    <p>
                        {t('titolare.intro')}
                    </p>
                    <div className="bg-slate border border-white/5 p-5 space-y-1.5">
                        <p className="font-medium text-nebbia">{t('titolare.company')}</p>
                        <p>{t('titolare.company_id')}</p>
                        <p>{t('titolare.address')}</p>
                        <p><Trans t={t} i18nKey="titolare.email" components={{ mail: <a href="mailto:privacy@lexum.it" className="text-oro hover:text-oro/70 transition-colors" /> }} /></p>
                    </div>
                    <p>
                        {t('titolare.ue')}
                    </p>
                </Section>

                {/* 2. Dati raccolti */}
                <Section title={t('dati.title')}>
                    <Sub title={t('dati.forniti.title')}>
                        <p>{t('dati.forniti.intro')}</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            {t('dati.forniti.items', { returnObjects: true }).map((voce, i) => (
                                <li key={i}>{voce}</li>
                            ))}
                        </ul>
                    </Sub>
                    <Sub title={t('dati.automatici.title')}>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            {t('dati.automatici.items', { returnObjects: true }).map((voce, i) => (
                                <li key={i}>{voce}</li>
                            ))}
                        </ul>
                    </Sub>
                    <Sub title={t('dati.particolari.title')}>
                        <p>
                            {t('dati.particolari.text')}
                        </p>
                    </Sub>
                </Section>

                {/* 3. Finalità */}
                <Section title={t('finalita.title')}>
                    <div className="space-y-4">
                        {t('finalita.items', { returnObjects: true }).map(({ finalita, base, desc }) => (
                            <div key={finalita} className="bg-slate border border-white/5 p-4 space-y-1.5">
                                <p className="font-body text-sm font-medium text-nebbia">{finalita}</p>
                                <p className="font-body text-xs text-oro/70">{base}</p>
                                <p className="font-body text-xs text-nebbia/45 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* 4. Destinatari */}
                <Section title={t('destinatari.title')}>
                    <p>
                        {t('destinatari.intro')}
                    </p>
                    <ul className="list-disc list-inside space-y-2 pl-2">
                        {t('destinatari.items', { returnObjects: true }).map((_, i) => (
                            <li key={i}><Trans t={t} i18nKey={`destinatari.items.${i}`} components={{ hl: <span className="text-nebbia/80" /> }} /></li>
                        ))}
                    </ul>
                    <p>
                        {t('destinatari.dpa')}
                    </p>
                </Section>

                {/* 5. Conservazione */}
                <Section title={t('conservazione.title')}>
                    <div className="space-y-3">
                        {t('conservazione.items', { returnObjects: true }).map(({ tipo, periodo }) => (
                            <div key={tipo} className="flex justify-between gap-4 py-2 border-b border-white/5">
                                <span className="font-body text-sm text-nebbia/70">{tipo}</span>
                                <span className="font-body text-xs text-nebbia/40 text-right max-w-xs">{periodo}</span>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* 6. Diritti */}
                <Section title={t('diritti.title')}>
                    <p>
                        {t('diritti.intro')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {t('diritti.items', { returnObjects: true }).map(({ diritto, desc }) => (
                            <div key={diritto} className="bg-slate border border-white/5 p-3 space-y-1">
                                <p className="font-body text-xs font-medium text-nebbia/80">{diritto}</p>
                                <p className="font-body text-xs text-nebbia/40 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                    <p>
                        <Trans t={t} i18nKey="diritti.esercizio" components={{
                            mail: <a href="mailto:privacy@lexum.it" className="text-oro hover:text-oro/70 transition-colors" />,
                            garante: <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-oro hover:text-oro/70 transition-colors" />,
                        }} />
                    </p>
                </Section>

                {/* 7. Sicurezza */}
                <Section title={t('sicurezza.title')}>
                    <p>
                        {t('sicurezza.intro')}
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        {t('sicurezza.items', { returnObjects: true }).map((voce, i) => (
                            <li key={i}>{voce}</li>
                        ))}
                    </ul>
                    <p>
                        {t('sicurezza.breach')}
                    </p>
                </Section>

                {/* 8. Cookie */}
                <Section title={t('cookie.title')}>
                    <p>
                        {t('cookie.text')}
                    </p>
                </Section>

                {/* 9. Modifiche */}
                <Section title={t('modifiche.title')}>
                    <p>
                        {t('modifiche.text')}
                    </p>
                </Section>

                {/* Footer */}
                <div className="bg-slate border border-white/5 p-5 flex items-start gap-3">
                    <Mail size={14} className="text-nebbia/30 shrink-0 mt-0.5" />
                    <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                        <Trans t={t} i18nKey="footer.text" components={{ mail: <a href="mailto:privacy@lexum.it" className="text-oro hover:text-oro/70 transition-colors" /> }} />
                    </p>
                </div>

            </div>
        </div>
    )
}