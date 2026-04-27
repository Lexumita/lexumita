// src/pages/avvocato/Normativa.jsx
// Pagina "Banca dati" (ex-Normativa) — 3 tab primari: Italiana | UE | Sentenze
// - Italiana/UE: logica esistente (ricerca globale + griglia codici)
// - Sentenze: NUOVO — unisce giurisprudenza_navigabile + sentenze avvocati

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

        // Leggi TUTTI i record di crediti dell'utente
        const { data } = await supabase
            .from('crediti_ai')
            .select('crediti_totali, crediti_usati, periodo_fine, tipo')
            .eq('user_id', user.id)

        if (!data || data.length === 0) {
            setCrediti(0)
            return
        }

        // Somma i residui dei record validi (non scaduti)
        const now = new Date()
        const totale = data.reduce((acc, row) => {
            const residui = row.crediti_totali - row.crediti_usati
            const scaduto = row.periodo_fine && new Date(row.periodo_fine) < now
            // periodo_fine NULL = no scadenza (benvenuto/topup)
            // periodo_fine futuro = piano attivo
            return acc + (residui > 0 && !scaduto ? residui : 0)
        }, 0)

        setCrediti(totale)
    }

    useEffect(() => {
        caricaCrediti()

        // Ricarica quando la finestra torna in focus (es. dopo aver acquistato crediti in altra tab)
        function onFocus() { caricaCrediti() }
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [])

    return { crediti, setCrediti, refreshCrediti: caricaCrediti }
}

// ═══════════════════════════════════════════════════════════════
// LEX ANIMAZIONE — SVG inline durante l'attesa
// ═══════════════════════════════════════════════════════════════
function LexAnimazione({ faseAttiva }) {
    const testoFase = {
        analisi: 'Lex sta analizzando la tua domanda',
        ricerca: 'Identifico le fonti rilevanti',
        sintesi: 'Compongo la risposta',
    }
    const testoVisibile = faseAttiva ? testoFase[faseAttiva] : null

    return (
        <div className="bg-petrolio border border-oro/15 px-3 py-4 max-w-[420px] mx-auto">
            <style>{`
            .lex-stage {
                position: relative;
                width: 100%;
                aspect-ratio: 16 / 7;
                margin: 0 auto;
            }
                .lex-stage svg { width: 100%; height: 100%; display: block; }

                /* ─── Raggio scansione (loop su 27s totali, 3 cicli da 9s) ─── */
                .lex-ray {
                    animation: lexRayCycle 27s ease-in-out infinite;
                }
                @keyframes lexRayCycle {
                    /* CICLO 1: scansiona verso libro A (sx) */
                    0%   { transform: translateX(-30px); opacity: 0; }
                    3%   { opacity: 0.8; }
                    8%   { transform: translateX(85px); opacity: 0.9; }
                    12%  { transform: translateX(85px); opacity: 1; }
                    16%  { transform: translateX(85px); opacity: 0; }
                    33%  { transform: translateX(85px); opacity: 0; }

                    /* CICLO 2: scansiona verso libro B (centro) */
                    34%  { transform: translateX(-30px); opacity: 0; }
                    37%  { opacity: 0.8; }
                    42%  { transform: translateX(180px); opacity: 0.9; }
                    46%  { transform: translateX(180px); opacity: 1; }
                    50%  { transform: translateX(180px); opacity: 0; }
                    66%  { transform: translateX(180px); opacity: 0; }

                    /* CICLO 3: scansiona verso libro C (dx) */
                    67%  { transform: translateX(-30px); opacity: 0; }
                    70%  { opacity: 0.8; }
                    78%  { transform: translateX(290px); opacity: 0.9; }
                    82%  { transform: translateX(290px); opacity: 1; }
                    86%  { transform: translateX(290px); opacity: 0; }
                    100% { transform: translateX(290px); opacity: 0; }
                }

                /* ─── Libro A si illumina (fase 1, 0-33%) ─── */
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

                /* ─── Libro B si illumina (fase 2, 33-66%) ─── */
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

                /* ─── Libro C si illumina (fase 3, 66-100%) ─── */
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

                /* ─── Libro aperto A (sopra il libro A che si è abbassato) ─── */
                .lex-open-a {
                    opacity: 0;
                    transform-origin: center;
                    animation: lexOpenA 27s ease-in-out infinite;
                }
                @keyframes lexOpenA {
                    0%, 16% { opacity: 0; transform: translateY(20px) scale(0.7); }
                    20% { opacity: 1; transform: translateY(0) scale(1); }
                    28% { opacity: 1; transform: translateY(0) scale(1); }
                    32% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                    100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                }
                .lex-open-b {
                    opacity: 0;
                    transform-origin: center;
                    animation: lexOpenB 27s ease-in-out infinite;
                }
                @keyframes lexOpenB {
                    0%, 50% { opacity: 0; transform: translateY(20px) scale(0.7); }
                    54% { opacity: 1; transform: translateY(0) scale(1); }
                    62% { opacity: 1; transform: translateY(0) scale(1); }
                    66% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                    100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                }
                .lex-open-c {
                    opacity: 0;
                    transform-origin: center;
                    animation: lexOpenC 27s ease-in-out infinite;
                }
                @keyframes lexOpenC {
                    0%, 86% { opacity: 0; transform: translateY(20px) scale(0.7); }
                    90% { opacity: 1; transform: translateY(0) scale(1); }
                    97% { opacity: 1; transform: translateY(0) scale(1); }
                    100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                }

                /* ─── Particelle: 3 cicli con tempi diversi ─── */
                .lex-particle-a {
                    opacity: 0;
                    animation: lexParticleA 27s ease-in-out infinite;
                }
                @keyframes lexParticleA {
                    0%, 22% { opacity: 0; transform: translateY(0); }
                    24% { opacity: 1; transform: translateY(-5px); }
                    30% { opacity: 0.6; transform: translateY(-25px); }
                    33%, 100% { opacity: 0; transform: translateY(-35px); }
                }
                .lex-particle-b {
                    opacity: 0;
                    animation: lexParticleB 27s ease-in-out infinite;
                }
                @keyframes lexParticleB {
                    0%, 56% { opacity: 0; transform: translateY(0); }
                    58% { opacity: 1; transform: translateY(-5px); }
                    64% { opacity: 0.6; transform: translateY(-25px); }
                    67%, 100% { opacity: 0; transform: translateY(-35px); }
                }
                .lex-particle-c {
                    opacity: 0;
                    animation: lexParticleC 27s ease-in-out infinite;
                }
                @keyframes lexParticleC {
                    0%, 92% { opacity: 0; transform: translateY(0); }
                    94% { opacity: 1; transform: translateY(-5px); }
                    99% { opacity: 0.6; transform: translateY(-25px); }
                    100% { opacity: 0; transform: translateY(-35px); }
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
                <svg viewBox="0 0 540 240" xmlns="http://www.w3.org/2000/svg" role="img">
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

                    {/* ★ LIBRO A — posizione 4 (x=155-177) */}
                    <rect className="lex-book-a" x="155" y="96" width="22" height="76" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="161" y1="112" x2="171" y2="112" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="180" y="108" width="20" height="64" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="185" y1="122" x2="195" y2="122" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />
                    <line x1="185" y1="127" x2="195" y2="127" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="203" y="98" width="22" height="74" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="209" y1="113" x2="219" y2="113" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="228" y="103" width="24" height="69" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="234" y1="118" x2="246" y2="118" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    {/* ★ LIBRO B — posizione 8 (x=255-281) */}
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

                    {/* ★ LIBRO C — posizione 12 (x=361-381) */}
                    <rect className="lex-book-c" x="361" y="106" width="20" height="66" rx="1" fill="#1d2c3a" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="366" y1="121" x2="376" y2="121" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="384" y="100" width="22" height="72" rx="1" fill="#2a3b4f" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="390" y1="115" x2="400" y2="115" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    <rect x="409" y="95" width="24" height="77" rx="1" fill="#243447" stroke="rgba(201, 164, 92, 0.2)" strokeWidth="1" />
                    <line x1="415" y1="111" x2="427" y2="111" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />
                    <line x1="415" y1="116" x2="427" y2="116" stroke="rgba(201, 164, 92, 0.3)" strokeWidth="0.5" />

                    {/* ─── Raggio (singolo, riposizionato dai keyframes) ─── */}
                    <g className="lex-ray">
                        <ellipse cx="80" cy="135" rx="22" ry="55" fill="#C9A45C" opacity="0.18" />
                        <ellipse cx="80" cy="135" rx="14" ry="45" fill="#C9A45C" opacity="0.25" />
                        <ellipse cx="80" cy="135" rx="6" ry="35" fill="#C9A45C" opacity="0.4" />
                        <line x1="80" y1="80" x2="80" y2="180" stroke="#C9A45C" strokeWidth="0.5" opacity="0.6" />
                    </g>

                    {/* ─── LIBRO APERTO A (sopra libro A) ─── */}
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

                    {/* ─── LIBRO APERTO B (sopra libro B, posizione originale) ─── */}
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

                    {/* ─── LIBRO APERTO C (sopra libro C) ─── */}
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

                    {/* ─── PARTICELLE: 3 set, uno per libro ─── */}
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
                    <span className="font-body text-sm text-nebbia/70 tracking-wide inline-flex items-center">
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
// LEX — RICERCA AI (multi-agent streaming)
// ═══════════════════════════════════════════════════════════════
function RicercaAI({ codice, onRisultato, crediti, setCrediti, messaggi, onAggiornaMessaggi, praticaAttiva, onRicercaSalvata }) {
    const [domanda, setDomanda] = useState('')
    const [cercando, setCercando] = useState(false)
    const [errore, setErrore] = useState(null)
    const [conversazione, setConversazione] = useState([])
    const [faseCorrente, setFaseCorrente] = useState(null)
    const [streamingTesto, setStreamingTesto] = useState('')
    const [meta, setMeta] = useState(null)

    // ID conversazione persistente per gestire approfondimenti server-side
    const [clientConversationId, setClientConversationId] = useState(() => crypto.randomUUID())

    // Ref per cancellare lo stream se necessario
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
                                    setFaseCorrente(null)  // skip animazione per template
                                } else {
                                    setFaseCorrente(data.fase)
                                }
                            }

                            if (eventoCorrente === 'chunk') {
                                testoAccumulato += data.text ?? ''
                                setStreamingTesto(testoAccumulato)
                                if (faseCorrente !== null) setFaseCorrente(null)  // ferma animazione al primo chunk
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
                            // ignore malformed payload
                        }
                    }
                }
            }

            // Stream completato: consolida il messaggio
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
        if (onAggiornaMessaggi) onAggiornaMessaggi([])
    }

    function approfondisci(filtro_key, label, subagent_source) {
        cerca(`Approfondisci: ${label}`, {
            tipoRichiesta: 'approfondimento',
            subagentTarget: subagent_source,
            filtroApprofondimento: filtro_key,
        })
    }

    // Componenti markdown custom: link in nuova tab, niente reload
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

            // Determina il prefisso corretto in base al path corrente
            // (avvocato sta su /banca-dati, user sta su /area)
            const isAreaUtente = window.location.pathname.startsWith('/area')
            const prefix = isAreaUtente ? '/area' : '/banca-dati'

            let finalHref = href

            // Riscrivi i link interni adattandoli al contesto
            if (href.startsWith('/banca-dati/norma/')) {
                const id = href.split('/').pop()
                finalHref = `${prefix}/norma/${id}`
            } else if (href.startsWith('/banca-dati/archivio/')) {
                // Archivio gestito dalla stessa pagina norma (cerca multi-tabella)
                const id = href.split('/').pop()
                finalHref = `${prefix}/norma/${id}`
            } else if (href.startsWith('/banca-dati/')) {
                // Altri link banca-dati (lexum, avvocato, prassi) → adatta solo il prefisso
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

                                    {/* MARKETPLACE — sentenze annotate da colleghi */}
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

                                    {/* APPROFONDIMENTI SUGGERITI */}
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

                    {/* Streaming in corso: animazione + testo che si scrive */}
                    {cercando && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="font-body text-xs font-medium text-salvia/70">Lex</span>
                            </div>

                            {/* Animazione visibile prima del primo chunk */}
                            {streamingTesto.length === 0 && (
                                <LexAnimazione faseAttiva={faseCorrente} />
                            )}

                            {/* Testo che si scrive progressivamente */}
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

            {/* Salvataggio in pratica + etichetta — visibili dopo almeno una risposta */}
            {conversazione.length >= 2 && !cercando && (
                <div className="px-5 pb-3 flex flex-wrap gap-2 [&>button]:h-[38px] [&>div>button]:h-[38px]">
                    <SalvaInPratica
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
                        praticaAttiva={praticaAttiva}
                        onRicercaSalvata={onRicercaSalvata}
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
// SALVA IN PRATICA (helper)
// ═══════════════════════════════════════════════════════════════
function SalvaInPratica({ ricerca, praticaAttiva, onRicercaSalvata }) {
    const { profile } = useAuth()
    const [salvando, setSalvando] = useState(false)
    const [salvato, setSalvato] = useState(false)
    const [errore, setErrore] = useState(null)

    async function salva() {
        if (!praticaAttiva) return
        setSalvando(true); setErrore(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('ricerche').insert({
                pratica_id: praticaAttiva.id,
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
            setSalvato(true)
            if (onRicercaSalvata) onRicercaSalvata()
        } catch (e) {
            setErrore(e.message)
        } finally {
            setSalvando(false)
        }
    }

    if (salvato) return (
        <p className="font-body text-xs text-salvia flex items-center gap-1.5 mt-2">
            <Sparkles size={10} /> Salvato in "{praticaAttiva?.titolo}"
        </p>
    )

    // Solo gli avvocati hanno pratiche
    if (profile?.role !== 'avvocato') return null

    return (
        <div className="mt-2 space-y-1">
            <button
                onClick={salva}
                disabled={salvando || !praticaAttiva}
                className="flex items-center gap-2 px-4 py-2 border font-body text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-oro/10 border-oro/30 text-oro hover:bg-oro/20"
            >
                {salvando
                    ? <span className="animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />
                    : <Save size={13} />
                }
                {praticaAttiva
                    ? `Salva in "${praticaAttiva.titolo}"`
                    : 'Seleziona una pratica per salvare'
                }
            </button>
            {errore && <p className="font-body text-xs text-red-400">{errore}</p>}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// TAB NORMATIVA (Italiana + UE) — riuso della logica esistente
// ═══════════════════════════════════════════════════════════════
function TabNormativa({ datasetFonte, crediti, setCrediti, praticaAttiva, refreshPannello, setRefreshPannello, messaggiConversazione, setMessaggiConversazione }) {
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

    // Reset al cambio dataset (IT <-> UE)
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
            {/* Vista CATALOGO */}
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
                                                        <div className="mt-3 flex flex-wrap items-start gap-2">
                                                            <SalvaInPratica
                                                                ricerca={{
                                                                    tipo: 'ricerca_manuale',
                                                                    domanda: `${n.articolo}${n.rubrica ? ` — ${n.rubrica}` : ''}${dataset === 'ue' ? ` (${docLabel(n)})` : ''}`,
                                                                    testo: n.testo,
                                                                    codice: dataset === 'ue' ? (n.categorie_lex?.[0] ?? null) : n.codice
                                                                }}
                                                                praticaAttiva={praticaAttiva}
                                                                onRicercaSalvata={() => setRefreshPannello(p => p + 1)}
                                                            />
                                                            <AggiungiAEtichetta
                                                                elemento={{ tipo: 'norma', id: n.id }}
                                                                variant="compact"
                                                            />
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

                    {/* Griglia categorie */}
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
                                            <p className="font-body text-xs text-nebbia/30 mt-0.5">{c.totale?.toLocaleString()} articoli</p>
                                        </div>
                                        <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro/60 transition-colors shrink-0" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Vista CODICE */}
            {vista === 'codice' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <button onClick={tornaAlCatalogo} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                            <ChevronLeft size={13} /> {dataset === 'ue' ? 'Tutte le categorie' : 'Tutti i codici'}
                        </button>
                        <p className="font-display text-xl text-nebbia">{labelSelezionato} <span className="font-body text-sm text-nebbia/40 ml-2">({totaleNorme.toLocaleString()} articoli)</span></p>
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
                                                    <div className="mt-3 flex flex-wrap items-start gap-2">
                                                        <SalvaInPratica
                                                            ricerca={{
                                                                tipo: 'ricerca_manuale',
                                                                domanda: `${n.articolo}${n.rubrica ? ` — ${n.rubrica}` : ''}${dataset === 'ue' ? ` (${docLabel(n)})` : ''}`,
                                                                testo: n.testo,
                                                                codice: dataset === 'ue' ? (n.categorie_lex?.[0] ?? null) : n.codice
                                                            }}
                                                            praticaAttiva={praticaAttiva}
                                                            onRicercaSalvata={() => setRefreshPannello(p => p + 1)}
                                                        />
                                                        <AggiungiAEtichetta
                                                            elemento={{ tipo: 'norma', id: n.id }}
                                                            variant="compact"
                                                        />
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
// TAB SENTENZE — nuovo
// ═══════════════════════════════════════════════════════════════
function TabSentenze({ praticaAttiva, setRefreshPannello }) {
    const navigate = useNavigate()

    // Dati base
    const [categorieRaggruppate, setCategorieRaggruppate] = useState([])
    const [conteggiPerCategoria, setConteggiPerCategoria] = useState({})
    const [organiDisponibili, setOrganiDisponibili] = useState([])
    const [loading, setLoading] = useState(true)

    // Navigazione
    const [vista, setVista] = useState('catalogo') // 'catalogo' | 'categoria'
    const [categoriaSelezionata, setCategoriaSelezionata] = useState(null)

    // Filtri vista categoria
    const [ricerca, setRicerca] = useState('')
    const [ricercaAttiva, setRicercaAttiva] = useState('')
    const [filtroAnno, setFiltroAnno] = useState('')
    const [filtroOrgano, setFiltroOrgano] = useState('')
    const [filtroTipo, setFiltroTipo] = useState('')
    const [filtroFonte, setFiltroFonte] = useState('tutte') // tutte | gratuite | pagamento

    // Risultati
    const [risultati, setRisultati] = useState([])
    const [loadingRisultati, setLoadingRisultati] = useState(false)

    // Prezzo default sentenze avvocati
    const [prezzoAccesso, setPrezzoAccesso] = useState(15)

    // ── CARICAMENTO INIZIALE: categorie + conteggi ──
    useEffect(() => {
        async function caricaDatiBase() {
            setLoading(true)

            // 1. Categorie raggruppate per macro_label
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

            // 3. Prezzo sentenza
            const { data: prod } = await supabase
                .from('prodotti').select('prezzo').eq('tipo', 'accesso_singolo').eq('attivo', true).maybeSingle()
            if (prod) setPrezzoAccesso(prod.prezzo)

            setLoading(false)
        }
        caricaDatiBase()
    }, [])

    // ── CARICAMENTO RISULTATI CATEGORIA ──
    useEffect(() => {
        if (vista !== 'categoria' || !categoriaSelezionata) return
        caricaSentenzeCategoria()
    }, [vista, categoriaSelezionata, ricercaAttiva, filtroAnno, filtroOrgano, filtroTipo, filtroFonte])

    async function caricaSentenzeCategoria() {
        setLoadingRisultati(true)

        const fetchers = []

        // Query giurisprudenza (gratuita) — tramite view
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
            fetchers.push(q.order('data_pubblicazione', { ascending: false, nullsFirst: false }).limit(100))
        }

        // Query sentenze avvocati (a pagamento)
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
            fetchers.push(q.order('data_pubblicazione', { ascending: false, nullsFirst: false }).limit(100))
        }

        try {
            const responses = await Promise.all(fetchers)

            // Normalizza i record con un campo "sorgente" per distinguerli nella UI
            let merged = []
            if (filtroFonte !== 'pagamento' && responses[0]?.data) {
                merged = merged.concat(responses[0].data.map(r => ({ ...r, sorgente: 'giurisprudenza' })))
            }
            const sentIdx = filtroFonte === 'pagamento' ? 0 : (filtroFonte === 'gratuite' ? -1 : 1)
            if (sentIdx >= 0 && responses[sentIdx]?.data) {
                merged = merged.concat(responses[sentIdx].data.map(r => ({
                    ...r,
                    sorgente: 'sentenza_avvocato',
                    organo_macro: null,  // le sentenze avvocati non hanno questo campo, useremo `organo` nudo
                })))
            }

            // Ordina per data_pubblicazione desc (fallback data_deposito, poi anno)
            merged.sort((a, b) => {
                const dA = a.data_pubblicazione ?? a.data_deposito ?? (a.anno ? `${a.anno}-01-01` : '')
                const dB = b.data_pubblicazione ?? b.data_deposito ?? (b.anno ? `${b.anno}-01-01` : '')
                return dB.localeCompare(dA)
            })

            setRisultati(merged)

            // Aggiorna lista organi disponibili in questa categoria (sommati)
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

    // ── VISTA CATALOGO: griglia categorie raggruppate per macro-area ──
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
                                {categorieConRisultati.map(c => {
                                    const count = conteggiPerCategoria[c.codice] ?? 0
                                    return (
                                        <button key={c.codice} onClick={() => apriCategoria(c)}
                                            className="bg-slate border border-white/5 p-4 text-left hover:border-oro/30 hover:bg-petrolio/60 transition-all group">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors truncate">{c.label}</p>
                                                    <p className="font-body text-xs text-nebbia/30 mt-0.5">{count.toLocaleString('it-IT')} sentenze</p>
                                                </div>
                                                <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro/60 transition-colors shrink-0" />
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    // ── VISTA CATEGORIA: risultati + filtri ──
    const annoCorrente = new Date().getFullYear()
    const anniOpzioni = Array.from({ length: 20 }, (_, i) => annoCorrente - i)

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <button onClick={tornaAlCatalogo} className="flex items-center gap-1.5 font-body text-xs text-nebbia/40 hover:text-oro transition-colors">
                    <ChevronLeft size={13} /> Tutte le categorie
                </button>
                <p className="font-display text-xl text-nebbia">
                    {categoriaSelezionata.label}
                    <span className="font-body text-sm text-nebbia/40 ml-2">({risultati.length.toLocaleString('it-IT')} risultati)</span>
                </p>
            </div>

            {/* Ricerca + Filtri */}
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

            {/* Risultati */}
            {loadingRisultati ? (
                <div className="flex items-center justify-center py-16">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : risultati.length === 0 ? (
                <div className="bg-slate border border-white/5 p-12 text-center">
                    <p className="font-body text-sm text-nebbia/40">Nessuna sentenza trovata con questi filtri</p>
                </div>
            ) : (
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
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// TAB PRASSI — atti amministrativi (Agenzia Entrate, Garante Privacy, ecc.)
// ═══════════════════════════════════════════════════════════════
function TabPrassi() {
    const navigate = useNavigate()

    // Dati base
    const [enti, setEnti] = useState([])
    const [conteggiPerEnte, setConteggiPerEnte] = useState({})
    const [loading, setLoading] = useState(true)

    // Navigazione
    const [vista, setVista] = useState('catalogo')  // 'catalogo' | 'ente'
    const [enteSelezionato, setEnteSelezionato] = useState(null)

    // Filtri vista ente
    const [ricerca, setRicerca] = useState('')
    const [ricercaAttiva, setRicercaAttiva] = useState('')
    const [filtroAnno, setFiltroAnno] = useState('')
    const [filtroCategoria, setFiltroCategoria] = useState('')

    // Risultati
    const [risultati, setRisultati] = useState([])
    const [loadingRisultati, setLoadingRisultati] = useState(false)

    // Mappa categorie per UI
    const [mappaCategorie, setMappaCategorie] = useState({})

    // ── CARICAMENTO INIZIALE ──
    useEffect(() => {
        async function caricaDatiBase() {
            setLoading(true)

            // 1. Lista enti dal master
            const { data: entiData } = await supabase
                .from('enti')
                .select('codice, label, descrizione, macro_area, ordine')
                .order('ordine')
            setEnti(entiData ?? [])

            // 2. Conteggi per ente (count delle prassi per fonte)
            const { data: prassiCounts } = await supabase
                .from('prassi')
                .select('fonte')
            const conteggi = {}
            for (const r of prassiCounts ?? []) {
                conteggi[r.fonte] = (conteggi[r.fonte] ?? 0) + 1
            }
            setConteggiPerEnte(conteggi)

            // 3. Mappa categorie per labels
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

    // ── CARICAMENTO PRASSI DELL'ENTE ──
    useEffect(() => {
        if (vista !== 'ente' || !enteSelezionato) return
        caricaPrassi()
    }, [vista, enteSelezionato, ricercaAttiva, filtroAnno, filtroCategoria])

    async function caricaPrassi() {
        setLoadingRisultati(true)

        let q = supabase
            .from('prassi')
            .select('id, fonte, numero, anno, data_pubblicazione, data_emanazione, oggetto, sintesi, categorie_lex')
            .eq('fonte', enteSelezionato.codice)
            .eq('vigente', true)

        if (filtroAnno) q = q.eq('anno', parseInt(filtroAnno))
        if (filtroCategoria) q = q.contains('categorie_lex', [filtroCategoria])
        if (ricercaAttiva.trim()) {
            q = q.or(`oggetto.ilike.%${ricercaAttiva}%,sintesi.ilike.%${ricercaAttiva}%`)
        }

        const { data } = await q
            .order('data_pubblicazione', { ascending: false, nullsFirst: false })
            .limit(100)

        setRisultati(data ?? [])
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

    // ── VISTA CATALOGO ──
    if (vista === 'catalogo') {
        if (loading) return (
            <div className="flex items-center justify-center py-20">
                <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
            </div>
        )

        // Filtra solo enti con count > 0 (nascondi quelli vuoti)
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
            <div className="space-y-3">
                <p className="font-body text-xs text-nebbia/40">
                    {entiVisibili.length} {entiVisibili.length === 1 ? 'ente disponibile' : 'enti disponibili'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {entiVisibili.map(e => {
                        const count = conteggiPerEnte[e.codice] ?? 0
                        return (
                            <button key={e.codice} onClick={() => apriEnte(e)}
                                className="bg-slate border border-white/5 p-4 text-left hover:border-oro/30 hover:bg-petrolio/60 transition-all group">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-body text-sm font-medium text-nebbia group-hover:text-oro transition-colors leading-snug">{e.label}</p>
                                        <p className="font-body text-xs text-nebbia/30 mt-1">{count.toLocaleString('it-IT')} prassi</p>
                                    </div>
                                    <ChevronRight size={14} className="text-nebbia/20 group-hover:text-oro/60 transition-colors shrink-0 mt-0.5" />
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    // ── VISTA ENTE ──
    const annoCorrente = new Date().getFullYear()
    const anniOpzioni = Array.from({ length: 25 }, (_, i) => annoCorrente - i)

    // Categorie effettivamente presenti nelle prassi caricate (filtro dinamico)
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
                <p className="font-body text-lg font-medium text-nebbia">
                    {enteSelezionato.label}
                    <span className="font-body text-sm text-nebbia/40 ml-2">({risultati.length.toLocaleString('it-IT')} risultati)</span>
                </p>
            </div>

            {/* Ricerca + filtri */}
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

            {/* Risultati */}
            {loadingRisultati ? (
                <div className="flex items-center justify-center py-16">
                    <span className="animate-spin w-6 h-6 border-2 border-oro border-t-transparent rounded-full" />
                </div>
            ) : risultati.length === 0 ? (
                <div className="bg-slate border border-white/5 p-12 text-center">
                    <p className="font-body text-sm text-nebbia/40">Nessuna prassi trovata con questi filtri</p>
                </div>
            ) : (
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
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// PANNELLO PRATICA (invariato)
// ═══════════════════════════════════════════════════════════════
function PannelloPratica({ praticaAttiva, setPraticaAttiva, onRicercaSalvata, refresh }) {
    const [cerca, setCerca] = useState('')
    const [suggerite, setSuggerite] = useState([])
    const [loading, setLoading] = useState(false)

    async function cercaPratiche(q) {
        setCerca(q)
        if (!q.trim()) { setSuggerite([]); return }
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data } = await supabase
                .from('pratiche')
                .select('id, titolo, cliente:cliente_id(nome, cognome)')
                .eq('avvocato_id', user.id)
                .eq('stato', 'aperta')
                .ilike('titolo', `%${q}%`)
                .limit(8)
            setSuggerite(data ?? [])
        } finally { setLoading(false) }
    }

    if (!praticaAttiva) return (
        <div className="p-4 space-y-4">
            <p className="section-label mb-2">Seleziona pratica</p>
            <p className="font-body text-xs text-nebbia/40 mb-3">Cerca e seleziona una pratica per salvare le ricerche.</p>
            <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-nebbia/30" />
                <input
                    placeholder="Cerca per nome pratica..."
                    value={cerca}
                    onChange={e => cercaPratiche(e.target.value)}
                    className="w-full bg-petrolio border border-white/10 text-nebbia font-body text-sm pl-8 pr-3 py-2.5 outline-none focus:border-oro/50 placeholder:text-nebbia/25"
                />
                {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-3 h-3 border-2 border-oro border-t-transparent rounded-full" />}
            </div>
            {suggerite.length > 0 && (
                <div className="bg-petrolio border border-white/10">
                    {suggerite.map(p => (
                        <button key={p.id}
                            onClick={() => { setPraticaAttiva(p); setCerca(''); setSuggerite([]) }}
                            className="w-full text-left px-3 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                            <p className="font-body text-sm text-nebbia">{p.titolo}</p>
                            {p.cliente && <p className="font-body text-xs text-nebbia/30 mt-0.5">{p.cliente.nome} {p.cliente.cognome}</p>}
                        </button>
                    ))}
                </div>
            )}
            {!loading && cerca && suggerite.length === 0 && (
                <p className="font-body text-xs text-nebbia/30 mt-2">Nessuna pratica trovata</p>
            )}
        </div>
    )

    return (
        <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-body text-xs text-oro uppercase tracking-widest mb-1">Pratica attiva</p>
                    <p className="font-display text-base text-nebbia">{praticaAttiva.titolo}</p>
                </div>
                <button onClick={() => setPraticaAttiva(null)} className="text-nebbia/30 hover:text-red-400 transition-colors shrink-0 mt-1">
                    <X size={14} />
                </button>
            </div>
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

    // Tab principale
    const [tabAttivo, setTabAttivo] = useState('italiana')

    // Pannello pratica
    const [pannelloAperto, setPannello] = useState(false)
    const [praticaAttiva, setPraticaAttiva] = useState(null)
    const [refreshPannello, setRefreshPannello] = useState(0)

    return (
        <div className="flex min-h-screen">

            {/* ── CONTENUTO PRINCIPALE ── */}
            <div className="flex-1 min-w-0 overflow-y-auto">
                <div className="space-y-5 p-6">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <PageHeader
                            label="Banca dati"
                            title="Codici, leggi, sentenze e prassi"
                            subtitle="Ricerca con Lex AI o sfoglia normativa italiana, europea, giurisprudenza e prassi amministrativa"
                        />
                        <div className="flex items-center gap-3">
                            {isAvvocato && (
                                <button
                                    onClick={() => setPannello(!pannelloAperto)}
                                    className="relative flex items-center gap-2 px-4 py-2.5 bg-slate border border-white/10 text-nebbia/60 font-body text-sm hover:text-nebbia hover:border-white/20 transition-colors"
                                >
                                    <FileText size={13} />
                                    <span className="hidden sm:inline">Seleziona una Pratica e allega Ricerca</span>
                                    {praticaAttiva && (
                                        <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-oro rounded-full" />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Lex — sempre attivo, cross-fonte */}
                    <RicercaAI
                        codice={null}
                        crediti={crediti}
                        setCrediti={setCrediti}
                        messaggi={messaggiConversazione}
                        onAggiornaMessaggi={setMessaggiConversazione}
                        praticaAttiva={praticaAttiva}
                        onRicercaSalvata={() => setRefreshPannello(p => p + 1)}
                    />

                    {/* ── Tab primario Italiana | UE | Sentenze ── */}
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

                        {/* Contenuto del tab */}
                        {tabAttivo === 'italiana' && (
                            <TabNormativa
                                datasetFonte="it"
                                key="it"
                                crediti={crediti}
                                setCrediti={setCrediti}
                                praticaAttiva={praticaAttiva}
                                refreshPannello={refreshPannello}
                                setRefreshPannello={setRefreshPannello}
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
                                praticaAttiva={praticaAttiva}
                                refreshPannello={refreshPannello}
                                setRefreshPannello={setRefreshPannello}
                                messaggiConversazione={messaggiConversazione}
                                setMessaggiConversazione={setMessaggiConversazione}
                            />
                        )}
                        {tabAttivo === 'sentenze' && (
                            <TabSentenze
                                praticaAttiva={praticaAttiva}
                                setRefreshPannello={setRefreshPannello}
                            />
                        )}
                        {tabAttivo === 'prassi' && (
                            <TabPrassi />
                        )}
                    </div>
                </div>
            </div>

            {/* ── PANNELLO PRATICA — solo avvocati ── */}
            {isAvvocato && pannelloAperto && (
                <>
                    <div className="hidden lg:flex flex-col w-[35%] max-w-md border-l border-white/5 bg-slate overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                            <p className="font-body text-sm font-medium text-nebbia">Pratica</p>
                            <button onClick={() => setPannello(false)} className="text-nebbia/30 hover:text-nebbia transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <PannelloPratica
                                praticaAttiva={praticaAttiva}
                                setPraticaAttiva={setPraticaAttiva}
                                onRicercaSalvata={() => setRefreshPannello(p => p + 1)}
                                refresh={refreshPannello}
                            />
                        </div>
                    </div>

                    <div className="lg:hidden fixed inset-0 z-50">
                        <div className="absolute inset-0 bg-black/60" onClick={() => setPannello(false)} />
                        <div className="absolute bottom-0 left-0 right-0 bg-slate border-t border-white/10 max-h-[70vh] flex flex-col">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                                <p className="font-body text-sm font-medium text-nebbia">Pratica</p>
                                <button onClick={() => setPannello(false)} className="text-nebbia/30 hover:text-nebbia transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <PannelloPratica
                                    praticaAttiva={praticaAttiva}
                                    setPraticaAttiva={setPraticaAttiva}
                                    onRicercaSalvata={() => setRefreshPannello(p => p + 1)}
                                    refresh={refreshPannello}
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}