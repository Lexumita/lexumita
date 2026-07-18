// src/lib/parametriForensi/tabelle.js
//
// VALORI NUMERICI dei parametri forensi (DM 55/2014, tabelle 2022 vigenti
// agg. DM 147/2022). File isolato dalla logica: è la parte da VALIDARE contro
// l'allegato ufficiale (Gazzetta Ufficiale, DM 147/2022 in G.U. 236/2022).
//
// Trascritto con doppia verifica indipendente (recommendation "use",
// confidenza high su tutte le tabelle). La cella Tribunale €5.201–26.000
// combacia esattamente con la calcolatrice ufficiale (screenshot).
//
// Forma:
//  - scaglione (civile/amm/tributario): { scaglioni: { <scaglioneId>: {studio,introduttiva,istruttoria,decisionale} } }  (solo i 6 tabulati fino a 520k)
//  - penale: { tipo:'penale', valoriMedi: {studio,introduttiva,istruttoria,decisionale} }
//  - stragiudiziale: { tipo:'stragiudiziale', scaglioni: { <scaglioneId>: {compenso} } }
//
// NON caricate (struttura "fase unica" anomala, da gestire a parte):
// procedimenti_monitori, volontaria_giurisdizione.

export const TABELLE = {
  '2022': {
    tribunale_ordinario: {
      scaglioni: {
        fino_1100: {
          studio: 131,
          introduttiva: 131,
          istruttoria: 200,
          decisionale: 200
        },
        da_1101_5200: {
          studio: 425,
          introduttiva: 425,
          istruttoria: 851,
          decisionale: 851
        },
        da_5201_26000: {
          studio: 919,
          introduttiva: 777,
          istruttoria: 1680,
          decisionale: 1701
        },
        da_26001_52000: {
          studio: 1701,
          introduttiva: 1204,
          istruttoria: 1806,
          decisionale: 2905
        },
        da_52001_260000: {
          studio: 2552,
          introduttiva: 1628,
          istruttoria: 5670,
          decisionale: 4253
        },
        da_260001_520000: {
          studio: 3544,
          introduttiva: 2338,
          istruttoria: 10411,
          decisionale: 6164
        }
      }
    },
    giudice_di_pace: {
      scaglioni: {
        fino_1100: {
          studio: 68,
          introduttiva: 68,
          istruttoria: 68,
          decisionale: 142
        },
        da_1101_5200: {
          studio: 236,
          introduttiva: 252,
          istruttoria: 352,
          decisionale: 425
        },
        da_5201_26000: {
          studio: 425,
          introduttiva: 352,
          istruttoria: 567,
          decisionale: 746
        }
      }
    },
    corte_appello: {
      scaglioni: {
        fino_1100: {
          studio: 142,
          introduttiva: 142,
          istruttoria: 179,
          decisionale: 210
        },
        da_1101_5200: {
          studio: 536,
          introduttiva: 536,
          istruttoria: 992,
          decisionale: 851
        },
        da_5201_26000: {
          studio: 1134,
          introduttiva: 921,
          istruttoria: 1843,
          decisionale: 1911
        },
        da_26001_52000: {
          studio: 2058,
          introduttiva: 1418,
          istruttoria: 3045,
          decisionale: 3470
        },
        da_52001_260000: {
          studio: 2977,
          introduttiva: 1911,
          istruttoria: 4326,
          decisionale: 5103
        },
        da_260001_520000: {
          studio: 4389,
          introduttiva: 2552,
          istruttoria: 5880,
          decisionale: 7298
        }
      }
    },
    cassazione: {
      scaglioni: {
        fino_1100: {
          studio: 252,
          introduttiva: 284,
          decisionale: 142
        },
        da_1101_5200: {
          studio: 709,
          introduttiva: 777,
          decisionale: 389
        },
        da_5201_26000: {
          studio: 1276,
          introduttiva: 1134,
          decisionale: 672
        },
        da_26001_52000: {
          studio: 2336,
          introduttiva: 1969,
          decisionale: 1208
        },
        da_52001_260000: {
          studio: 3402,
          introduttiva: 2478,
          decisionale: 1775
        },
        da_260001_520000: {
          studio: 4961,
          introduttiva: 3260,
          decisionale: 2552
        }
      }
    },
    lavoro: {
      scaglioni: {
        fino_1100: {
          studio: 210,
          introduttiva: 126,
          istruttoria: 126,
          decisionale: 179
        },
        da_1101_5200: {
          studio: 888,
          introduttiva: 425,
          istruttoria: 567,
          decisionale: 746
        },
        da_5201_26000: {
          studio: 1822,
          introduttiva: 777,
          istruttoria: 1172,
          decisionale: 1617
        },
        da_26001_52000: {
          studio: 3245,
          introduttiva: 1202,
          istruttoria: 1880,
          decisionale: 2930
        },
        da_52001_260000: {
          studio: 4763,
          introduttiva: 1701,
          istruttoria: 2678,
          decisionale: 4253
        },
        da_260001_520000: {
          studio: 6668,
          introduttiva: 2336,
          istruttoria: 3623,
          decisionale: 6290
        }
      }
    },
    procedimenti_cautelari: {
      scaglioni: {
        fino_1100: {
          studio: 210,
          introduttiva: 142,
          istruttoria: 210,
          decisionale: 105
        },
        da_1101_5200: {
          studio: 567,
          introduttiva: 352,
          istruttoria: 851,
          decisionale: 389
        },
        da_5201_26000: {
          studio: 992,
          introduttiva: 672,
          istruttoria: 1204,
          decisionale: 635
        },
        da_26001_52000: {
          studio: 1175,
          introduttiva: 851,
          istruttoria: 1985,
          decisionale: 1202
        },
        da_52001_260000: {
          studio: 2251,
          introduttiva: 1202,
          istruttoria: 2835,
          decisionale: 1771
        },
        da_260001_520000: {
          studio: 3686,
          introduttiva: 1559,
          istruttoria: 3969,
          decisionale: 2552
        }
      }
    },
    sfratti: {
      scaglioni: {
        fino_1100: {
          studio: 179,
          introduttiva: 179,
          istruttoria: 42,
          decisionale: 142
        },
        da_1101_5200: {
          studio: 530,
          introduttiva: 494,
          istruttoria: 142,
          decisionale: 425
        },
        da_5201_26000: {
          studio: 919,
          introduttiva: 709,
          istruttoria: 210,
          decisionale: 746
        },
        da_26001_52000: {
          studio: 1701,
          introduttiva: 1061,
          istruttoria: 352,
          decisionale: 1344
        },
        da_52001_260000: {
          studio: 2478,
          introduttiva: 1418,
          istruttoria: 494,
          decisionale: 1911
        },
        da_260001_520000: {
          studio: 3544,
          introduttiva: 1559,
          istruttoria: 709,
          decisionale: 2835
        }
      }
    },
    esecuzioni: {
      scaglioni: {
        fino_1100: {
          studio: 126,
          istruttoria: 63
        },
        da_1101_5200: {
          studio: 368,
          istruttoria: 184
        },
        da_5201_26000: {
          studio: 552,
          istruttoria: 305
        },
        da_26001_52000: {
          studio: 861,
          istruttoria: 494
        },
        da_52001_260000: {
          studio: 1166,
          istruttoria: 735
        },
        da_260001_520000: {
          studio: 1533,
          istruttoria: 982
        }
      }
    },
    tar: {
      scaglioni: {
        fino_1100: {
          studio: 179,
          introduttiva: 214,
          istruttoria: 105,
          decisionale: 284
        },
        da_1101_5200: {
          studio: 635,
          introduttiva: 680,
          istruttoria: 635,
          decisionale: 1061
        },
        da_5201_26000: {
          studio: 1134,
          introduttiva: 1103,
          istruttoria: 992,
          decisionale: 1911
        },
        da_26001_52000: {
          studio: 2053,
          introduttiva: 1701,
          istruttoria: 1628,
          decisionale: 3470
        },
        da_52001_260000: {
          studio: 3402,
          introduttiva: 2293,
          istruttoria: 2268,
          decisionale: 5030
        },
        da_260001_520000: {
          studio: 4394,
          introduttiva: 3062,
          istruttoria: 3119,
          decisionale: 7298
        }
      }
    },
    consiglio_di_stato: {
      scaglioni: {
        fino_1100: {
          studio: 179,
          introduttiva: 126,
          istruttoria: 105,
          decisionale: 284
        },
        da_1101_5200: {
          studio: 635,
          introduttiva: 428,
          istruttoria: 357,
          decisionale: 1061
        },
        da_5201_26000: {
          studio: 1276,
          introduttiva: 851,
          istruttoria: 709,
          decisionale: 1911
        },
        da_26001_52000: {
          studio: 2268,
          introduttiva: 1273,
          istruttoria: 1061,
          decisionale: 3470
        },
        da_52001_260000: {
          studio: 3402,
          introduttiva: 1871,
          istruttoria: 1559,
          decisionale: 5030
        },
        da_260001_520000: {
          studio: 4961,
          introduttiva: 2552,
          istruttoria: 2126,
          decisionale: 7298
        }
      }
    },
    cgt_primo_grado: {
      scaglioni: {
        fino_1100: {
          studio: 179,
          introduttiva: 105,
          istruttoria: 89,
          decisionale: 179
        },
        da_1101_5200: {
          studio: 567,
          introduttiva: 357,
          istruttoria: 284,
          decisionale: 919
        },
        da_5201_26000: {
          studio: 992,
          introduttiva: 567,
          istruttoria: 494,
          decisionale: 1418
        },
        da_26001_52000: {
          studio: 1769,
          introduttiva: 851,
          istruttoria: 992,
          decisionale: 2195
        },
        da_52001_260000: {
          studio: 2552,
          introduttiva: 1202,
          istruttoria: 1418,
          decisionale: 4169
        },
        da_260001_520000: {
          studio: 3686,
          introduttiva: 1559,
          istruttoria: 2053,
          decisionale: 4321
        }
      }
    },
    cgt_secondo_grado: {
      scaglioni: {
        fino_1100: {
          studio: 179,
          introduttiva: 105,
          istruttoria: 105,
          decisionale: 179
        },
        da_1101_5200: {
          studio: 635,
          introduttiva: 425,
          istruttoria: 425,
          decisionale: 919
        },
        da_5201_26000: {
          studio: 1134,
          introduttiva: 635,
          istruttoria: 777,
          decisionale: 1418
        },
        da_26001_52000: {
          studio: 2053,
          introduttiva: 1061,
          istruttoria: 1418,
          decisionale: 2478
        },
        da_52001_260000: {
          studio: 3045,
          introduttiva: 1418,
          istruttoria: 2053,
          decisionale: 3260
        },
        da_260001_520000: {
          studio: 4394,
          introduttiva: 1911,
          istruttoria: 3045,
          decisionale: 4536
        }
      }
    },
    penale_giudice_di_pace: {
      tipo: "penale",
      valoriMedi: {
        studio: 378,
        introduttiva: 473,
        istruttoria: 756,
        decisionale: 662
      }
    },
    penale_indagini_preliminari: {
      tipo: "penale",
      valoriMedi: {
        studio: 851,
        introduttiva: 662,
        istruttoria: 1040,
        decisionale: 1229
      }
    },
    penale_indagini_difensive: {
      tipo: "penale",
      valoriMedi: {
        studio: 851,
        istruttoria: 1418
      }
    },
    penale_convalida_arresto: {
      tipo: "penale",
      valoriMedi: {
        studio: 378,
        istruttoria: 473,
        decisionale: 709
      }
    },
    penale_cautelari_personali: {
      tipo: "penale",
      valoriMedi: {
        studio: 378,
        introduttiva: 1229,
        decisionale: 1418
      }
    },
    penale_cautelari_reali: {
      tipo: "penale",
      valoriMedi: {
        studio: 378,
        introduttiva: 1229,
        decisionale: 1418
      }
    },
    penale_gip_gup: {
      tipo: "penale",
      valoriMedi: {
        studio: 851,
        introduttiva: 756,
        istruttoria: 1040,
        decisionale: 1418
      }
    },
    penale_tribunale_mono: {
      tipo: "penale",
      valoriMedi: {
        studio: 473,
        introduttiva: 567,
        istruttoria: 1134,
        decisionale: 1418
      }
    },
    penale_tribunale_coll: {
      tipo: "penale",
      valoriMedi: {
        studio: 473,
        introduttiva: 756,
        istruttoria: 1418,
        decisionale: 1418
      }
    },
    penale_corte_assise: {
      tipo: "penale",
      valoriMedi: {
        studio: 756,
        introduttiva: 1418,
        istruttoria: 2363,
        decisionale: 2835
      }
    },
    penale_sorveglianza_trib: {
      tipo: "penale",
      valoriMedi: {
        studio: 473,
        introduttiva: 945,
        istruttoria: 1418,
        decisionale: 1418
      }
    },
    penale_sorveglianza_mag: {
      tipo: "penale",
      valoriMedi: {
        studio: 315,
        introduttiva: 378,
        decisionale: 945
      }
    },
    penale_appello: {
      tipo: "penale",
      valoriMedi: {
        studio: 473,
        introduttiva: 945,
        istruttoria: 1418,
        decisionale: 1418
      }
    },
    penale_assise_appello: {
      tipo: "penale",
      valoriMedi: {
        studio: 756,
        introduttiva: 1985,
        istruttoria: 2268,
        decisionale: 2336
      }
    },
    penale_cassazione: {
      tipo: "penale",
      valoriMedi: {
        studio: 945,
        introduttiva: 2646,
        decisionale: 2741
      }
    },
    stragiudiziale: {
      tipo: "stragiudiziale",
      scaglioni: {
        fino_1100: {
          compenso: 284
        },
        da_1101_5200: {
          compenso: 1276
        },
        da_5201_26000: {
          compenso: 1985
        },
        da_26001_52000: {
          compenso: 2410
        },
        da_52001_260000: {
          compenso: 4536
        },
        da_260001_520000: {
          compenso: 6164
        }
      }
    }
  },
}

export const TABELLE_META = {
  '2022': {
    tribunale_ordinario: {
      confidenza: "high",
      fonte: "Verificato contro la fonte primaria: Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 dell'8-10-2022 (DM 13 agosto 2022 n. 147, che modifica ",
      validataGU: false,
      note: "Cella €5.201–26.000 verificata contro la calcolatrice ufficiale."
    },
    giudice_di_pace: {
      confidenza: "high",
      fonte: "Verificato cell-by-cell contro il testo coordinato ufficiale del DM 10 marzo 2014 n. 55 come modificato dal DM 13 agosto 2022 n. 147, pubblicato dall'Ordine deg",
      validataGU: false
    },
    corte_appello: {
      confidenza: "high",
      fonte: "DM 55/2014 come modificato dal DM 147/2022 (in vigore dal 23/10/2022), Tabella XII \"Giudizi innanzi alla Corte d'Appello\". Verificato in modo indipendente su tr",
      validataGU: false
    },
    cassazione: {
      confidenza: "high",
      fonte: "DM 55/2014, Tabella 13 (Corte di Cassazione – giudizi civili / magistrature superiori), come modificato dal DM 147/2022 (in vigore dal 23/10/2022). Valori medi ",
      validataGU: false
    },
    lavoro: {
      confidenza: "high",
      fonte: "Fonte primaria: testo ufficiale del D.M. 13 agosto 2022 n. 147 (Ministero della Giustizia), Tabella «3. CAUSE DI LAVORO», riprodotto dal PDF del decreto pubblic",
      validataGU: false
    },
    procedimenti_cautelari: {
      confidenza: "high",
      fonte: "DM 55/2014 come modificato dal DM 13 agosto 2022 n. 147, tabella 10 «Procedimenti cautelari». Verificato indipendentemente sul testo coordinato ufficiale pubbli",
      validataGU: false
    },
    sfratti: {
      confidenza: "high",
      fonte: "DM 55/2014 come modificato dal DM 147/2022 (parametri forensi 2022 vigenti dal 23/10/2022), Tabella \"Procedimenti per convalida di sfratto/licenza (locatizia)\".",
      validataGU: false
    },
    esecuzioni: {
      confidenza: "high",
      fonte: "VERIFICATO sul testo ufficiale: Gazzetta Ufficiale Serie generale n. 236 dell'8-10-2022, «Allegato: Nuove tabelle parametri forensi» (DM 13 agosto 2022 n. 147, ",
      validataGU: false
    },
    tar: {
      confidenza: "high",
      fonte: "Fonte primaria: allegato al DM Giustizia 13 agosto 2022 n. 147 (modifica del DM 55/2014), Gazzetta Ufficiale Serie Generale n. 236 dell'8 ottobre 2022, Tabella ",
      validataGU: false
    },
    consiglio_di_stato: {
      confidenza: "high",
      fonte: "DM 55/2014, Tabella 22 \"Giudizi innanzi al Consiglio di Stato\", testo coordinato con le modifiche del DM 13 agosto 2022 n. 147 (GU n. 236 dell'8 ottobre 2022, i",
      validataGU: false
    },
    cgt_primo_grado: {
      confidenza: "high",
      fonte: "DM 55/2014, Tab. 23 \"Giudizi innanzi alla Commissione tributaria provinciale\" (oggi Corte di Giustizia Tributaria di primo grado), come modificata dal DM 147/20",
      validataGU: false
    },
    cgt_secondo_grado: {
      confidenza: "high",
      fonte: "Re-sourced independently (NOT from the draft's Ordine Avvocati Milano / avvocatoandreani sources) against two reputable reproductions of Tab. XXIV «Giudizi inna",
      validataGU: false
    },
    penale_giudice_di_pace: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_indagini_preliminari: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_indagini_difensive: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_convalida_arresto: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_cautelari_personali: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_cautelari_reali: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_gip_gup: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_tribunale_mono: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_tribunale_coll: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_corte_assise: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_sorveglianza_trib: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_sorveglianza_mag: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_appello: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_assise_appello: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    penale_cassazione: {
      confidenza: "high",
      fonte: "Gazzetta Ufficiale della Repubblica Italiana, Serie Generale n. 236 del 8-10-2022 — Allegato \"Nuove tabelle parametri forensi\" al D.M. 13 agosto 2022 n. 147 (mo",
      validataGU: false
    },
    stragiudiziale: {
      confidenza: "high",
      fonte: "Allegato al DM 55/2014 come modificato dal DM 147/2022 (Gazzetta Ufficiale n. 236 dell'08/10/2022, in vigore dal 23/10/2022), Tabella 25 \"Prestazioni di assiste",
      validataGU: false
    }
  },
}

export function hasDati(competenzaKey, versione = '2022') {
  const t = TABELLE[versione]?.[competenzaKey]
  if (!t) return false
  if (t.tipo === 'penale') return !!t.valoriMedi && Object.keys(t.valoriMedi).length > 0
  return !!t.scaglioni && Object.keys(t.scaglioni).length > 0
}

export function metaTabella(competenzaKey, versione = '2022') {
  return TABELLE_META[versione]?.[competenzaKey] ?? null
}
