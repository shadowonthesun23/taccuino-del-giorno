import type { DatiTaccuino } from '@/lib/types';

export function extractTranslatableText(d: DatiTaccuino): string[] {
  return [
    d.autore_giorno, d.breve_descrizione, d.citazione.testo, d.citazione.fonte,
    d.parola_giorno.parola, d.parola_giorno.etimologia, d.parola_giorno.definizione,
    d.parola_giorno.esempio, d.parola_giorno.nota,
    ...d.santi.flatMap((saint) => [saint.nome, saint.ruolo, saint.anni, saint.biografia]),
    d.bibbia.testo, d.bibbia.nota,
    d.poesia.testo, d.poesia.autore, d.poesia.fonte, d.poesia.nota,
    d.musica.brano, d.musica.autore, d.musica.genere, d.musica.motivo,
    ...d.avvenimenti,
  ];
}

export function rebuildTranslatedData(original: DatiTaccuino, translations: string[]): DatiTaccuino {
  let index = 9;
  const takeSaintField = () => translations[index++] ?? '';
  const saints = original.santi.map(() => ({
    nome: takeSaintField(), ruolo: takeSaintField(), anni: takeSaintField(), biografia: takeSaintField(),
  }));
  let contentIndex = 9 + original.santi.length * 4;
  const takeContentField = () => translations[contentIndex++] ?? '';
  return {
    ...original,
    autore_giorno: translations[0], breve_descrizione: translations[1],
    citazione: { ...original.citazione, testo: translations[2], fonte: translations[3] },
    parola_giorno: { ...original.parola_giorno, parola: translations[4], etimologia: translations[5], definizione: translations[6], esempio: translations[7] && translations[7] !== 'null' ? translations[7] : '', nota: translations[8] },
    santi: saints,
    bibbia: { ...original.bibbia, testo: takeContentField(), nota: takeContentField() },
    poesia: { ...original.poesia, testo: takeContentField(), autore: takeContentField(), fonte: takeContentField(), nota: takeContentField() },
    musica: { ...original.musica, brano: takeContentField(), autore: takeContentField(), genere: takeContentField(), motivo: takeContentField() },
    avvenimenti: translations.slice(contentIndex),
  };
}
