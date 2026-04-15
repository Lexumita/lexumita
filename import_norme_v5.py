"""
Import Norme v5 Final — copertura 100% di tutti gli articoli nei JSON
Uso: python3 import_norme_v5.py
"""

import json, os, re, time, requests

# ============================================================
# CONFIGURAZIONE
# ============================================================
SUPABASE_URL = "https://wnbmyiyblpinayswunxb.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYm15aXlibHBpbmF5c3d1bnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTMxMDc4MiwiZXhwIjoyMDkwODg2NzgyfQ.qfi1SmBX7iAW2lChlwutj_5mSxYrJ30I5ESSI0HlDR0"
CARTELLA_JSON = os.path.expanduser("~/LEXUM norme/Codici_JSON_VIGENTE_2026-04-10")
# ============================================================

HEADERS_SUPABASE = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}


def pulisci(t):
    if not t: return ""
    t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


def parse_gerarchia(numNir):
    if not numNir: return None, None
    parts = numNir.split('*')
    libro = titolo = None
    for p in parts:
        p = p.strip('-* ').strip()
        if p.upper().startswith('LIBRO'): libro = p
        elif p.upper().startswith('TITOLO'): titolo = p
    return libro, titolo


def estrai_allegato_specifico(num_raw):
    """
    Estrae nome allegato specifico e numero articolo dal numNir dell'elemento.
    Es: "Allegato I.8 - art. 1" → ("Allegato I.8", "1")
    Es: "Codice penale militare di guerra - art. 119" → ("Codice penale militare di guerra", "119")
    Es: "Allegati - Allegato I.01 art. 1" → ("Allegato I.01", "1")
    """
    if not num_raw: return None, None
    # Rimuovi prefisso "Allegati - "
    nr = re.sub(r'^Allegati?\s*[-–]\s*', '', num_raw, flags=re.IGNORECASE).strip()
    # Trova numero articolo alla fine
    m = re.search(r'\bart(?:icolo)?\.\s*(\S+)\s*$', nr, re.IGNORECASE)
    if not m:
        m = re.search(r'\barticolo\s+(\d+\S*)\s*$', nr, re.IGNORECASE)
    if m:
        num_art = m.group(1).strip('.,;)(')
        nome = re.sub(r'\s*[-–]?\s*\bart(?:icolo)?\.\s*\S+\s*$', '', nr, flags=re.IGNORECASE).strip(' -–')
        return nome or None, num_art
    return None, None


def genera_key_annessi(num_raw, gruppo_tag_fallback):
    """Genera chiave unica per un allegato usando il nome specifico dal numNir."""
    nome_allegato, num_art = estrai_allegato_specifico(num_raw)
    if nome_allegato and num_art:
        tag = re.sub(r'[^a-zA-Z0-9]', '_', nome_allegato[:35]).strip('_')
        tag = re.sub(r'_+', '_', tag)
        return f"Art. {num_art} [{tag}]", nome_allegato
    num_clean = re.sub(r'^.*?\bart\.\s*', '', num_raw, flags=re.IGNORECASE).strip()
    if num_clean:
        tag = gruppo_tag_fallback or ''
        return (f"Art. {num_clean} [{tag}]" if tag else f"Art. {num_clean}"), None
    nf = pulisci(num_raw)[:120]
    return nf or None, None


def genera_key_unica_con_suffisso(base_key, existing_keys):
    """Se la chiave esiste già, aggiunge suffisso _v2, _v3 ecc."""
    if base_key not in existing_keys:
        return base_key
    i = 2
    while f"{base_key} [v{i}]" in existing_keys:
        i += 1
    return f"{base_key} [v{i}]"


def estrai_da_articolato(d):
    """Estrae articoli dall'articolato. Gestisce duplicati con suffisso _vN."""
    results = {}

    def scorri(node, libro=None, titolo=None):
        if isinstance(node, dict):
            nome = node.get('nomeNir') or ''
            rubrica = pulisci(node.get('rubricaNir') or '')
            num = str(node.get('numNir') or '').strip()
            testo = pulisci(node.get('testo') or '')

            if nome == 'libro': libro = rubrica or num
            elif nome == 'titolo': titolo = rubrica or num

            if nome == 'articolo' and num and testo:
                if not testo.startswith('((ARTICOLO ABROGATO'):
                    num_base = f"Art. {num}" if not num.upper().startswith('ART') else num
                    # Gestisci duplicati con suffisso
                    num_fmt = genera_key_unica_con_suffisso(num_base, results)
                    results[num_fmt] = {
                        'num': num_fmt,
                        'rubrica': rubrica,
                        'testo': testo,
                        'libro': libro,
                        'titolo': titolo,
                        'fonte': 'articolato',
                        'nome_allegato': None,
                        'tipo_elemento': 'articolo',
                    }

            sotto = node.get('elementi')
            if sotto: scorri(sotto, libro, titolo)
        elif isinstance(node, list):
            for item in node: scorri(item, libro, titolo)

    scorri(d.get('articolato', {}))
    return results


def estrai_da_annessi(d):
    """Estrae allegati dagli annessi. Usa chiave specifica per ogni allegato."""
    results = {}
    annessi = d.get('annessi', {})
    el_root = annessi.get('elementi', []) or []

    for gruppo in el_root:
        libro, titolo = parse_gerarchia(gruppo.get('numNir', '') or '')
        nome_gruppo_raw = gruppo.get('numNir', '') or ''
        parti = [p.strip('-* ').strip() for p in nome_gruppo_raw.split('*') if p.strip('-* ').strip()]
        nome_allegato_gruppo = parti[-1] if parti and parti[-1] != 'None' else None
        gruppo_tag = re.sub(r'[^a-zA-Z0-9]', '_', (nome_allegato_gruppo or '')[:30]).strip('_')

        for el in (gruppo.get('elementi', []) or []):
            if el.get('nomeNir') != 'allegato': continue
            num_raw = el.get('numNir', '') or ''
            rubrica = pulisci(el.get('rubricaNir', '') or '')
            testo = pulisci(el.get('testo', '') or '')
            if not testo: continue
            if testo.startswith('((ARTICOLO ABROGATO'): continue

            num_fmt, nome_allegato_specifico = genera_key_annessi(num_raw, gruppo_tag)
            if not num_fmt: continue

            # Gestisci duplicati interni agli annessi con suffisso
            num_fmt = genera_key_unica_con_suffisso(num_fmt, results)
            nome_allegato_finale = nome_allegato_specifico or nome_allegato_gruppo

            results[num_fmt] = {
                'num': num_fmt,
                'rubrica': rubrica,
                'testo': testo,
                'libro': libro,
                'titolo': titolo,
                'fonte': 'annessi',
                'nome_allegato': nome_allegato_finale,
                'tipo_elemento': 'allegato',
            }
    return results


def estrai_articoli(path_json, codice):
    with open(path_json, 'r', encoding='utf-8') as f:
        d = json.load(f)

    metadati = d.get('metadati', {})
    data_doc = metadati.get('dataDoc') or metadati.get('dataPubblicazione') or '1900-01-01'
    tipo_atto = metadati.get('tipoDoc', '')
    numero_atto = str(metadati.get('numDoc', ''))
    anno_str = data_doc[:4] if data_doc else '1900'
    urn = metadati.get('urn', '')

    articolato_raw = estrai_da_articolato(d)
    annessi_raw = estrai_da_annessi(d)

    # Combina: articolato prima, poi annessi
    # Gli annessi non sovrascrivono articolato — se c'è collisione aggiunge suffisso
    tutti = dict(articolato_raw)
    for k, v in annessi_raw.items():
        key = genera_key_unica_con_suffisso(k, tutti)
        tutti[key] = {**v, 'num': key}

    n_art = len(articolato_raw)
    n_ann = len(annessi_raw)
    fonte_info = f"art={n_art} ann={n_ann} tot={len(tutti)}"

    results = []
    for a in tutti.values():
        results.append({
            'codice': codice,
            'tipo_atto': tipo_atto,
            'numero_atto': numero_atto,
            'anno_atto': int(anno_str) if anno_str.isdigit() else None,
            'urn': urn,
            'libro': a['libro'],
            'titolo': a['titolo'],
            'articolo': a['num'],
            'rubrica': a['rubrica'] or None,
            'testo': a['testo'],
            'aggiornato_al': data_doc,
            'fonte': a['fonte'],
            'nome_allegato': a['nome_allegato'],
            'tipo_elemento': a['tipo_elemento'],
        })

    return results, fonte_info


def inserisci_batch(articoli, batch_size=200):
    url = f"{SUPABASE_URL}/rest/v1/norme"
    totale = 0
    for i in range(0, len(articoli), batch_size):
        batch = articoli[i:i + batch_size]
        r = requests.post(url, headers=HEADERS_SUPABASE, json=batch, timeout=30)
        if r.status_code in (200, 201):
            totale += len(batch)
            print(f"    ✓ {totale}/{len(articoli)}")
        else:
            print(f"    ✗ Errore batch {i}: {r.status_code} — {r.text[:200]}")
        time.sleep(0.2)
    return totale


def main():
    print("=" * 60)
    print("Import Norme v5 Final — copertura 100%")
    print("=" * 60)

    if not os.path.exists(CARTELLA_JSON):
        print(f"✗ Cartella non trovata: {CARTELLA_JSON}")
        return

    totale_globale = 0
    cartelle = sorted(os.listdir(CARTELLA_JSON))

    for nome_cartella in cartelle:
        if nome_cartella.startswith('.') or nome_cartella.startswith('__'): continue
        path_cartella = os.path.join(CARTELLA_JSON, nome_cartella)
        if not os.path.isdir(path_cartella): continue

        json_files = [f for f in os.listdir(path_cartella) if f.endswith('.json')]
        if not json_files: continue

        codice = json_files[0].replace('.json', '')
        path_json = os.path.join(path_cartella, json_files[0])

        print(f"\n📖 {codice.upper()}")

        try:
            articoli, fonte_info = estrai_articoli(path_json, codice)
            print(f"   Estratti: {len(articoli)} ({fonte_info})")
            if not articoli:
                print("   ⚠ Nessun articolo trovato, salto.")
                continue
            n = inserisci_batch(articoli)
            totale_globale += n
        except Exception as e:
            print(f"   ✗ Errore: {e}")
            import traceback; traceback.print_exc()

    print("\n" + "=" * 60)
    print(f"✅ Completato: {totale_globale} articoli totali caricati")
    print("=" * 60)


if __name__ == "__main__":
    main()
