// Il guscio delle pagine della vetrina: lo stesso nel sito e nel testo già pronto dentro l'HTML
// (src/seo/entry-seo.jsx).
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CambioPagina from '@/components/CambioPagina'

export default function GuscioVetrina({ children, coda = null }) {
    return (
        <div className="min-h-screen flex flex-col bg-petrolio">
            <Navbar />
            {/* La barra in alto resta ferma: entra piano solo il resto della pagina */}
            <CambioPagina className="flex-1 flex flex-col">
                <main className="flex-1">{children}</main>
                <Footer />
            </CambioPagina>
            {coda}
        </div>
    )
}
