// Il guscio delle pagine della vetrina: lo stesso nel sito e nel testo già pronto dentro l'HTML
// (src/seo/entry-seo.jsx).
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function GuscioVetrina({ children, coda = null }) {
    return (
        <div className="min-h-screen flex flex-col bg-petrolio">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            {coda}
        </div>
    )
}
