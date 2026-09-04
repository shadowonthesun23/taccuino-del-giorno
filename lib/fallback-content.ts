import type { DatiTaccuino } from './types';

const FALLBACK_CONTENT: DatiTaccuino = {
  data: '2026-09-05',
  data_odierna: '5 settembre',
  autore_giorno: 'Tommaso Campanella',
  breve_descrizione: 'Nato in questo giorno nel 1568, filosofo, poeta e frate domenicano calabrese, Campanella cercò per tutta la vita una forma più vasta e ordinata del sapere: dalla natura alla città, dalla teologia alla poesia.',
  citazione: {
    testo: 'Il mondo è un animal grande e perfetto,\nstatua di Dio, che Dio lauda e simiglia.',
    autore: 'Tommaso Campanella',
    fonte: '“Del mondo e sue parti”, 1622, in Poesie',
  },
  avvenimenti: [
    '1882: A New York si celebra la prima festa del Labor Day, organizzata dalla Central Labor Union.',
    '1905: A Portsmouth viene firmato il trattato che pone fine alla guerra russo-giapponese, con la mediazione del presidente statunitense Theodore Roosevelt.',
    '1914: Il generale Joseph Joffre redige l’ordine del giorno che prepara la controffensiva della Prima battaglia della Marna.',
    '1977: Da Cape Canaveral parte Voyager 1, destinata a esplorare Giove e Saturno e poi a spingersi oltre i confini dell’eliosfera.',
    '1997: Muore a Calcutta Teresa di Calcutta, la religiosa che aveva fondato le Missionarie della Carità.',
  ],
  parola_giorno: {
    parola: 'Ricetto',
    definizione: 'Luogo o condizione che accoglie e offre riparo; per estensione, rifugio o dimora sicura.',
    etimologia: 'Dal latino receptus, participio passato di recipĕre, “accogliere, ricevere, prendere con sé”.',
    esempio: 'Tra le pagine ritrovò un ricetto quieto, abbastanza ampio da contenere il rumore del giorno.',
    nota: 'Ricetto nomina una protezione concreta ma anche interiore: non una fuga dal mondo, bensì lo spazio che permette di abitarlo con maggiore attenzione.',
  },
  santi: [
    {
      nome: 'Santa Teresa di Calcutta',
      ruolo: 'Vergine e fondatrice',
      anni: '1910–1997',
      biografia: 'Memoria facoltativa nel Calendario Romano Generale il 5 settembre dal 2025. Nata a Skopje, dedicò la propria vita ai poveri e agli esclusi di Calcutta, fondando le Missionarie della Carità.',
    },
  ],
  bibbia: {
    testo: 'Con ogni cura vigila sul cuore,\nperché da esso sgorga la vita.',
    fonte: 'Proverbi 4,23 — CEI 2008',
    nota: 'Il proverbio presenta il cuore come sorgente da custodire con vigilanza: la cura interiore non chiude alla realtà, ma orienta parole, scelte e relazioni.',
  },
  poesia: {
    testo: 'Al mio cantuccio, donde non sento\nse non le reste brusir del grano,\nil suon dell’ore viene col vento\ndal non veduto borgo montano:\nsuono che uguale, che blando cade,\ncome una voce che persuade.',
    autore: 'Giovanni Pascoli',
    fonte: '“L’ora di Barga”, da Canti di Castelvecchio, 1907',
    nota: 'Il frammento costruisce un piccolo luogo d’ascolto: il tempo arriva da lontano come una voce quieta, e il gesto del guardare diventa una forma di permanenza.',
  },
  musica: {
    brano: 'Green',
    autore: 'Hiroshi Yoshimura',
    genere: 'Ambient',
    motivo: 'Un ascolto ambientale e rarefatto, fatto di suoni che sembrano posarsi sulla superficie del silenzio. La musica accompagna il tema del ricetto come uno spazio aperto, capace di accogliere senza chiedere attenzione forzata.',
    chiave_ricerca: 'Hiroshi Yoshimura Green',
  },
  keyword_arte_en: 'quiet refuge',
};

export function getFallbackContent(dataIso: string): DatiTaccuino | null {
  return dataIso === FALLBACK_CONTENT.data ? FALLBACK_CONTENT : null;
}
