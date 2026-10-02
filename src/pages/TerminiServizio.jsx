// src/pages/TerminiServizio.jsx
import { FileText, AlertCircle, Shield, CreditCard } from 'lucide-react'
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

export default function TerminiServizio() {
  const { t } = useTranslation('termini')
  // Le voci di un elenco del JSON, una <li> ciascuna
  const voci = (chiave) => t(chiave, { returnObjects: true }).map((voce, i) => <li key={i}>{voce}</li>)

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
          <div className="bg-slate border border-oro/15 p-4 flex items-start gap-3">
            <AlertCircle size={14} className="text-oro shrink-0 mt-0.5" />
            <p className="font-body text-xs text-nebbia/50 leading-relaxed">
              {t('header.notice')}
            </p>
          </div>
        </div>

        {/* 1. Parti */}
        <Section title={t('parti.title')}>
          <p>
            {t('parti.intro')}
          </p>
          <div className="bg-slate border border-white/5 p-5 space-y-1.5">
            <p className="font-medium text-nebbia">{t('parti.company')}</p>
            <p>{t('parti.company_id')}</p>
            <p>{t('parti.address')}</p>
            <p className="text-nebbia/40 text-xs mt-2">{t('parti.company_alias')}</p>
          </div>
          <p>{t('parti.utente')}</p>
        </Section>

        {/* 2. Descrizione */}
        <Section title={t('descrizione.title')}>
          <p>
            {t('descrizione.intro')}
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            {voci('descrizione.items')}
          </ul>
          <p>
            {t('descrizione.supporto')}
          </p>
        </Section>

        {/* 3. Registrazione */}
        <Section title={t('registrazione.title')}>
          <Sub title={t('registrazione.requisiti.title')}>
            <p>
              {t('registrazione.requisiti.text')}
            </p>
          </Sub>
          <Sub title={t('registrazione.obblighi.title')}>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {voci('registrazione.obblighi.items')}
            </ul>
          </Sub>
          <Sub title={t('registrazione.studio.title')}>
            <p>
              {t('registrazione.studio.text')}
            </p>
          </Sub>
        </Section>

        {/* 4. Piani */}
        <Section title={t('piani.title')}>
          <Sub title={t('piani.disponibili.title')}>
            <p>
              {t('piani.disponibili.text')}
            </p>
          </Sub>
          <Sub title={t('piani.fatturazione.title')}>
            <p>
              {t('piani.fatturazione.text')}
            </p>
          </Sub>
          <Sub title={t('piani.durata.title')}>
            <p>
              {t('piani.durata.text')}
            </p>
          </Sub>
          <Sub title={t('piani.scadenza.title')}>
            <p>
              {t('piani.scadenza.text')}
            </p>
          </Sub>
          <Sub title={t('piani.rimborsi.title')}>
            <p>
              {t('piani.rimborsi.text')}
            </p>
          </Sub>
          <Sub title={t('piani.crediti.title')}>
            <p>
              {t('piani.crediti.text')}
            </p>
          </Sub>
          <Sub title={t('piani.prova.title')}>
            <p>
              {t('piani.prova.intro')}
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {voci('piani.prova.items')}
            </ul>
            <p>
              {t('piani.prova.modifiche')}
            </p>
          </Sub>
        </Section>

        {/* 5. Contenuti */}
        <Section title={t('contenuti.title')}>
          <Sub title={t('contenuti.proprieta.title')}>
            <p>
              {t('contenuti.proprieta.text')}
            </p>
          </Sub>
          <Sub title={t('contenuti.licenza.title')}>
            <p>
              {t('contenuti.licenza.text')}
            </p>
          </Sub>
          <Sub title={t('contenuti.banca_dati.title')}>
            <p>
              {t('contenuti.banca_dati.text')}
            </p>
          </Sub>
          <Sub title={t('contenuti.vietati.title')}>
            <p>{t('contenuti.vietati.intro')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {voci('contenuti.vietati.items')}
            </ul>
          </Sub>
          <Sub title={t('contenuti.responsabilita.title')}>
            <p>
              {t('contenuti.responsabilita.text')}
            </p>
          </Sub>
        </Section>

        {/* 6. Uso accettabile */}
        <Section title={t('uso.title')}>
          <p>{t('uso.intro')}</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            {voci('uso.items')}
          </ul>
        </Section>

        {/* 7. AI */}
        <Section title={t('ai.title')}>
          <Sub title={t('ai.natura.title')}>
            <p>
              {t('ai.natura.text')}
            </p>
          </Sub>
          <Sub title={t('ai.limitazioni.title')}>
            <p>
              {t('ai.limitazioni.text')}
            </p>
          </Sub>
          <Sub title={t('ai.utilizzo.title')}>
            <p>
              {t('ai.utilizzo.text')}
            </p>
          </Sub>
        </Section>

        {/* 8. Disponibilità */}
        <Section title={t('disponibilita.title')}>
          <p>
            {t('disponibilita.uptime')}
          </p>
          <p>
            {t('disponibilita.manutenzioni')}
          </p>
          <p>
            {t('disponibilita.forza_maggiore')}
          </p>
        </Section>

        {/* 9. Limitazione responsabilità */}
        <Section title={t('responsabilita.title')}>
          <p>
            {t('responsabilita.intro')}
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            {voci('responsabilita.items')}
          </ul>
        </Section>

        {/* 10. Proprietà intellettuale */}
        <Section title={t('proprieta.title')}>
          <p>
            {t('proprieta.piattaforma')}
          </p>
          <p>
            {t('proprieta.divieto')}
          </p>
        </Section>

        {/* 11. Risoluzione */}
        <Section title={t('risoluzione.title')}>
          <Sub title={t('risoluzione.utente.title')}>
            <p>
              {t('risoluzione.utente.text')}
            </p>
          </Sub>
          <Sub title={t('risoluzione.sospensione.title')}>
            <p>
              {t('risoluzione.sospensione.intro')}
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {voci('risoluzione.sospensione.items')}
            </ul>
            <p>
              {t('risoluzione.sospensione.preavviso')}
            </p>
          </Sub>
          <Sub title={t('risoluzione.effetti.title')}>
            <p>
              {t('risoluzione.effetti.text')}
            </p>
          </Sub>
        </Section>

        {/* 12. Legge applicabile */}
        <Section title={t('legge.title')}>
          <p>
            {t('legge.diritto')}
          </p>
          <p>
            {t('legge.foro')}
          </p>
          <p>
            {t('legge.amichevole')}
          </p>
        </Section>

        {/* 13. Modifiche */}
        <Section title={t('modifiche.title')}>
          <p>
            {t('modifiche.diritto')}
          </p>
          <p>
            {t('modifiche.accettazione')}
          </p>
        </Section>

        {/* 14. Disposizioni finali */}
        <Section title={t('finali.title')}>
          <p>
            {t('finali.invalidita')}
          </p>
          <p>
            {t('finali.rinuncia')}
          </p>
          <p>
            <Trans t={t} i18nKey="finali.comunicazioni" components={{ mail: <a href="mailto:info@lexum.it" className="text-oro hover:text-oro/70 transition-colors" /> }} />
          </p>
        </Section>

        {/* Footer */}
        <div className="bg-slate border border-white/5 p-5 flex items-start gap-3">
          <FileText size={14} className="text-nebbia/30 shrink-0 mt-0.5" />
          <p className="font-body text-xs text-nebbia/40 leading-relaxed">
            <Trans t={t} i18nKey="footer.text" components={{ mail: <a href="mailto:info@lexum.it" className="text-oro hover:text-oro/70 transition-colors ml-1" /> }} />
          </p>
        </div>

      </div>
    </div>
  )
}
