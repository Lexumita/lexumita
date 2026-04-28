// src/pages/avvocato/BancaDati.jsx
// Pagina "Banca dati" — 4 tab primari: Italiana | UE | Sentenze | Prassi
// Salvataggio in pratica tramite popover inline (no pannello laterale)

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared'
import AggiungiAEtichetta from '@/components/AggiungiAEtichetta'
import { rottaSentenza } from '@/lib/rotte'
import {
    Search, Sparkles, ChevronRight, ChevronLeft,
    BookOpen, AlertCircle, ArrowRight, X, Save,
    FileText, Plus, Eye, Flag, Globe, Clock,
    Scale, Filter, Landmark, Calendar, Building2, ScrollText
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// ═══════════════════════════════════════════════════════════════
// CONFIG (norme italiane / UE)
// ═══════════════════════════════════════════════════════════════
const CONFIG_IT = {
    key: 'it',
    tabella: 'norme',
    rpcStats: 'get_stats_per_codice',
    tabellaLabel: 'codici_norme',
    lexAbilitato: true,
    campiRicerca: ['articolo', 'rubrica', 'testo'],
    placeholderGlobale: 'Cerca in tutti i codici per articolo, rubrica o testo...',
    placeholderCategoria: 'Cerca per numero articolo, rubrica o testo...',
}

const CONFIG_UE = {
    key: 'ue',
    tabella: 'norme_ue',
    rpcStats: 'get_stats_per_categoria_ue',
    tabellaLabel: 'codici_norme_ue',
    lexAbilitato: false,
    campiRicerca: ['articolo', 'rubrica', 'testo', 'celex', 'titolo_doc'],
    placeholderGlobale: 'Cerca in tutte le norme UE per articolo, rubrica, testo o celex...',
    placeholderCategoria: 'Cerca per articolo, rubrica, testo o documento...',
}

// ═══════════════════════════════════════════════════════════════
// HOOK CREDITI
// ═══════════════════════════════════════════════════════════════
function useCreditiAI() {
    const [crediti, setCrediti] = useState(null)

    async function caricaCrediti() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('crediti_ai')
            .select('crediti_totali, crediti_usati, periodo_fine, tipo')
            .eq('user_id', user.id)

        if (!data || data.length === 0) {
            setCrediti(0)
            return
        }

        const now = new Date()
        const totale = data.reduce((acc, row) => {
            const residui = row.crediti_totali - row.crediti_usati
            const scaduto = row.periodo_fine && new Date(row.periodo_fine) < now
            return acc + (residui > 0 && !scaduto ? residui : 0)
        }, 0)

        setCrediti(totale)
    }

    useEffect(() => {
        caricaCrediti()
        function onFocus() { caricaCrediti() }
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [])

    return { crediti, setCrediti, refreshCrediti: caricaCrediti }
}

// ═══════════════════════════════════════════════════════════════
// LEX ANIMAZIONE — invariato
// ═══════════════════════════════════════════════════════════════
function LexAnimazione({ faseAttiva }) {
    const frasiRotative = [
        'Sto ricercando nell\'archivio Lex',
        'Identifico le fonti rilevanti',
        'Confronto sentenze e giurisprudenza',
        'Analizzo le interpretazioni dottrinali',
        'Consulto codici e normative',
        'Verifico le prassi amministrative',
        'Sto sfogliando le pagine giuste',
        'Compongo una risposta strutturata',
    ]

    const [indiceFrase, setIndiceFrase] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setIndiceFrase((i) => (i + 1) % frasiRotative.length)
        }, 3500)
        return () => clearInterval(interval)
    }, [])

    const testoVisibile = frasiRotative[indiceFrase]

    return (
        <div className="px-3 py-4 max-w-[600px] mx-auto">
            <style>{`
            .lex-stage {
                position: relative;
                width: 100%;
                aspect-ratio: 16 / 7;
                margin: 0 auto;
            }
                .lex-stage svg { width: 100%; height: 100%; display: block; }

                .lex-ray {
                    animation: lexRayCycle 27s ease-in-out infinite;
                }
                @keyframes lexRayCycle {
                    0%   { transform: translateX(-30px); opacity: 0; }
                    3%   { opacity: 0.8; }
                    8%   { transform: translateX(85px); opacity: 0.9; }
                    12%  { transform: translateX(85px); opacity: 1; }
                    16%  { transform: translateX(85px); opacity: 0; }
                    33%  { transform: translateX(85px); opacity: 0; }
                    34%  { transform: translateX(-30px); opacity: 0; }
                    37%  { opacity: 0.8; }
                    42%  { transform: translateX(180px); opacity: 0.9; }
                    46%  { transform: translateX(180px); opacity: 1; }
                    50%  { transform: translateX(180px); opacity: 0; }
                    66%  { transform: translateX(180px); opacity: 0; }
                    67%  { transform: translateX(-30px); opacity: 0; }
                    70%  { opacity: 0.8; }
                    78%  { transform: translateX(290px); opacity: 0.9; }
                    82%  { transform: translateX(290px); opacity: 1; }
                    86%  { transform: translateX(290px); opacity: 0; }
                    100% { transform: translateX(290px); opacity: 0; }
                }

                .lex-book-a {
                    animation: lexBookGlowA 27s ease-in-out infinite;
                }
                @keyframes lexBookGlowA {
                    0%, 8% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    12% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    16% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    24% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    32%, 100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }

                .lex-book-b {
                    animation: lexBookGlowB 27s ease-in-out infinite;
                }
                @keyframes lexBookGlowB {
                    0%, 41% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    46% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    50% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    58% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    66%, 100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }

                .lex-book-c {
                    animation: lexBookGlowC 27s ease-in-out infinite;
                }
                @keyframes lexBookGlowC {
                    0%, 75% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                    82% { fill: rgba(201, 164, 92, 0.25); stroke: #C9A45C; stroke-width: 1.5; transform: translateY(0); }
                    86% { fill: rgba(201, 164, 92, 0.15); stroke: rgba(201, 164, 92, 0.4); stroke-width: 1; transform: translateY(8px); }
                    94% { fill: rgba(201, 164, 92, 0.05); stroke: rgba(201, 164, 92, 0.3); stroke-width: 1; transform: translateY(8px); }
                    100% { fill: #243447; stroke: rgba(201, 164, 92, 0.2); stroke-width: 1; transform: translateY(0); }
                }

                .lex-open-a { opacity: 0; transform-origin: center; animation: lexOpenA 27s ease-in-out infinite; }
                @keyframes lexOpenA {
                    0%, 16% { opacity: 0; transform: translateY(20px) scale(0.7); }
                    20% { opacity: 1; transform: translateY(0) scale(1); }
                    28% { opacity: 1; transform: translateY(0) scale(1); }
                    32% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                    100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                }
                .lex-open-b { opacity: 0; transform-origin: center; animation: lexOpenB 27s ease-in-out infinite; }
                @keyframes lexOpenB {
                    0%, 50% { opacity: 0; transform: translateY(20px) scale(0.7); }
                    54% { opacity: 1; transform: translateY(0) scale(1); }
                    62% { opacity: 1; transform: translateY(0) scale(1); }
                    66% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                    100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                }
                .lex-open-c { opacity: 0; transform-origin: center; animation: lexOpenC 27s ease-in-out infinite; }
                @keyframes lexOpenC {
                    0%, 86% { opacity: 0; transform: translateY(20px) scale(0.7); }
                    90% { opacity: 1; transform: translateY(0) scale(1); }
                    97% { opacity: 1; transform: translateY(0) scale(1); }
                    100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                }

                .lex-particle-a { opacity: 0; animation: lexParticleA 27s ease-in-out infinite; }
                @keyframes lexParticleA {
                    0%, 22% { opacity: 0; transform: translateY(0); }
                    24% { opacity: 1; transform: translateY(-5px); }
                    30% { opacity: 0.6; transform: translateY(-25px); }
                    33%, 100% { opacity: 0; transform: translateY(-35px); }
                }
                .lex-particle-b { opacity: 0; animation: lexParticleB 27s ease-in-out infinite; }
                @keyframes lexParticleB {
                    0%, 56% { opacity: 0; transform: translateY(0); }
                    58% { opacity: 1; transform: translateY(-5px); }
                    64% { opacity: 0.6; transform: translateY(-25px); }
                    67%, 100% { opacity: 0; transform: translateY(-35px); }
                }
                .lex-particle-c { opacity: 0; animation: lexParticleC 27s ease-in-out infinite; }
                @keyframes lexParticleC {
                    0%, 92% { opacity: 0; transform: translateY(0); }
                    94% { opacity: 1; transform: translateY(-5px); }
                    99% { opacity: 0.6; transform: translateY(-25px); }
                    100% { opacity: 0; transform: translateY(-35px); }
                }

                .lex-fade-text { animation: lexFadeIn 0.6s ease-out; }
                @keyframes lexFadeIn {
                    0%   { opacity: 0; transform: translateY(4px); }
                    100% { opacity: 1; transform: translateY(0); }
                }

                .lex-dots-container { display: inline-flex; gap: 3px; margin-left: 6px; align-items: center; }
                .lex-dot {
                    display: inline-block;
                    width: 3px;
                    height: 3px;
                    border-radius: 50%;
                    background: #C9A45C;
                    opacity: 0.4;
                    animation: lexDotPulse 1.4s ease-in-out infinite;
                }
                .lex-dot:nth-child(1) { animation-delay: 0s; }
                .lex-dot:nth-child(2) { animation-delay: 0.2s; }
                .lex-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes lexDotPulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.3); }
                }
            `}</style>

            <div className="lex-stage">
                <svg viewBox="62 27 416 185" xmlns="http://www.w3.org/2000/svg" role="img">
                    <title>Lex sta cercando</title>
                    <line x1="60" y1="172" x2="480" y2="172" stroke="rgba(201, 164, 92, 0.4)" strokeWidth="0.8" />

                    <rect x="80" y="100" width="22" height="72" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="86" y1="115" x2="96" y2="115" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />
                    <line x1="86" y1="120" x2="96" y2="120" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="105" y="92" width="20" height="80" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="110" y1="108" x2="120" y2="108" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="128" y="105" width="24" height="67" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="134" y1="120" x2="146" y2="120" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />
                    <line x1="134" y1="125" x2="146" y2="125" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect className="lex-book-a" x="155" y="96" width="22" height="76" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="161" y1="112" x2="171" y2="112" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="180" y="108" width="20" height="64" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="185" y1="122" x2="195" y2="122" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />
                    <line x1="185" y1="127" x2="195" y2="127" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="203" y="98" width="22" height="74" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="209" y1="113" x2="219" y2="113" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="228" y="103" width="24" height="69" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="234" y1="118" x2="246" y2="118" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect className="lex-book-b" x="255" y="90" width="26" height="82" rx="1.5" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="261" y1="115" x2="275" y2="115" stroke="rgba(201, 164, 92, 0.4)" strokeWidth="0.5" />
                    <line x1="261" y1="125" x2="275" y2="125" stroke="rgba(201, 164, 92, 0.4)" strokeWidth="0.5" />
                    <line x1="261" y1="135" x2="275" y2="135" stroke="rgba(201, 164, 92, 0.4)" strokeWidth="0.5" />

                    <rect x="284" y="97" width="22" height="75" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="290" y1="113" x2="300" y2="113" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="309" y="104" width="24" height="68" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="315" y1="119" x2="327" y2="119" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />
                    <line x1="315" y1="124" x2="327" y2="124" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="336" y="93" width="22" height="79" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="342" y1="109" x2="352" y2="109" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect className="lex-book-c" x="361" y="106" width="20" height="66" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="366" y1="121" x2="376" y2="121" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="384" y="100" width="22" height="72" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="390" y1="115" x2="400" y2="115" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="409" y="95" width="24" height="77" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="415" y1="111" x2="427" y2="111" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />
                    <line x1="415" y1="116" x2="427" y2="116" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <g className="lex-ray">
                        <ellipse cx="80" cy="135" rx="22" ry="55" fill="#C9A45C" opacity="0.18" />
                        <ellipse cx="80" cy="135" rx="14" ry="45" fill="#C9A45C" opacity="0.25" />
                        <ellipse cx="80" cy="135" rx="6" ry="35" fill="#C9A45C" opacity="0.4" />
                        <line x1="80" y1="80" x2="80" y2="180" stroke="#C9A45C" strokeWidth="0.5" opacity="0.6" />
                    </g>

                    <g className="lex-open-a" transform="translate(-115, 0)">
                        <path d="M 240 195 L 240 145 Q 240 142 243 142 L 268 142 L 268 195 Z" fill="#F4F7F8" stroke="#C9A45C" strokeWidth="0.8" opacity="0.95" />
                        <path d="M 268 142 L 293 142 Q 296 142 296 145 L 296 195 L 268 195 Z" fill="#F4F7F8" stroke="#C9A45C" strokeWidth="0.8" opacity="0.95" />
                        <line x1="244" y1="152" x2="266" y2="152" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="244" y1="158" x2="264" y2="158" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="244" y1="164" x2="266" y2="164" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="244" y1="170" x2="262" y2="170" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="244" y1="176" x2="266" y2="176" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="152" x2="292" y2="152" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="158" x2="290" y2="158" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="164" x2="292" y2="164" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="170" x2="288" y2="170" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="176" x2="292" y2="176" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="268" y1="142" x2="268" y2="195" stroke="#C9A45C" strokeWidth="0.5" opacity="0.6" />
                    </g>

                    <g className="lex-open-b">
                        <path d="M 240 195 L 240 145 Q 240 142 243 142 L 268 142 L 268 195 Z" fill="#F4F7F8" stroke="#C9A45C" strokeWidth="0.8" opacity="0.95" />
                        <path d="M 268 142 L 293 142 Q 296 142 296 145 L 296 195 L 268 195 Z" fill="#F4F7F8" stroke="#C9A45C" strokeWidth="0.8" opacity="0.95" />
                        <line x1="244" y1="152" x2="266" y2="152" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="244" y1="158" x2="264" y2="158" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="244" y1="164" x2="266" y2="164" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="244" y1="170" x2="262" y2="170" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="244" y1="176" x2="266" y2="176" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="152" x2="292" y2="152" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="158" x2="290" y2="158" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="164" x2="292" y2="164" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="170" x2="288" y2="170" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="176" x2="292" y2="176" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="268" y1="142" x2="268" y2="195" stroke="#C9A45C" strokeWidth="0.5" opacity="0.6" />
                    </g>

                    <g className="lex-open-c" transform="translate(105, 0)">
                        <path d="M 240 195 L 240 145 Q 240 142 243 142 L 268 142 L 268 195 Z" fill="#F4F7F8" stroke="#C9A45C" strokeWidth="0.8" opacity="0.95" />
                        <path d="M 268 142 L 293 142 Q 296 142 296 145 L 296 195 L 268 195 Z" fill="#F4F7F8" stroke="#C9A45C" strokeWidth="0.8" opacity="0.95" />
                        <line x1="244" y1="152" x2="266" y2="152" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="244" y1="158" x2="264" y2="158" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="244" y1="164" x2="266" y2="164" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="244" y1="170" x2="262" y2="170" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="244" y1="176" x2="266" y2="176" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="152" x2="292" y2="152" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="158" x2="290" y2="158" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="164" x2="292" y2="164" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="170" x2="288" y2="170" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="270" y1="176" x2="292" y2="176" stroke="#0B1F2A" strokeWidth="0.4" opacity="0.5" />
                        <line x1="268" y1="142" x2="268" y2="195" stroke="#C9A45C" strokeWidth="0.5" opacity="0.6" />
                    </g>

                    <g transform="translate(140, 140)">
                        <circle className="lex-particle-a" cx="0" cy="0" r="1.5" fill="#C9A45C" />
                        <circle className="lex-particle-a" cx="8" cy="0" r="1.2" fill="#C9A45C" style={{ animationDelay: '0.3s' }} />
                        <circle className="lex-particle-a" cx="16" cy="0" r="1.8" fill="#C9A45C" style={{ animationDelay: '0.6s' }} />
                    </g>
                    <g transform="translate(255, 140)">
                        <circle className="lex-particle-b" cx="0" cy="0" r="1.5" fill="#C9A45C" />
                        <circle className="lex-particle-b" cx="8" cy="0" r="1.2" fill="#C9A45C" style={{ animationDelay: '0.3s' }} />
                        <circle className="lex-particle-b" cx="16" cy="0" r="1.8" fill="#C9A45C" style={{ animationDelay: '0.6s' }} />
                        <circle className="lex-particle-b" cx="24" cy="0" r="1.2" fill="#C9A45C" style={{ animationDelay: '0.9s' }} />
                        <circle className="lex-particle-b" cx="32" cy="0" r="1.5" fill="#C9A45C" style={{ animationDelay: '1.2s' }} />
                    </g>
                    <g transform="translate(360, 140)">
                        <circle className="lex-particle-c" cx="0" cy="0" r="1.5" fill="#C9A45C" />
                        <circle className="lex-particle-c" cx="8" cy="0" r="1.2" fill="#C9A45C" style={{ animationDelay: '0.3s' }} />
                        <circle className="lex-particle-c" cx="16" cy="0" r="1.8" fill="#C9A45C" style={{ animationDelay: '0.6s' }} />
                    </g>
                </svg>
            </div>

            <div className="text-center mt-3 min-h-[24px]">
                {testoVisibile && (
                    <span
                        key={indiceFrase}
                        className="lex-fade-text font-body text-sm text-nebbia/70 tracking-wide inline-flex items-center"
                    >
                        {testoVisibile}
                        <span className="lex-dots-container">
                            <span className="lex-dot" />
                            <span className="lex-dot" />
                            <span className="lex-dot" />
                        </span>
                    </span>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// AGGIUNGI A PRATICA — popover inline con cerca
// Stesso pattern di AggiungiAEtichetta
// ═══════════════════════════════════════════════════════════════
function AggiungiAPratica({ ricerca, onRicercaSalvata, ricercaSalvataId, setRicercaSalvataId, variant = 'default' }) {
    const { profile } = useAuth()
    const [aperto, setAperto] = useState(false)
    const [cerca, setCerca] = useState('')
    const [pratiche, setPratiche] = useState([])
    const [loading, setLoading] = useState(false)
    const [salvando, setSalvando] = useState(null)
    const [salvatoIn, setSalvatoIn] = useState(null)
    const [errore, setErrore] = useState(null)
    const containerRef = useRef(null)

    useEffect(() => {
        if (!aperto) return
        function handleClick(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setAperto(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [aperto])

    useEffect(() => {
        if (!aperto) return
        async function carica() {
            setLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                const { data } = await supabase
                    .from('pratiche')
                    .select('id, titolo, cliente:cliente_id(nome, cognome)')
                    .eq('avvocato_id', user.id)
                    .eq('stato', 'aperta')
                    .order('updated_at', { ascending: false })
                    .limit(50)
                setPratiche(data ?? [])
            } finally {
                setLoading(false)
            }
        }
        carica()
    }, [aperto])

    async function salva(pratica) {
        setSalvando(pratica.id)
        setErrore(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (ricercaSalvataId) {
                // Riga già creata da un altro bottone (es. etichetta): aggiorna pratica_id
                const { error } = await supabase
                    .from('ricerche')
                    .update({ pratica_id: pratica.id })
                    .eq('id', ricercaSalvataId)
                if (error) throw new Error(error.message)
            } else {
                // Prima volta: crea la riga
                const { data, error } = await supabase
                    .from('ricerche')
                    .insert({
                        pratica_id: pratica.id,
                        user_id: user.id,
                        autore_id: user.id,
                        tipo: ricerca.tipo,
                        titolo: ricerca.domanda,
                        contenuto: ricerca.tipo === 'ricerca_ai' ? ricerca.risposta : ricerca.testo,
                        metadati: {
                            sentenze: ricerca.sentenze ?? false,
                            codice: ricerca.codice ?? null,
                            ts: new Date().toISOString(),
                        }
                    })
                    .select('id')
                    .single()
                if (error) throw new Error(error.message)
                if (setRicercaSalvataId) setRicercaSalvataId(data.id)
            }

            setSalvatoIn(pratica)
            setAperto(false)
            if (onRicercaSalvata) onRicercaSalvata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(null)
        }
    }

    if (profile?.role !== 'avvocato') return null

    if (salvatoIn) return (
        <span className="font-body text-xs text-salvia flex items-center gap-1.5 px-3 py-2 border border-salvia/30 bg-salvia/5">
            <Sparkles size={11} /> Salvato in "{salvatoIn.titolo}"
        </span>
    )

    const buttonClass = variant === 'compact'
        ? 'flex items-center gap-1.5 px-2.5 py-1.5 border border-white/10 text-nebbia/50 hover:border-oro/30 hover:text-oro transition-colors font-body text-xs'
        : 'flex items-center gap-2 px-4 py-2 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors'

    const pratichefiltrate = cerca.trim()
        ? pratiche.filter(p => p.titolo.toLowerCase().includes(cerca.toLowerCase()))
        : pratiche

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                type="button"
                onClick={() => setAperto(v => !v)}
                className={buttonClass}
            >
                <FileText size={variant === 'compact' ? 11 : 13} />
                <span>Salva in pratica</span>
            </button>

            {aperto && (
                <div className="absolute z-50 mt-2 w-80 bg-slate border border-white/10 shadow-2xl">
                    <div className="p-3 border-b border-white/5">
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                            <input
                                autoFocus
                                value={cerca}
                                onChange={e => setCerca(e.target.value)}
                                placeholder="Cerca pratica..."
                                className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-8 pr-8 py-2 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                            <button
                                onClick={() => setAperto(false)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-nebbia/30 hover:text-nebbia"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 flex items-center justify-center gap-2 text-nebbia/30">
                                <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                                <span className="font-body text-xs">Caricamento...</span>
                            </div>
                        ) : pratichefiltrate.length === 0 ? (
                            <p className="p-4 text-center font-body text-xs text-nebbia/25">
                                {cerca ? 'Nessuna pratica trovata' : 'Nessuna pratica aperta'}
                            </p>
                        ) : (
                            pratichefiltrate.map(p => {
                                const isLoading = salvando === p.id
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => salva(p)}
                                        disabled={isLoading}
                                        className="w-full text-left px-3 py-2.5 hover:bg-petrolio/50 transition-colors border-b border-white/5 last:border-0 disabled:opacity-50"
                                    >
                                        <p className="font-body text-sm text-nebbia/80 truncate">{p.titolo}</p>
                                        {p.cliente && (
                                            <p className="font-body text-xs text-nebbia/30 mt-0.5 truncate">
                                                {p.cliente.nome} {p.cliente.cognome}
                                            </p>
                                        )}
                                        {isLoading && (
                                            <span className="font-body text-xs text-oro mt-1 flex items-center gap-1">
                                                <span className="animate-spin w-2.5 h-2.5 border border-oro border-t-transparent rounded-full" />
                                                Salvataggio...
                                            </span>
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </div>

                    {errore && (
                        <div className="p-2 bg-red-900/15 border-t border-red-500/20">
                            <p className="font-body text-xs text-red-400">{errore}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// LEX — RICERCA AI (multi-agent streaming)
// ═══════════════════════════════════════════════════════════════
function RicercaAI({ codice, onRisultato, crediti, setCrediti, messaggi, onAggiornaMessaggi, onRicercaSalvata }) {
    const [domanda, setDomanda] = useState('')
    const [cercando, setCercando] = useState(false)
    const [errore, setErrore] = useState(null)
    const [conversazione, setConversazione] = useState([])
    const [faseCorrente, setFaseCorrente] = useState(null)
    const [streamingTesto, setStreamingTesto] = useState('')
    const [meta, setMeta] = useState(null)

    const [clientConversationId, setClientConversationId] = useState(() => crypto.randomUUID())

    // Riga `ricerche` condivisa tra "Salva in pratica" e "Aggiungi a etichetta"
    const [ricercaSalvataId, setRicercaSalvataId] = useState(null)

    const abortControllerRef = useRef(null)

    async function cerca(domandaInput, opzioni = {}) {
        const domandaCorrente = domandaInput ?? domanda
        if (!domandaCorrente.trim()) return
        if (crediti !== null && crediti <= 0) { setErrore('Crediti Lex esauriti.'); return }

        if (!opzioni.tipoRichiesta || opzioni.tipoRichiesta === 'query_iniziale') {
            setDomanda('')
        }
        setCercando(true)
        setErrore(null)
        setFaseCorrente(null)
        setStreamingTesto('')
        setMeta(null)

        const nuovaConv = [...conversazione, { role: 'user', content: domandaCorrente }]
        setConversazione(nuovaConv)

        abortControllerRef.current = new AbortController()

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lex-lead`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        domanda: domandaCorrente,
                        messaggi: messaggi ?? [],
                        tipo_richiesta: opzioni.tipoRichiesta ?? 'query_iniziale',
                        subagent_target: opzioni.subagentTarget,
                        filtro_approfondimento: opzioni.filtroApprofondimento,
                        client_conversation_id: clientConversationId,
                    }),
                    signal: abortControllerRef.current.signal,
                }
            )

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({ error: 'Errore sconosciuto' }))
                if (errBody.crediti_esauriti) {
                    setErrore('crediti_esauriti')
                } else {
                    setErrore(errBody.error ?? `Errore ${res.status}`)
                }
                setConversazione(conversazione)
                setCercando(false)
                return
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let testoAccumulato = ''
            let metaFinale = null
            let tipoRisposta = null

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                let eventoCorrente = null
                for (const line of lines) {
                    if (!line.trim()) continue

                    if (line.startsWith('event: ')) {
                        eventoCorrente = line.slice(7).trim()
                        continue
                    }

                    if (line.startsWith('data: ')) {
                        const payload = line.slice(6).trim()
                        try {
                            const data = JSON.parse(payload)

                            if (eventoCorrente === 'fase') {
                                if (data.fase === 'rigetto' || data.fase === 'no_copertura') {
                                    setFaseCorrente(null)
                                } else {
                                    setFaseCorrente(data.fase)
                                }
                            }

                            if (eventoCorrente === 'chunk') {
                                testoAccumulato += data.text ?? ''
                                setStreamingTesto(testoAccumulato)
                                if (faseCorrente !== null) setFaseCorrente(null)
                            }

                            if (eventoCorrente === 'done') {
                                metaFinale = data.meta
                                tipoRisposta = data.tipo_risposta
                                if (data.crediti_rimasti !== undefined) setCrediti(data.crediti_rimasti)
                            }

                            if (eventoCorrente === 'error') {
                                setErrore(data.error ?? 'Errore nello streaming')
                            }
                        } catch (e) {
                            // ignore malformed
                        }
                    }
                }
            }

            const messaggioCompleto = {
                role: 'assistant',
                content: testoAccumulato,
                meta: metaFinale,
                tipo_risposta: tipoRisposta,
            }
            const convFinale = [...nuovaConv, messaggioCompleto]
            setConversazione(convFinale)
            setStreamingTesto('')
            setMeta(metaFinale)

            const nuoviMessaggi = [
                ...(messaggi ?? []),
                { role: 'user', content: domandaCorrente },
                { role: 'assistant', content: testoAccumulato },
            ]
            if (onAggiornaMessaggi) onAggiornaMessaggi(nuoviMessaggi)
            if (onRisultato) onRisultato({
                tipo: 'ricerca_ai',
                domanda: domandaCorrente,
                risposta: testoAccumulato,
                meta: metaFinale,
                codice,
                ts: new Date()
            })

        } catch (e) {
            if (e.name === 'AbortError') {
                setConversazione(conversazione)
            } else {
                setErrore(e.message)
                setConversazione(conversazione)
            }
        } finally {
            setCercando(false)
            setFaseCorrente(null)
            abortControllerRef.current = null
        }
    }

    function nuovaSessione() {
        if (abortControllerRef.current) abortControllerRef.current.abort()
        setConversazione([])
        setStreamingTesto('')
        setFaseCorrente(null)
        setMeta(null)
        setClientConversationId(crypto.randomUUID())
        setRicercaSalvataId(null)
        if (onAggiornaMessaggi) onAggiornaMessaggi([])
    }

    function approfondisci(filtro_key, label, subagent_source) {
        cerca(`Approfondisci: ${label}`, {
            tipoRichiesta: 'approfondimento',
            subagentTarget: subagent_source,
            filtroApprofondimento: filtro_key,
        })
    }

    const markdownComponents = {
        h2: ({ children }) => <h2 className="font-display text-base font-semibold text-nebbia mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="font-body text-sm font-semibold text-nebbia/80 mt-3 mb-1">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold text-nebbia">{children}</strong>,
        em: ({ children }) => <em className="italic text-nebbia/80">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-nebbia/70 my-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-nebbia/70 my-2">{children}</ol>,
        li: ({ children }) => <li className="font-body text-sm">{children}</li>,
        p: ({ children }) => <p className="font-body text-sm text-nebbia/80 leading-relaxed">{children}</p>,
        hr: () => <hr className="my-4 border-white/10" />,
        a: ({ href, children }) => {
            if (!href) return <span>{children}</span>

            const isAreaUtente = window.location.pathname.startsWith('/area')
            const prefix = isAreaUtente ? '/area' : '/banca-dati'

            let finalHref = href

            if (href.startsWith('/banca-dati/norma/')) {
                const id = href.split('/').pop()
                finalHref = `${prefix}/norma/${id}`
            } else if (href.startsWith('/banca-dati/archivio/')) {
                const id = href.split('/').pop()
                finalHref = `${prefix}/norma/${id}`
            } else if (href.startsWith('/banca-dati/')) {
                finalHref = href.replace('/banca-dati/', `${prefix}/`)
            }

            return (
                <a
                    href={finalHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-oro hover:text-oro/80 underline decoration-oro/30 hover:decoration-oro transition-colors"
                >
                    {children}
                </a>
            )
        },
    }

    return (
        <div className="bg-slate border border-white/5">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-salvia" />
                    <p className="font-body text-sm font-medium text-nebbia">Lex — AI Assistant</p>
                    {conversazione.length > 0 && (
                        <span className="font-body text-xs text-salvia/60 border border-salvia/20 px-2 py-0.5">
                            {Math.floor(conversazione.length / 2)} scambi
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {crediti !== null && <span className="font-body text-xs text-nebbia/30">{crediti} crediti</span>}
                    {conversazione.length > 0 && (
                        <button onClick={nuovaSessione} className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors">
                            Nuova sessione
                        </button>
                    )}
                </div>
            </div>

            {conversazione.length > 0 && (
                <div className="px-5 py-4 space-y-5">
                    {conversazione.map((m, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className={`font-body text-xs font-medium ${m.role === 'user' ? 'text-oro/70' : 'text-salvia/70'}`}>
                                    {m.role === 'user' ? 'Tu' : 'Lex'}
                                </span>
                                {m.tipo_risposta === 'rigettata' && (
                                    <span className="font-body text-[10px] text-nebbia/40 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">
                                        non interpretata
                                    </span>
                                )}
                                {m.tipo_risposta === 'messaggio_standard' && (
                                    <span className="font-body text-[10px] text-nebbia/40 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">
                                        nessun risultato
                                    </span>
                                )}
                            </div>

                            {m.role === 'user' ? (
                                <p className="font-body text-sm text-nebbia/60 leading-relaxed">{m.content}</p>
                            ) : (
                                <div className="font-body text-sm text-nebbia/80 leading-relaxed space-y-2">
                                    <ReactMarkdown components={markdownComponents}>
                                        {m.content}
                                    </ReactMarkdown>

                                    {m.meta?.sentenze_marketplace?.length > 0 && (
                                        <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <BookOpen size={12} className="text-oro" />
                                                <p className="font-body text-xs font-medium text-oro uppercase tracking-widest">
                                                    Sentenze annotate da colleghi
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                {m.meta.sentenze_marketplace.map(s => (
                                                    <div key={s.id} className="bg-petrolio border border-oro/15 p-3 flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-body text-xs font-medium text-nebbia/80">
                                                                {s.organo} · {s.anno}
                                                            </p>
                                                            <p className="font-body text-xs text-nebbia/40 mt-0.5 line-clamp-2">{s.oggetto}</p>
                                                        </div>
                                                        <a
                                                            href={`/banca-dati/avvocato/${s.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="shrink-0 flex flex-col items-end gap-1"
                                                        >
                                                            <span className="font-display text-base font-semibold text-oro">EUR {s.prezzo}</span>
                                                            <span className="font-body text-[10px] text-oro/60 uppercase tracking-wider">vedi</span>
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {m.meta?.approfondimenti_disponibili?.length > 0 && (
                                        <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={12} className="text-salvia" />
                                                <p className="font-body text-xs font-medium text-salvia uppercase tracking-widest">
                                                    Approfondimenti suggeriti
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {m.meta.approfondimenti_disponibili.map((a, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => approfondisci(a.filtro_key, a.label, a.subagent_source)}
                                                        disabled={cercando}
                                                        className="text-left bg-petrolio border border-salvia/15 hover:border-salvia/40 p-3 transition-colors disabled:opacity-40 group"
                                                    >
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <p className="font-body text-xs font-medium text-nebbia/80 group-hover:text-salvia transition-colors leading-snug">
                                                                {a.label}
                                                            </p>
                                                            <span className="font-body text-[10px] text-salvia/60 shrink-0 mt-0.5">
                                                                {a.conteggio}
                                                            </span>
                                                        </div>
                                                        {a.teaser && (
                                                            <p className="font-body text-[11px] text-nebbia/40 line-clamp-2 leading-relaxed">
                                                                {a.teaser}
                                                            </p>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {cercando && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="font-body text-xs font-medium text-salvia/70">Lex</span>
                            </div>

                            {streamingTesto.length === 0 && (
                                <LexAnimazione faseAttiva={faseCorrente} />
                            )}

                            {streamingTesto.length > 0 && (
                                <div className="font-body text-sm text-nebbia/80 leading-relaxed space-y-2">
                                    <ReactMarkdown components={markdownComponents}>
                                        {streamingTesto}
                                    </ReactMarkdown>
                                    <span className="inline-block w-1 h-4 bg-oro/60 align-middle animate-pulse ml-0.5" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Salvataggio in pratica + etichetta — popover inline entrambi */}
            {conversazione.length >= 2 && !cercando && (
                <div className="px-5 pb-3 flex flex-wrap gap-2 [&>div>button]:h-[38px]">
                    <AggiungiAPratica
                        ricerca={{
                            tipo: 'ricerca_ai',
                            domanda: conversazione[0]?.content ?? '',
                            risposta: conversazione
                                .filter(m => m.role === 'assistant')
                                .map(m => m.content)
                                .join('\n\n---\n\n'),
                            sentenze: conversazione.some(m => m.meta?.sentenze_marketplace?.length > 0),
                            codice
                        }}
                        onRicercaSalvata={onRicercaSalvata}
                        ricercaSalvataId={ricercaSalvataId}
                        setRicercaSalvataId={setRicercaSalvataId}
                    />
                    <AggiungiAEtichetta
                        elemento={{ tipo: 'ricerca_ai' }}
                        domanda={conversazione[0]?.content ?? ''}
                        risposta={conversazione
                            .filter(m => m.role === 'assistant')
                            .map(m => m.content)
                            .join('\n\n---\n\n')}
                        metadati={{
                            sentenze: conversazione.some(m => m.meta?.sentenze_marketplace?.length > 0),
                            codice,
                            tipo_query: 'banca_dati',
                            ts: new Date().toISOString(),
                        }}
                        ricercaIdEsterno={ricercaSalvataId}
                        onRicercaCreata={setRicercaSalvataId}
                    />
                </div>
            )}

            {/* Input area */}
            <div className="px-5 py-4 space-y-3 border-t border-white/5">
                {conversazione.length === 0 && (
                    <p className="font-body text-xs text-nebbia/30">
                        Descrivi il caso legale — Lex consulterà norme, giurisprudenza e prassi.
                    </p>
                )}
                {conversazione.length === 0 && (
                    <div className="bg-petrolio/60 border border-salvia/10 px-4 py-3 mb-2">
                        <p className="font-body text-xs text-nebbia/40 leading-relaxed">
                            💡 <span className="text-nebbia/60">Per una ricerca più precisa</span>, specifica: fase processuale, tribunale e ruolo del cliente.<br />
                            <span className="text-nebbia/30">Es: "Il mio cliente è imputato per omicidio colposo, fase dibattimentale, Tribunale di Milano"</span>
                        </p>
                    </div>
                )}

                <textarea
                    rows={3}
                    placeholder={conversazione.length > 0 ? 'Approfondisci o fai una nuova domanda...' : 'Es. Il mio cliente è accusato di omicidio colposo...'}
                    value={domanda}
                    onChange={e => setDomanda(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) cerca() }}
                    disabled={cercando}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-salvia/50 resize-none placeholder:text-nebbia/25 disabled:opacity-50"
                />

                {errore && errore !== 'crediti_esauriti' && (
                    <p className="font-body text-xs text-red-400 flex items-center gap-1.5">
                        <AlertCircle size={11} />{errore}
                    </p>
                )}
                {errore === 'crediti_esauriti' && (
                    <div className="flex items-center justify-between gap-3 p-3 bg-oro/5 border border-oro/20">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={13} className="text-oro shrink-0" />
                            <p className="font-body text-xs text-nebbia/60">Crediti Lex esauriti.</p>
                        </div>
                        <a
                            href="/studio?tab=acquista"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-body text-xs text-oro border border-oro/30 px-3 py-1.5 hover:bg-oro/10 transition-colors whitespace-nowrap"
                        >
                            Acquista crediti →
                        </a>
                    </div>
                )}

                <button
                    onClick={() => cerca()}
                    disabled={cercando || !domanda.trim()}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-salvia/10 border border-salvia/30 text-salvia font-body text-sm hover:bg-salvia/20 transition-colors disabled:opacity-40"
                >
                    {cercando
                        ? <><span className="animate-spin w-4 h-4 border-2 border-salvia border-t-transparent rounded-full" /> Lex sta lavorando...</>
                        : <><Sparkles size={13} /> {conversazione.length > 0 ? 'Continua conversazione' : 'Cerca con Lex'}</>
                    }
                </button>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// TAB NORMATIVA (Italiana + UE)
// ═══════════════════════════════════════════════════════════════
function TabNormativa({ datasetFonte, crediti, setCrediti, refreshNoOp, messaggiConversazione, setMessaggiConversazione }) {
    const navigate = useNavigate()
    const [dataset, setDataset] = useState(datasetFonte)
    const config = dataset === 'ue' ? CONFIG_UE : CONFIG_IT

    const [vista, setVista] = useState('catalogo')
    const [codiceSelezionato, setCodice] = useState(null)
    const [labelSelezionato, setLabel] = useState('')

    const [codici, setCodici] = useState([])
    const [codiciLabel, setCodiciLabel] = useState({})
    const [loadingCodici, setLoadingCodici] = useState(true)

    const [inputTradGlobale, setInputTradGlobale] = useState('')
    const [cercaTradGlobale, setCercaTradGlobale] = useState('')
    const [normeGlobali, setNormeGlobali] = useState([])
    const [totaleGlobale, setTotaleGlobale] = useState(0)
    const [loadingGlobale, setLoadingGlobale] = useState(false)
    const [articoloApertoGlobale, setArticoloApertoGlobale] = useState(null)

    const [norme, setNorme] = useState([])
    const [loadingNorme, setLoadingNorme] = useState(false)
    const [totaleNorme, setTotaleNorme] = useState(0)
    const [pagina, setPagina] = useState(0)
    const PER_PAGINA = 50
    const [inputTrad, setInputTrad] = useState('')
    const [cercaTrad, setCercaTrad] = useState('')
    const [tab, setTab] = useState('tradizionale')
    const [articoloAperto, setArticoloAperto] = useState(null)

    useEffect(() => {
        setVista('catalogo')
        setCodice(null)
        setLabel('')
        setNorme([]); setTotaleNorme(0)
        setNormeGlobali([]); setTotaleGlobale(0)
        setInputTrad(''); setCercaTrad('')
        setInputTradGlobale(''); setCercaTradGlobale('')
        setPagina(0)
        setArticoloAperto(null); setArticoloApertoGlobale(null)
        setTab('tradizionale')
        caricaCodici()
    }, [dataset])

    useEffect(() => {
        if (vista === 'codice' && codiceSelezionato) caricaNorme()
    }, [codiceSelezionato, cercaTrad, pagina])

    async function caricaCodici() {
        setLoadingCodici(true)
        try {
            const { data: labelData } = await supabase.from(config.tabellaLabel).select('codice, label')
            const mappa = {}
            for (const r of labelData ?? []) mappa[r.codice] = r.label
            setCodiciLabel(mappa)
            const { data } = await supabase.rpc(config.rpcStats)
            setCodici(data ?? [])
        } finally { setLoadingCodici(false) }
    }

    async function avviaRicercaGlobale() {
        if (!inputTradGlobale.trim()) return
        setCercaTradGlobale(inputTradGlobale)
        setLoadingGlobale(true)
        setArticoloApertoGlobale(null)
        try {
            const campiSelect = dataset === 'ue'
                ? 'id, articolo, rubrica, testo, tipo_elemento, tipo_atto, numero_atto, anno_atto, titolo_breve, celex, categorie_lex'
                : 'id, codice, articolo, rubrica, testo'

            let q = supabase.from(config.tabella).select(campiSelect, { count: 'exact' })
            if (dataset === 'ue') q = q.eq('vigente', true)

            const filtroOr = config.campiRicerca.map(c => `${c}.ilike.%${inputTradGlobale}%`).join(',')
            q = q.or(filtroOr)
            q = dataset === 'ue' ? q.order('celex').order('articolo') : q.order('codice').order('articolo')

            const { data, count } = await q.limit(50)
            setNormeGlobali(data ?? [])
            setTotaleGlobale(count ?? 0)
        } finally { setLoadingGlobale(false) }
    }

    async function caricaNorme() {
        setLoadingNorme(true)
        try {
            const campiSelect = dataset === 'ue'
                ? 'id, articolo, rubrica, testo, tipo_elemento, tipo_atto, numero_atto, anno_atto, titolo_breve, celex'
                : 'id, articolo, rubrica, testo'

            let q = supabase.from(config.tabella).select(campiSelect, { count: 'exact' })

            if (dataset === 'ue') {
                q = q.contains('categorie_lex', [codiceSelezionato]).eq('vigente', true)
                q = q.order('celex').order('articolo')
            } else {
                q = q.eq('codice', codiceSelezionato)
                q = q.order('articolo')
            }

            q = q.range(pagina * PER_PAGINA, (pagina + 1) * PER_PAGINA - 1)

            if (cercaTrad.trim()) {
                const filtroOr = config.campiRicerca.map(c => `${c}.ilike.%${cercaTrad}%`).join(',')
                q = q.or(filtroOr)
            }

            const { data, count } = await q
            setNorme(data ?? [])
            setTotaleNorme(count ?? 0)
        } finally { setLoadingNorme(false) }
    }

    function apriCodice(codice) {
        setCodice(codice)
        setLabel(codiciLabel[codice] ?? codice)
        setVista('codice')
        setInputTrad(''); setCercaTrad('')
        setPagina(0); setArticoloAperto(null)
        setTab('tradizionale')
    }

    function tornaAlCatalogo() { setVista('catalogo'); setCodice(null) }
    function avviaRicercaTrad() { setPagina(0); setCercaTrad(inputTrad); setArticoloAperto(null) }

    function evidenziaTesto(testo, cerca) {
        if (!cerca.trim() || !testo) return ''
        const idx = testo.toLowerCase().indexOf(cerca.toLowerCase())
        if (idx === -1) return testo.slice(0, 150) + '...'
        const start = Math.max(0, idx - 80)
        const end = Math.min(testo.length, idx + cerca.length + 80)
        return (start > 0 ? '...' : '') + testo.slice(start, end) + (end < testo.length ? '...' : '')
    }

    function evidenziaParola(testo, cerca) {
        if (!cerca?.trim() || !testo) return testo
        const regex = new RegExp(`(${cerca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        return testo.replace(regex, '<mark class="bg-oro/30 text-nebbia rounded px-0.5">$1</mark>')
    }

    function docLabel(n) {
        if (!n.tipo_atto) return ''
        const num = n.numero_atto && n.anno_atto ? `${n.numero_atto}/${n.anno_atto}` : (n.numero_atto ?? n.anno_atto ?? '')
        return `${n.tipo_atto}${num ? ` ${num}` : ''}`
    }

    function BadgeTipoElemento({ tipo }) {
        if (!tipo || tipo === 'articolo') return null
        return (
            <span className="ml-2 font-body text-xs text-salvia/70 border border-salvia/20 px-1.5 py-0.5 uppercase tracking-wider">
                {tipo}
            </span>
        )
    }

    const pagine = Math.ceil(totaleNorme / PER_PAGINA)

    return (
        <div className="space-y-5">
            {vista === 'catalogo' && (
                <>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                            <input
                                placeholder={config.placeholderGlobale}
                                value={inputTradGlobale}
                                onChange={e => setInputTradGlobale(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') avviaRicercaGlobale() }}
                                className="w-full bg-slate border border-oro/50 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/60 placeholder:text-nebbia/25"
                            />
                        </div>
                        <button onClick={avviaRicercaGlobale} className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                            <Search size={13} /> Cerca
                        </button>
                    </div>

                    {loadingGlobale && (
                        <div className="flex items-center justify-center py-8">
                            <span className="animate-spin w-5 h-5 border-2 border-oro border-t-transparent rounded-full" />
                        </div>
                    )}

                    {!loadingGlobale && cercaTradGlobale && normeGlobali.length === 0 && (
                        <p className="font-body text-sm text-nebbia/30 text-center py-8">Nessun risultato per "{cercaTradGlobale}"</p>
                    )}

                    {!loadingGlobale && normeGlobali.length > 0 && (
                        <div className="bg-slate border border-white/5">
                            <div className="px-4 py-3 border-b border-white/5">
                                <p className="font-body text-xs text-nebbia/30">{totaleGlobale} risultati per "{cercaTradGlobale}"</p>
                            </div>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">{dataset === 'ue' ? 'Documento' : 'Codice'}</th>
                                        <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Articolo</th>
                                        <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Rubrica</th>
                                        <th className="px-4 py-3 w-8" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {normeGlobali.map(n => (
                                        <>
                                            <tr key={n.id}
                                                className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                                onClick={() => setArticoloApertoGlobale(articoloApertoGlobale?.id === n.id ? null : n)}
                                            >
                                                <td className="px-4 py-3">
                                                    {dataset === 'ue' ? (
                                                        <>
                                                            <span className="font-body text-xs text-nebbia/60">{docLabel(n)}</span>
                                                            {n.titolo_breve && <p className="font-body text-xs text-nebbia/30 mt-0.5 truncate max-w-xs">{n.titolo_breve}</p>}
                                                        </>
                                                    ) : (
                                                        <span className="font-body text-xs text-nebbia/40">{codiciLabel[n.codice] ?? n.codice}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-body text-sm text-oro font-medium whitespace-nowrap">
                                                    {n.articolo}
                                                    {dataset === 'ue' && <BadgeTipoElemento tipo={n.tipo_elemento} />}
                                                </td>
                                                <td className="px-4 py-3 font-body text-sm text-nebbia/60 max-w-lg">
                                                    {n.rubrica && <p className="font-medium text-nebbia/80 mb-0.5" dangerouslySetInnerHTML={{ __html: evidenziaParola(n.rubrica, cercaTradGlobale) }} />}
                                                    <p className="text-xs text-nebbia/40 line-clamp-2" dangerouslySetInnerHTML={{ __html: evidenziaParola(evidenziaTesto(n.testo ?? '', cercaTradGlobale), cercaTradGlobale) }} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <ChevronRight size={13} className={`text-nebbia/20 transition-transform ${articoloApertoGlobale?.id === n.id ? 'rotate-90' : ''}`} />
                                                </td>
                                            </tr>
                                            {articoloApertoGlobale?.id === n.id && (
                                                <tr key={`${n.id}-testo`} className="border-b border-white/5 bg-petrolio/20">
                                                    <td colSpan={4} className="px-4 py-4">
                                                        <p className="font-body text-sm text-nebbia/70 whitespace-pre-line leading-relaxed" dangerouslySetInnerHTML={{ __html: evidenziaParola(n.testo ?? '', cercaTradGlobale) }} />
                                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                                            <AggiungiAPratica
                                                                ricerca={{
                                                                    tipo: 'ricerca_manuale',
                                                                    domanda: `${n.articolo}${n.rubrica ? ` — ${n.rubrica}` : ''}${dataset === 'ue' ? ` (${docLabel(n)})` : ''}`,
                                                                    testo: n.testo,
                                                                    codice: dataset === 'ue' ? (n.categorie_lex?.[0] ?? null) : n.codice
                                                                }}
                                                                variant="compact"
                                                            />
                                                            <AggiungiAEtichetta
                                                                elemento={{ tipo: 'norma', id: n.id }}
                                                                variant="compact"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    const prefix = window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'
                                                                    navigate(`${prefix}/norma/${n.id}`)
                                                                }}
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-nebbia/40 hover:text-oro transition-colors font-body text-xs ml-auto"
                                                            >
                                                                Apri pagina dedicata <ChevronRight size={11} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {loadingCodici ? (
                        <div className="flex items-center justify-center py-20">
                            <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {codici.map(c => (
                                <button key={c.codice} onClick={() => apriCodice(c.codice)}
                                    className="bg-slate border border-white/5 p-4 text-left hover:border-oro/30 hover:bg-petrolio/60 transition-all group">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors truncate">{codiciLabel[c.codice] ?? c.codice}</p>
                                        </div>
                                        <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro/60 transition-colors shrink-0" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {vista === 'codice' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <button onClick={tornaAlCatalogo} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                            <ChevronLeft size={13} /> {dataset === 'ue' ? 'Tutte le categorie' : 'Tutti i codici'}
                        </button>
                        <p className="font-display text-xl text-nebbia">{labelSelezionato}</p>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                            <input
                                placeholder={config.placeholderCategoria}
                                value={inputTrad}
                                onChange={e => setInputTrad(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') avviaRicercaTrad() }}
                                className="w-full bg-slate border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                            />
                        </div>
                        <button onClick={avviaRicercaTrad}
                            className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                            <Search size={13} /> Cerca
                        </button>
                    </div>

                    {cercaTrad && <p className="font-body text-xs text-nebbia/30">{totaleNorme} risultati per "{cercaTrad}"</p>}

                    <div className="bg-slate border border-white/5">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Articolo</th>
                                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">Rubrica / Anteprima</th>
                                    <th className="px-4 py-3 w-8" />
                                </tr>
                            </thead>
                            <tbody>
                                {loadingNorme ? (
                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                        <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full inline-block" />
                                    </td></tr>
                                ) : norme.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-20 text-center">
                                        <p className="font-body text-sm text-nebbia/30">Nessun articolo trovato</p>
                                    </td></tr>
                                ) : norme.map(n => (
                                    <>
                                        <tr key={n.id}
                                            className="border-b border-white/5 hover:bg-petrolio/40 transition-colors cursor-pointer"
                                            onClick={() => setArticoloAperto(articoloAperto?.id === n.id ? null : n)}
                                        >
                                            <td className="px-4 py-3 font-body text-sm text-oro font-medium whitespace-nowrap">
                                                {n.articolo}
                                                {dataset === 'ue' && <BadgeTipoElemento tipo={n.tipo_elemento} />}
                                                {dataset === 'ue' && docLabel(n) && (
                                                    <p className="font-body text-xs text-nebbia/30 mt-1 font-normal">{docLabel(n)}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-body text-sm text-nebbia/60 max-w-lg">
                                                {n.rubrica && <p className="font-medium text-nebbia/80 mb-0.5" dangerouslySetInnerHTML={{ __html: evidenziaParola(n.rubrica, cercaTrad) }} />}
                                                {cercaTrad && <p className="text-xs text-nebbia/40 line-clamp-2" dangerouslySetInnerHTML={{ __html: evidenziaParola(evidenziaTesto(n.testo ?? '', cercaTrad), cercaTrad) }} />}
                                            </td>
                                            <td className="px-4 py-3">
                                                <ChevronRight size={13} className={`text-nebbia/20 transition-transform ${articoloAperto?.id === n.id ? 'rotate-90' : ''}`} />
                                            </td>
                                        </tr>
                                        {articoloAperto?.id === n.id && (
                                            <tr key={`${n.id}-testo`} className="border-b border-white/5 bg-petrolio/20">
                                                <td colSpan={3} className="px-4 py-4">
                                                    <p className="font-body text-sm text-nebbia/70 whitespace-pre-line leading-relaxed" dangerouslySetInnerHTML={{ __html: evidenziaParola(n.testo ?? '', cercaTrad) }} />
                                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                                        <AggiungiAPratica
                                                            ricerca={{
                                                                tipo: 'ricerca_manuale',
                                                                domanda: `${n.articolo}${n.rubrica ? ` — ${n.rubrica}` : ''}${dataset === 'ue' ? ` (${docLabel(n)})` : ''}`,
                                                                testo: n.testo,
                                                                codice: dataset === 'ue' ? (n.categorie_lex?.[0] ?? null) : n.codice
                                                            }}
                                                            variant="compact"
                                                        />
                                                        <AggiungiAEtichetta
                                                            elemento={{ tipo: 'norma', id: n.id }}
                                                            variant="compact"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                const prefix = window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'
                                                                navigate(`${prefix}/norma/${n.id}`)
                                                            }}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-nebbia/40 hover:text-oro transition-colors font-body text-xs ml-auto"
                                                        >
                                                            Apri pagina dedicata <ChevronRight size={11} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                        {pagine > 1 && (
                            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                                <p className="font-body text-xs text-nebbia/30">
                                    {pagina * PER_PAGINA + 1}–{Math.min((pagina + 1) * PER_PAGINA, totaleNorme)} di {totaleNorme.toLocaleString()}
                                </p>
                                <div className="flex gap-2">
                                    <button onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina === 0}
                                        className="px-3 py-1.5 bg-slate border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">← Prev</button>
                                    <button onClick={() => setPagina(p => Math.min(pagine - 1, p + 1))} disabled={pagina >= pagine - 1}
                                        className="px-3 py-1.5 bg-slate border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">Next →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// TAB SENTENZE — invariato (non aveva bottoni di salvataggio)
// ═══════════════════════════════════════════════════════════════
function TabSentenze() {
    const navigate = useNavigate()

    const [categorieRaggruppate, setCategorieRaggruppate] = useState([])
    const [conteggiPerCategoria, setConteggiPerCategoria] = useState({})
    const [organiDisponibili, setOrganiDisponibili] = useState([])
    const [loading, setLoading] = useState(true)

    const [vista, setVista] = useState('catalogo')
    const [categoriaSelezionata, setCategoriaSelezionata] = useState(null)

    const [ricerca, setRicerca] = useState('')
    const [ricercaAttiva, setRicercaAttiva] = useState('')
    const [filtroAnno, setFiltroAnno] = useState('')
    const [filtroOrgano, setFiltroOrgano] = useState('')
    const [filtroTipo, setFiltroTipo] = useState('')
    const [filtroFonte, setFiltroFonte] = useState('tutte')

    const [risultati, setRisultati] = useState([])
    const [totaleSentenze, setTotaleSentenze] = useState(0)
    const [paginaSentenze, setPaginaSentenze] = useState(0)
    const [loadingRisultati, setLoadingRisultati] = useState(false)

    const [prezzoAccesso, setPrezzoAccesso] = useState(15)

    const PER_PAGINA_SENTENZE = 50

    useEffect(() => {
        async function caricaDatiBase() {
            setLoading(true)

            const { data: cat } = await supabase
                .from('codici_lex')
                .select('codice, label, macro_area, macro_label, ordine')
                .order('macro_label').order('ordine')

            const gruppi = {}
            for (const c of cat ?? []) {
                const k = c.macro_label || 'Altro'
                if (!gruppi[k]) gruppi[k] = []
                gruppi[k].push(c)
            }
            setCategorieRaggruppate(Object.entries(gruppi).map(([macro, items]) => ({ macro, items })))

            const conteggi = {}
            const [{ data: giurCats }, { data: sentCats }] = await Promise.all([
                supabase.from('giurisprudenza').select('categorie_lex'),
                supabase.from('sentenze').select('categorie_lex').eq('stato', 'pubblica'),
            ])
            for (const r of giurCats ?? []) {
                for (const cat of r.categorie_lex ?? []) {
                    conteggi[cat] = (conteggi[cat] ?? 0) + 1
                }
            }
            for (const r of sentCats ?? []) {
                for (const cat of r.categorie_lex ?? []) {
                    conteggi[cat] = (conteggi[cat] ?? 0) + 1
                }
            }
            setConteggiPerCategoria(conteggi)

            const { data: prod } = await supabase
                .from('prodotti').select('prezzo').eq('tipo', 'accesso_singolo').eq('attivo', true).maybeSingle()
            if (prod) setPrezzoAccesso(prod.prezzo)

            setLoading(false)
        }
        caricaDatiBase()
    }, [])

    useEffect(() => {
        // Reset pagina quando cambiano filtri/categoria
        setPaginaSentenze(0)
    }, [categoriaSelezionata?.codice, ricercaAttiva, filtroAnno, filtroOrgano, filtroTipo, filtroFonte])

    useEffect(() => {
        if (vista !== 'categoria' || !categoriaSelezionata) return
        caricaSentenzeCategoria()
    }, [vista, categoriaSelezionata, ricercaAttiva, filtroAnno, filtroOrgano, filtroTipo, filtroFonte, paginaSentenze])

    async function caricaSentenzeCategoria() {
        setLoadingRisultati(true)

        // Strategia paginazione:
        // Per evitare merge complicati di due paginazioni separate (giurisprudenza + sentenze),
        // quando "tutte" sono attive: prima leggiamo i count totali, poi facciamo
        // una richiesta range proporzionale a ciascuna fonte.
        // Più semplice: per filtroFonte='gratuite' o 'pagamento' è una singola fonte,
        // per 'tutte' usiamo il count per dare a ciascuna metà del page size.

        const PER_PAGINA = PER_PAGINA_SENTENZE
        const offsetStart = paginaSentenze * PER_PAGINA
        const offsetEnd = offsetStart + PER_PAGINA - 1

        try {
            // Conta righe totali in entrambe le tabelle (con filtri applicati)
            const countFetchers = []
            if (filtroFonte !== 'pagamento') {
                let qc = supabase
                    .from('giurisprudenza_navigabile')
                    .select('id', { count: 'exact', head: true })
                    .contains('categorie_lex', [categoriaSelezionata.codice])
                    .eq('vigente', true)
                if (filtroAnno) qc = qc.eq('anno', parseInt(filtroAnno))
                if (filtroOrgano) qc = qc.eq('organo_macro', filtroOrgano)
                if (filtroTipo) qc = qc.eq('tipo_provvedimento', filtroTipo)
                if (ricercaAttiva.trim()) {
                    qc = qc.or(`oggetto.ilike.%${ricercaAttiva}%,principio_diritto.ilike.%${ricercaAttiva}%`)
                }
                countFetchers.push(qc)
            } else countFetchers.push(null)

            if (filtroFonte !== 'gratuite') {
                let qc = supabase
                    .from('sentenze')
                    .select('id', { count: 'exact', head: true })
                    .contains('categorie_lex', [categoriaSelezionata.codice])
                    .eq('stato', 'pubblica')
                if (filtroAnno) qc = qc.eq('anno', parseInt(filtroAnno))
                if (filtroTipo) qc = qc.eq('tipo_provvedimento', filtroTipo)
                if (ricercaAttiva.trim()) {
                    qc = qc.or(`oggetto.ilike.%${ricercaAttiva}%,principio_diritto.ilike.%${ricercaAttiva}%`)
                }
                countFetchers.push(qc)
            } else countFetchers.push(null)

            const [countGiur, countSent] = await Promise.all(countFetchers.map(f => f ?? Promise.resolve({ count: 0 })))
            const totGiur = countGiur?.count ?? 0
            const totSent = countSent?.count ?? 0
            const totale = totGiur + totSent
            setTotaleSentenze(totale)

            // Recupera entrambe le fonti con range completo (offsetStart..offsetEnd di ciascuna)
            // poi mergiamo, ordiniamo per data e prendiamo le prime PER_PAGINA.
            // Questo è semplice e corretto per page size piccolo.
            const fetchers = []
            if (filtroFonte !== 'pagamento') {
                let q = supabase
                    .from('giurisprudenza_navigabile')
                    .select('id, fonte, organo, organo_macro, sezione, numero, anno, data_deposito, data_pubblicazione, oggetto, tipo_provvedimento, categorie_lex, principio_diritto')
                    .contains('categorie_lex', [categoriaSelezionata.codice])
                    .eq('vigente', true)
                if (filtroAnno) q = q.eq('anno', parseInt(filtroAnno))
                if (filtroOrgano) q = q.eq('organo_macro', filtroOrgano)
                if (filtroTipo) q = q.eq('tipo_provvedimento', filtroTipo)
                if (ricercaAttiva.trim()) {
                    q = q.or(`oggetto.ilike.%${ricercaAttiva}%,principio_diritto.ilike.%${ricercaAttiva}%`)
                }
                fetchers.push(q.order('data_pubblicazione', { ascending: false, nullsFirst: false }).range(offsetStart, offsetEnd))
            }

            if (filtroFonte !== 'gratuite') {
                let q = supabase
                    .from('sentenze')
                    .select('id, fonte, organo, sezione, numero, anno, data_deposito, data_pubblicazione, oggetto, tipo_provvedimento, categorie_lex, principio_diritto, autore_id, autore:autore_id(nome, cognome)')
                    .contains('categorie_lex', [categoriaSelezionata.codice])
                    .eq('stato', 'pubblica')
                if (filtroAnno) q = q.eq('anno', parseInt(filtroAnno))
                if (filtroTipo) q = q.eq('tipo_provvedimento', filtroTipo)
                if (ricercaAttiva.trim()) {
                    q = q.or(`oggetto.ilike.%${ricercaAttiva}%,principio_diritto.ilike.%${ricercaAttiva}%`)
                }
                fetchers.push(q.order('data_pubblicazione', { ascending: false, nullsFirst: false }).range(offsetStart, offsetEnd))
            }

            const responses = await Promise.all(fetchers)

            let merged = []
            if (filtroFonte !== 'pagamento' && responses[0]?.data) {
                merged = merged.concat(responses[0].data.map(r => ({ ...r, sorgente: 'giurisprudenza' })))
            }
            const sentIdx = filtroFonte === 'pagamento' ? 0 : (filtroFonte === 'gratuite' ? -1 : 1)
            if (sentIdx >= 0 && responses[sentIdx]?.data) {
                merged = merged.concat(responses[sentIdx].data.map(r => ({
                    ...r,
                    sorgente: 'sentenza_avvocato',
                    organo_macro: null,
                })))
            }

            merged.sort((a, b) => {
                const dA = a.data_pubblicazione ?? a.data_deposito ?? (a.anno ? `${a.anno}-01-01` : '')
                const dB = b.data_pubblicazione ?? b.data_deposito ?? (b.anno ? `${b.anno}-01-01` : '')
                return dB.localeCompare(dA)
            })

            // Tronca a PER_PAGINA per garantire dimensione costante della pagina
            merged = merged.slice(0, PER_PAGINA)

            setRisultati(merged)

            const organi = new Set()
            for (const r of merged) {
                if (r.organo_macro) organi.add(r.organo_macro)
                else if (r.organo) organi.add(r.organo)
            }
            setOrganiDisponibili([...organi].sort())
        } finally {
            setLoadingRisultati(false)
        }
    }

    function apriCategoria(cat) {
        setCategoriaSelezionata(cat)
        setVista('categoria')
        setRicerca(''); setRicercaAttiva('')
        setFiltroAnno(''); setFiltroOrgano(''); setFiltroTipo(''); setFiltroFonte('tutte')
    }

    function tornaAlCatalogo() {
        setVista('catalogo')
        setCategoriaSelezionata(null)
        setRisultati([])
    }

    function avviaRicerca() { setRicercaAttiva(ricerca) }

    function titoloSentenza(s) {
        const parti = [s.organo ?? s.organo_macro, s.sezione, s.numero && `n. ${s.numero}`, s.anno].filter(Boolean)
        return parti.join(' · ') || 'Sentenza'
    }

    function labelTipoProvvedimento(t) {
        const map = {
            sentenza: 'Sentenza',
            ordinanza: 'Ordinanza',
            ordinanza_interlocutoria: 'Ord. interlocutoria',
            decreto_presidenziale: 'Decreto',
            rassegna: 'Rassegna',
            relazione: 'Relazione',
        }
        return map[t] ?? t
    }

    const TIPI_FILTRO = [
        { v: '', l: 'Tutti i tipi' },
        { v: 'sentenza', l: 'Sentenza' },
        { v: 'ordinanza', l: 'Ordinanza' },
        { v: 'ordinanza_interlocutoria', l: 'Ord. interlocutoria' },
        { v: 'decreto_presidenziale', l: 'Decreto presidenziale' },
        { v: 'rassegna', l: 'Rassegna' },
        { v: 'relazione', l: 'Relazione' },
    ]

    if (vista === 'catalogo') {
        if (loading) return (
            <div className="flex items-center justify-center py-20">
                <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
            </div>
        )

        return (
            <div className="space-y-6">
                {categorieRaggruppate.map(gruppo => {
                    const categorieConRisultati = gruppo.items.filter(c => (conteggiPerCategoria[c.codice] ?? 0) > 0)
                    if (categorieConRisultati.length === 0) return null

                    return (
                        <div key={gruppo.macro} className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                                <Scale size={13} className="text-oro/60" />
                                <h3 className="font-display text-base font-medium text-nebbia">{gruppo.macro}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {categorieConRisultati.map(c => (
                                    <button key={c.codice} onClick={() => apriCategoria(c)}
                                        className="bg-slate border border-white/5 p-4 text-left hover:border-oro/30 hover:bg-petrolio/60 transition-all group">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors truncate">{c.label}</p>
                                            </div>
                                            <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro/60 transition-colors shrink-0" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const annoCorrente = new Date().getFullYear()
    const anniOpzioni = Array.from({ length: 20 }, (_, i) => annoCorrente - i)

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <button onClick={tornaAlCatalogo} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                    <ChevronLeft size={13} /> Tutte le categorie
                </button>
                <p className="font-display text-xl text-nebbia">{categoriaSelezionata.label}</p>
            </div>

            <div className="bg-slate border border-white/5 p-4 space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                        <input
                            placeholder="Cerca in oggetto e principio di diritto..."
                            value={ricerca}
                            onChange={e => setRicerca(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') avviaRicerca() }}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                    </div>
                    <button onClick={avviaRicerca} className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                        <Search size={13} /> Cerca
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-nebbia/30">
                        <Filter size={12} />
                        <span className="font-body text-xs uppercase tracking-widest">Filtri</span>
                    </div>

                    <select value={filtroAnno} onChange={e => setFiltroAnno(e.target.value)}
                        className="bg-petrolio border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                        <option value="">Tutti gli anni</option>
                        {anniOpzioni.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    <select value={filtroOrgano} onChange={e => setFiltroOrgano(e.target.value)}
                        className="bg-petrolio border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                        <option value="">Tutte le corti</option>
                        {organiDisponibili.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>

                    <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                        className="bg-petrolio border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                        {TIPI_FILTRO.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                    </select>

                    <div className="flex gap-1 bg-petrolio border border-white/10 p-0.5">
                        {[
                            { v: 'tutte', l: 'Tutte' },
                            { v: 'gratuite', l: 'Gratuite' },
                            { v: 'pagamento', l: 'A pagamento' },
                        ].map(f => (
                            <button key={f.v} onClick={() => setFiltroFonte(f.v)}
                                className={`px-3 py-1 font-body text-xs transition-colors ${filtroFonte === f.v ? 'bg-oro/10 text-oro' : 'text-nebbia/40 hover:text-nebbia'}`}>
                                {f.l}
                            </button>
                        ))}
                    </div>

                    {(filtroAnno || filtroOrgano || filtroTipo || filtroFonte !== 'tutte' || ricercaAttiva) && (
                        <button onClick={() => {
                            setFiltroAnno(''); setFiltroOrgano(''); setFiltroTipo(''); setFiltroFonte('tutte')
                            setRicerca(''); setRicercaAttiva('')
                        }}
                            className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors flex items-center gap-1">
                            <X size={11} /> Reset
                        </button>
                    )}
                </div>
            </div>

            {loadingRisultati ? (
                <div className="flex items-center justify-center py-16">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : risultati.length === 0 ? (
                <div className="bg-slate border border-white/5 p-12 text-center">
                    <p className="font-body text-sm text-nebbia/40">Nessuna sentenza trovata con questi filtri</p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {risultati.map(s => {
                            const isGratuita = s.sorgente === 'giurisprudenza'
                            const dataVisibile = s.data_pubblicazione ?? s.data_deposito
                            const titolo = titoloSentenza(s)
                            const prefix = window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'
                            const targetPath = isGratuita
                                ? `${prefix}/lexum/${s.id}`
                                : `${prefix}/avvocato/${s.id}`

                            return (
                                <button
                                    key={`${s.sorgente}-${s.id}`}
                                    onClick={() => navigate(targetPath)}
                                    className={`w-full text-left bg-slate border p-5 transition-all ${isGratuita ? 'border-white/5 hover:border-salvia/20' : 'border-white/5 hover:border-oro/20'}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="font-body text-xs text-nebbia/60">{titolo}</span>
                                                {s.tipo_provvedimento && (
                                                    <span className="font-body text-[10px] text-nebbia/50 border border-white/10 px-1.5 py-0.5 uppercase tracking-wider">
                                                        {labelTipoProvvedimento(s.tipo_provvedimento)}
                                                    </span>
                                                )}
                                                {dataVisibile && (
                                                    <span className="font-body text-[10px] text-nebbia/30 flex items-center gap-1">
                                                        <Calendar size={9} /> {new Date(dataVisibile).toLocaleDateString('it-IT')}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-body text-sm font-medium text-nebbia mb-1.5 leading-snug">{s.oggetto ?? '—'}</h3>
                                            {s.principio_diritto && (
                                                <p className="font-body text-xs text-nebbia/50 leading-relaxed line-clamp-2">{s.principio_diritto}</p>
                                            )}
                                            {!isGratuita && s.autore && (
                                                <p className="font-body text-xs text-nebbia/35 mt-2">Caricata da Avv. {s.autore.nome} {s.autore.cognome}</p>
                                            )}
                                        </div>

                                        <div className="shrink-0 flex flex-col items-end gap-2">
                                            {isGratuita ? (
                                                <span className="font-body text-xs text-salvia border border-salvia/30 px-2 py-1 bg-salvia/5">
                                                    Gratuita
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="font-display text-lg font-semibold text-oro">EUR {prezzoAccesso}</span>
                                                    <span className="font-body text-xs text-oro/60">accesso singolo</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {totaleSentenze > PER_PAGINA_SENTENZE && (
                        <div className="flex items-center justify-between bg-slate border border-white/5 px-4 py-3">
                            <p className="font-body text-xs text-nebbia/30">
                                {paginaSentenze * PER_PAGINA_SENTENZE + 1}–{Math.min((paginaSentenze + 1) * PER_PAGINA_SENTENZE, totaleSentenze)} di {totaleSentenze.toLocaleString('it-IT')}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setPaginaSentenze(p => Math.max(0, p - 1))} disabled={paginaSentenze === 0}
                                    className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">← Prev</button>
                                <button onClick={() => setPaginaSentenze(p => p + 1)} disabled={(paginaSentenze + 1) * PER_PAGINA_SENTENZE >= totaleSentenze}
                                    className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">Next →</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// TAB PRASSI — invariato (non aveva bottoni di salvataggio)
// ═══════════════════════════════════════════════════════════════
function TabPrassi() {
    const navigate = useNavigate()

    const [enti, setEnti] = useState([])
    const [conteggiPerEnte, setConteggiPerEnte] = useState({})
    const [loading, setLoading] = useState(true)

    const [vista, setVista] = useState('catalogo')
    const [enteSelezionato, setEnteSelezionato] = useState(null)

    const [ricerca, setRicerca] = useState('')
    const [ricercaAttiva, setRicercaAttiva] = useState('')
    const [filtroAnno, setFiltroAnno] = useState('')
    const [filtroCategoria, setFiltroCategoria] = useState('')

    const [risultati, setRisultati] = useState([])
    const [totalePrassi, setTotalePrassi] = useState(0)
    const [paginaPrassi, setPaginaPrassi] = useState(0)
    const [loadingRisultati, setLoadingRisultati] = useState(false)

    const PER_PAGINA_PRASSI = 50

    const [mappaCategorie, setMappaCategorie] = useState({})

    useEffect(() => {
        async function caricaDatiBase() {
            setLoading(true)

            const { data: entiData } = await supabase
                .from('enti')
                .select('codice, label, descrizione, macro_area, ordine')
                .order('ordine')
            setEnti(entiData ?? [])

            const { data: prassiCounts } = await supabase
                .from('prassi')
                .select('fonte')
            const conteggi = {}
            for (const r of prassiCounts ?? []) {
                conteggi[r.fonte] = (conteggi[r.fonte] ?? 0) + 1
            }
            setConteggiPerEnte(conteggi)

            const { data: cat } = await supabase
                .from('codici_lex')
                .select('codice, label')
            const m = {}
            for (const c of cat ?? []) m[c.codice] = c.label
            setMappaCategorie(m)

            setLoading(false)
        }
        caricaDatiBase()
    }, [])

    useEffect(() => {
        // Reset pagina quando cambiano filtri/ente
        setPaginaPrassi(0)
    }, [enteSelezionato?.codice, ricercaAttiva, filtroAnno, filtroCategoria])

    useEffect(() => {
        if (vista !== 'ente' || !enteSelezionato) return
        caricaPrassi()
    }, [vista, enteSelezionato, ricercaAttiva, filtroAnno, filtroCategoria, paginaPrassi])

    async function caricaPrassi() {
        setLoadingRisultati(true)

        const offsetStart = paginaPrassi * PER_PAGINA_PRASSI
        const offsetEnd = offsetStart + PER_PAGINA_PRASSI - 1

        let q = supabase
            .from('prassi')
            .select('id, fonte, numero, anno, data_pubblicazione, data_emanazione, oggetto, sintesi, categorie_lex', { count: 'exact' })
            .eq('fonte', enteSelezionato.codice)
            .eq('vigente', true)

        if (filtroAnno) q = q.eq('anno', parseInt(filtroAnno))
        if (filtroCategoria) q = q.contains('categorie_lex', [filtroCategoria])
        if (ricercaAttiva.trim()) {
            q = q.or(`oggetto.ilike.%${ricercaAttiva}%,sintesi.ilike.%${ricercaAttiva}%`)
        }

        const { data, count } = await q
            .order('data_pubblicazione', { ascending: false, nullsFirst: false })
            .range(offsetStart, offsetEnd)

        setRisultati(data ?? [])
        setTotalePrassi(count ?? 0)
        setLoadingRisultati(false)
    }

    function apriEnte(ente) {
        setEnteSelezionato(ente)
        setVista('ente')
        setRicerca(''); setRicercaAttiva('')
        setFiltroAnno(''); setFiltroCategoria('')
    }

    function tornaAlCatalogo() {
        setVista('catalogo')
        setEnteSelezionato(null)
        setRisultati([])
    }

    function avviaRicerca() { setRicercaAttiva(ricerca) }

    if (vista === 'catalogo') {
        if (loading) return (
            <div className="flex items-center justify-center py-20">
                <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
            </div>
        )

        const entiVisibili = enti.filter(e => (conteggiPerEnte[e.codice] ?? 0) > 0)

        if (entiVisibili.length === 0) {
            return (
                <div className="bg-slate border border-white/5 p-12 text-center">
                    <Building2 size={32} className="text-nebbia/15 mx-auto mb-3" />
                    <p className="font-body text-sm text-nebbia/40">Nessuna prassi disponibile</p>
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {entiVisibili.map(e => (
                    <button key={e.codice} onClick={() => apriEnte(e)}
                        className="bg-slate border border-white/5 px-4 py-3.5 text-left hover:border-oro/30 hover:bg-petrolio/60 transition-all group">
                        <div className="flex items-center justify-between gap-3">
                            <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors truncate">
                                {e.label}
                            </p>
                            <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro/60 transition-colors shrink-0" />
                        </div>
                    </button>
                ))}
            </div>
        )
    }

    const annoCorrente = new Date().getFullYear()
    const anniOpzioni = Array.from({ length: 25 }, (_, i) => annoCorrente - i)

    const categorieUsate = new Set()
    for (const r of risultati) {
        for (const c of r.categorie_lex ?? []) categorieUsate.add(c)
    }
    const categorieArr = [...categorieUsate].sort()

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <button onClick={tornaAlCatalogo} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                    <ChevronLeft size={13} /> Tutti gli enti
                </button>
                <p className="font-body text-lg font-medium text-nebbia">{enteSelezionato.label}</p>
            </div>

            <div className="bg-slate border border-white/5 p-4 space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                        <input
                            placeholder="Cerca in oggetto e sintesi..."
                            value={ricerca}
                            onChange={e => setRicerca(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') avviaRicerca() }}
                            className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-9 pr-4 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                        />
                    </div>
                    <button onClick={avviaRicerca} className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/30 text-oro font-body text-sm hover:bg-oro/20 transition-colors">
                        <Search size={13} /> Cerca
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-nebbia/30">
                        <Filter size={12} />
                        <span className="font-body text-xs uppercase tracking-widest">Filtri</span>
                    </div>

                    <select value={filtroAnno} onChange={e => setFiltroAnno(e.target.value)}
                        className="bg-petrolio border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                        <option value="">Tutti gli anni</option>
                        {anniOpzioni.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    {categorieArr.length > 0 && (
                        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
                            className="bg-petrolio border border-white/10 text-nebbia/60 font-body text-xs px-3 py-1.5 outline-none focus:border-oro/40">
                            <option value="">Tutte le categorie</option>
                            {categorieArr.map(c => (
                                <option key={c} value={c}>{mappaCategorie[c] ?? c}</option>
                            ))}
                        </select>
                    )}

                    {(filtroAnno || filtroCategoria || ricercaAttiva) && (
                        <button onClick={() => {
                            setFiltroAnno(''); setFiltroCategoria('')
                            setRicerca(''); setRicercaAttiva('')
                        }}
                            className="font-body text-xs text-nebbia/30 hover:text-red-400 transition-colors flex items-center gap-1">
                            <X size={11} /> Reset
                        </button>
                    )}
                </div>
            </div>

            {loadingRisultati ? (
                <div className="flex items-center justify-center py-16">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : risultati.length === 0 ? (
                <div className="bg-slate border border-white/5 p-12 text-center">
                    <p className="font-body text-sm text-nebbia/40">Nessuna prassi trovata con questi filtri</p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {risultati.map(p => {
                            const dataVisibile = p.data_pubblicazione ?? p.data_emanazione
                            const riferimento = [p.numero && `n. ${p.numero}`, p.anno].filter(Boolean).join(' · ')
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => navigate(`${window.location.pathname.startsWith('/area') ? '/area' : '/banca-dati'}/prassi/${p.id}`)}
                                    className="w-full text-left bg-slate border border-white/5 hover:border-salvia/20 p-5 transition-all"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                {riferimento && (
                                                    <span className="font-body text-xs text-nebbia/60">{riferimento}</span>
                                                )}
                                                {dataVisibile && (
                                                    <span className="font-body text-[10px] text-nebbia/30 flex items-center gap-1">
                                                        <Calendar size={9} /> {new Date(dataVisibile).toLocaleDateString('it-IT')}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-body text-sm font-medium text-nebbia mb-1.5 leading-snug">{p.oggetto ?? '—'}</h3>
                                            {p.sintesi && (
                                                <p className="font-body text-xs text-nebbia/50 leading-relaxed line-clamp-2">{p.sintesi}</p>
                                            )}
                                            {(p.categorie_lex ?? []).length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {p.categorie_lex.slice(0, 4).map(c => (
                                                        <span key={c} className="font-body text-[10px] text-nebbia/50 border border-white/10 px-1.5 py-0.5">
                                                            {mappaCategorie[c] ?? c}
                                                        </span>
                                                    ))}
                                                    {p.categorie_lex.length > 4 && (
                                                        <span className="font-body text-[10px] text-nebbia/30">+{p.categorie_lex.length - 4}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="shrink-0 flex flex-col items-end gap-2">
                                            <span className="font-body text-xs text-salvia border border-salvia/30 px-2 py-1 bg-salvia/5">
                                                Gratuita
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {totalePrassi > PER_PAGINA_PRASSI && (
                        <div className="flex items-center justify-between bg-slate border border-white/5 px-4 py-3">
                            <p className="font-body text-xs text-nebbia/30">
                                {paginaPrassi * PER_PAGINA_PRASSI + 1}–{Math.min((paginaPrassi + 1) * PER_PAGINA_PRASSI, totalePrassi)} di {totalePrassi.toLocaleString('it-IT')}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setPaginaPrassi(p => Math.max(0, p - 1))} disabled={paginaPrassi === 0}
                                    className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">← Prev</button>
                                <button onClick={() => setPaginaPrassi(p => p + 1)} disabled={(paginaPrassi + 1) * PER_PAGINA_PRASSI >= totalePrassi}
                                    className="px-3 py-1.5 bg-petrolio border border-white/10 text-nebbia/50 font-body text-xs hover:text-nebbia transition-colors disabled:opacity-30">Next →</button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPALE — "Banca dati"
// ═══════════════════════════════════════════════════════════════
export function BancaDati() {
    const { profile } = useAuth()
    const isAvvocato = profile?.role === 'avvocato'
    const { crediti, setCrediti } = useCreditiAI()
    const [messaggiConversazione, setMessaggiConversazione] = useState([])

    const [tabAttivo, setTabAttivo] = useState('italiana')

    return (
        <div className="space-y-5 p-6">

            {/* Header */}
            <PageHeader
                label="Banca dati"
                title="Codici, leggi, sentenze e prassi"
                subtitle="Ricerca con Lex AI o sfoglia normativa italiana, europea, giurisprudenza e prassi amministrativa"
            />

            {/* Lex — sempre attivo, cross-fonte */}
            <RicercaAI
                codice={null}
                crediti={crediti}
                setCrediti={setCrediti}
                messaggi={messaggiConversazione}
                onAggiornaMessaggi={setMessaggiConversazione}
            />

            {/* Tab primario Italiana | UE | Sentenze | Prassi */}
            <div className="!mt-10 pt-6 border-t border-white/5 space-y-5">
                <div className="flex items-center gap-3 flex-wrap">
                    <p className="section-label !m-0">Sfoglia</p>
                    <div className="flex gap-1 bg-slate border border-white/5 p-1">
                        <button onClick={() => setTabAttivo('italiana')}
                            className={`flex items-center gap-2 px-3 py-1.5 font-body text-xs transition-colors ${tabAttivo === 'italiana' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}>
                            <Flag size={12} /> Italiana
                        </button>
                        <button onClick={() => setTabAttivo('ue')}
                            className={`flex items-center gap-2 px-3 py-1.5 font-body text-xs transition-colors ${tabAttivo === 'ue' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}>
                            <Globe size={12} /> UE
                        </button>
                        <button onClick={() => setTabAttivo('sentenze')}
                            className={`flex items-center gap-2 px-3 py-1.5 font-body text-xs transition-colors ${tabAttivo === 'sentenze' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}>
                            <Landmark size={12} /> Sentenze
                        </button>
                        <button onClick={() => setTabAttivo('prassi')}
                            className={`flex items-center gap-2 px-3 py-1.5 font-body text-xs transition-colors ${tabAttivo === 'prassi' ? 'bg-oro/10 text-oro border border-oro/30' : 'text-nebbia/40 hover:text-nebbia'}`}>
                            <ScrollText size={12} /> Prassi
                        </button>
                    </div>
                </div>

                {tabAttivo === 'italiana' && (
                    <TabNormativa
                        datasetFonte="it"
                        key="it"
                        crediti={crediti}
                        setCrediti={setCrediti}
                        messaggiConversazione={messaggiConversazione}
                        setMessaggiConversazione={setMessaggiConversazione}
                    />
                )}
                {tabAttivo === 'ue' && (
                    <TabNormativa
                        datasetFonte="ue"
                        key="ue"
                        crediti={crediti}
                        setCrediti={setCrediti}
                        messaggiConversazione={messaggiConversazione}
                        setMessaggiConversazione={setMessaggiConversazione}
                    />
                )}
                {tabAttivo === 'sentenze' && <TabSentenze />}
                {tabAttivo === 'prassi' && <TabPrassi />}
            </div>
        </div>
    )
}