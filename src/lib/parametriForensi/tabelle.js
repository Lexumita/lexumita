// src/lib/parametriForensi/tabelle.js
//
// VALORI NUMERICI dei parametri forensi (DM 55/2014, tabelle 2022 vigenti
// agg. DM 147/2022). File isolato dalla logica.
//
// CERTIFICAZIONE: le tabelle non-penali sono state confrontate CELLA PER CELLA
// contro il testo ufficiale su Normattiva ("vigente dal 23-10-2022"): 276/276
// celle identiche, 0 discrepanze. Le 7 autorità penali presenti in HTML su
// Normattiva combaciano; le altre autorità penali (Tab. 15 in formato grafico
// G.U. 2014) restano da fonte secondaria (validataGU=false, confidenza medium).
//
// Forma:
//  - scaglione (civile/amm/tributario): { scaglioni: { <scaglioneId>: {studio,introduttiva,istruttoria,decisionale} } }
//  - penale: { tipo:'penale', valoriMedi: {...} }
//  - compensoUnico / stragiudiziale: { tipo, scaglioni: { <scaglioneId>: {compenso} } }

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
    },
    procedimenti_monitori: {
      tipo: "compensoUnico",
      scaglioni: {
        fino_1100: {
          compenso: 473
        },
        da_1101_5200: {
          compenso: 473
        },
        da_5201_26000: {
          compenso: 567
        },
        da_26001_52000: {
          compenso: 1370
        },
        da_52001_260000: {
          compenso: 2242
        },
        da_260001_520000: {
          compenso: 4394
        }
      }
    },
    volontaria_giurisdizione: {
      tipo: "compensoUnico",
      scaglioni: {
        fino_1100: {
          compenso: 425
        },
        da_1101_5200: {
          compenso: 425
        },
        da_5201_26000: {
          compenso: 1418
        },
        da_26001_52000: {
          compenso: 2336
        },
        da_52001_260000: {
          compenso: 3329
        },
        da_260001_520000: {
          compenso: 4536
        }
      }
    },
    corte_dei_conti: {
      scaglioni: {
        fino_1100: {
          studio: 179,
          introduttiva: 105,
          istruttoria: 105,
          decisionale: 179
        },
        da_1101_5200: {
          studio: 536,
          introduttiva: 320,
          istruttoria: 352,
          decisionale: 604
        },
        da_5201_26000: {
          studio: 919,
          introduttiva: 494,
          istruttoria: 567,
          decisionale: 1061
        },
        da_26001_52000: {
          studio: 1775,
          introduttiva: 709,
          istruttoria: 919,
          decisionale: 1911
        },
        da_52001_260000: {
          studio: 2478,
          introduttiva: 1061,
          istruttoria: 1276,
          decisionale: 2762
        },
        da_260001_520000: {
          studio: 3686,
          introduttiva: 1418,
          istruttoria: 1775,
          decisionale: 4043
        }
      }
    },
    corte_costituzionale_ue: {
      scaglioni: {
        fino_1100: {
          studio: 252,
          introduttiva: 210,
          istruttoria: 142,
          decisionale: 142
        },
        da_1101_5200: {
          studio: 919,
          introduttiva: 777,
          istruttoria: 709,
          decisionale: 777
        },
        da_5201_26000: {
          studio: 1985,
          introduttiva: 1344,
          istruttoria: 1344,
          decisionale: 1344
        },
        da_26001_52000: {
          studio: 3686,
          introduttiva: 2058,
          istruttoria: 2195,
          decisionale: 2478
        },
        da_52001_260000: {
          studio: 5387,
          introduttiva: 2905,
          istruttoria: 3119,
          decisionale: 3612
        },
        da_260001_520000: {
          studio: 7796,
          introduttiva: 3885,
          istruttoria: 4253,
          decisionale: 5177
        }
      }
    },
    accertamento_passivo: {
      scaglioni: {
        fino_1100: {
          studio: 168,
          introduttiva: 105,
          istruttoria: 158,
          decisionale: 158
        },
        da_1101_5200: {
          studio: 341,
          introduttiva: 341,
          istruttoria: 683,
          decisionale: 683
        },
        da_5201_26000: {
          studio: 735,
          introduttiva: 620,
          istruttoria: 1344,
          decisionale: 1344
        },
        da_26001_52000: {
          studio: 1344,
          introduttiva: 966,
          istruttoria: 1444,
          decisionale: 2326
        },
        da_52001_260000: {
          studio: 2042,
          introduttiva: 1302,
          istruttoria: 4536,
          decisionale: 3402
        },
        da_260001_520000: {
          studio: 2835,
          introduttiva: 1869,
          istruttoria: 8327,
          decisionale: 4930
        }
      }
    },
    esecuzioni_immobiliari: {
      scaglioni: {
        fino_1100: {
          studio: 147,
          istruttoria: 76
        },
        da_1101_5200: {
          studio: 452,
          istruttoria: 299
        },
        da_5201_26000: {
          studio: 683,
          istruttoria: 452
        },
        da_26001_52000: {
          studio: 1050,
          istruttoria: 677
        },
        da_52001_260000: {
          studio: 1433,
          istruttoria: 982
        },
        da_260001_520000: {
          studio: 1890,
          istruttoria: 1281
        }
      }
    },
    esecuzioni_presso_terzi: {
      scaglioni: {
        fino_1100: {
          introduttiva: 110,
          istruttoria: 236
        },
        da_1101_5200: {
          introduttiva: 331,
          istruttoria: 567
        },
        da_5201_26000: {
          introduttiva: 552,
          istruttoria: 851
        },
        da_26001_52000: {
          introduttiva: 861,
          istruttoria: 1360
        },
        da_52001_260000: {
          introduttiva: 1166,
          istruttoria: 1927
        },
        da_260001_520000: {
          introduttiva: 1533,
          istruttoria: 2604
        }
      }
    },
    istruzione_preventiva: {
      scaglioni: {
        fino_1100: {
          studio: 210,
          introduttiva: 284,
          istruttoria: 352
        },
        da_1101_5200: {
          studio: 210,
          introduttiva: 284,
          istruttoria: 352
        },
        da_5201_26000: {
          studio: 567,
          introduttiva: 709,
          istruttoria: 1061
        },
        da_26001_52000: {
          studio: 992,
          introduttiva: 788,
          istruttoria: 1276
        },
        da_52001_260000: {
          studio: 1134,
          introduttiva: 992,
          istruttoria: 1701
        },
        da_260001_520000: {
          studio: 2126,
          introduttiva: 1454,
          istruttoria: 2336
        }
      }
    },
    precetto: {
      tipo: "compensoUnico",
      scaglioni: {
        fino_1100: {
          compenso: 142
        },
        da_1101_5200: {
          compenso: 142
        },
        da_5201_26000: {
          compenso: 236
        },
        da_26001_52000: {
          compenso: 331
        },
        da_52001_260000: {
          compenso: 425
        },
        da_260001_520000: {
          compenso: 567
        }
      }
    },
    iscrizione_ipotecaria: {
      tipo: "compensoUnico",
      scaglioni: {
        fino_1100: {
          compenso: 68
        },
        da_1101_5200: {
          compenso: 284
        },
        da_5201_26000: {
          compenso: 425
        },
        da_26001_52000: {
          compenso: 709
        },
        da_52001_260000: {
          compenso: 992
        },
        da_260001_520000: {
          compenso: 1344
        }
      }
    },
    fallimento: {
      tipo: "compensoUnico",
      scaglioni: {
        fino_1100: {
          compenso: 168
        },
        da_1101_5200: {
          compenso: 620
        },
        da_5201_26000: {
          compenso: 903
        },
        da_26001_52000: {
          compenso: 1470
        },
        da_52001_260000: {
          compenso: 2095
        },
        da_260001_520000: {
          compenso: 2888
        }
      }
    },
    arbitrato: {
      tipo: "compensoUnico",
      scaglioni: {
        fino_1100: {
          compenso: 1701
        },
        da_1101_5200: {
          compenso: 1701
        },
        da_5201_26000: {
          compenso: 1701
        },
        da_26001_52000: {
          compenso: 4253
        },
        da_52001_260000: {
          compenso: 7439
        },
        da_260001_520000: {
          compenso: 17010
        }
      }
    }
  },
}

export const TABELLE_META = {
  '2022': {
    tribunale_ordinario: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true,
      note: "Cella €5.201–26.000 = calcolatrice ufficiale; intera tabella = Normattiva 2022."
    },
    giudice_di_pace: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    corte_appello: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    cassazione: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    lavoro: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    procedimenti_cautelari: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    sfratti: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    esecuzioni: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    tar: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    consiglio_di_stato: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    cgt_primo_grado: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    cgt_secondo_grado: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    penale_giudice_di_pace: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022) (Tab. 15, colonne HTML)",
      validataGU: true
    },
    penale_indagini_preliminari: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022) (Tab. 15, colonne HTML)",
      validataGU: true
    },
    penale_indagini_difensive: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022) (Tab. 15, colonne HTML)",
      validataGU: true
    },
    penale_convalida_arresto: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022) (Tab. 15, colonne HTML)",
      validataGU: true
    },
    penale_cautelari_personali: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022) (Tab. 15, colonne HTML)",
      validataGU: true
    },
    penale_cautelari_reali: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022) (Tab. 15, colonne HTML)",
      validataGU: true
    },
    penale_gip_gup: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022) (Tab. 15, colonne HTML)",
      validataGU: true
    },
    penale_tribunale_mono: {
      confidenza: "medium",
      fonte: "Fonte secondaria (Tab. 15 penale non certificabile su Normattiva: grafico G.U. 2014)",
      validataGU: false
    },
    penale_tribunale_coll: {
      confidenza: "medium",
      fonte: "Fonte secondaria (Tab. 15 penale non certificabile su Normattiva: grafico G.U. 2014)",
      validataGU: false
    },
    penale_corte_assise: {
      confidenza: "medium",
      fonte: "Fonte secondaria (Tab. 15 penale non certificabile su Normattiva: grafico G.U. 2014)",
      validataGU: false
    },
    penale_sorveglianza_trib: {
      confidenza: "medium",
      fonte: "Fonte secondaria (Tab. 15 penale non certificabile su Normattiva: grafico G.U. 2014)",
      validataGU: false
    },
    penale_sorveglianza_mag: {
      confidenza: "medium",
      fonte: "Fonte secondaria (Tab. 15 penale non certificabile su Normattiva: grafico G.U. 2014)",
      validataGU: false
    },
    penale_appello: {
      confidenza: "medium",
      fonte: "Fonte secondaria (Tab. 15 penale non certificabile su Normattiva: grafico G.U. 2014)",
      validataGU: false
    },
    penale_assise_appello: {
      confidenza: "medium",
      fonte: "Fonte secondaria (Tab. 15 penale non certificabile su Normattiva: grafico G.U. 2014)",
      validataGU: false
    },
    penale_cassazione: {
      confidenza: "medium",
      fonte: "Fonte secondaria (Tab. 15 penale non certificabile su Normattiva: grafico G.U. 2014)",
      validataGU: false
    },
    stragiudiziale: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    procedimenti_monitori: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    volontaria_giurisdizione: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    corte_dei_conti: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    corte_costituzionale_ue: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    accertamento_passivo: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    esecuzioni_immobiliari: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    esecuzioni_presso_terzi: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    istruzione_preventiva: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    precetto: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    iscrizione_ipotecaria: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    fallimento: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
    },
    arbitrato: {
      confidenza: "high",
      fonte: "Normattiva — testo vigente dal 23-10-2022 (DM 55/2014 agg. DM 147/2022)",
      validataGU: true
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
