import type { LanguageCode } from './types';

export const UI_TRANSLATIONS: Record<string, Record<LanguageCode, string>> = {
  almanac: {
    IT: 'Effemeridi', EN: 'Almanac', FR: 'Éphémérides', DE: 'Almanach', ES: 'Efemérides', PT: 'Efemérides'
  },
  moon: {
    IT: 'Luna:', EN: 'Moon:', FR: 'Lune:', DE: 'Mond:', ES: 'Luna:', PT: 'Lua:'
  },
  fullMoon: {
    IT: 'Luna piena:', EN: 'Full moon:', FR: 'Pleine lune:', DE: 'Vollmond:', ES: 'Luna llena:', PT: 'Lua cheia:'
  },
  daylight: {
    IT: 'Luce del giorno:', EN: 'Daylight:', FR: 'Lumière du jour:', DE: 'Tageslicht:', ES: 'Luz del día:', PT: 'Luz do dia:'
  },
  planets: {
    IT: 'Pianeti osservabili', EN: 'Observable planets', FR: 'Planètes observables', DE: 'Beobachtbare Planeten', ES: 'Planetas observables', PT: 'Planetas observáveis'
  },
  readingSky: {
    IT: 'Calcolo del cielo…', EN: 'Reading the sky…', FR: 'Lecture du ciel…', DE: 'Himmel wird berechnet…', ES: 'Leyendo el cielo…', PT: 'Lendo o céu…'
  },
  noPlanets: {
    IT: 'Nessuno ben osservabile stanotte', EN: 'None clearly observable tonight', FR: 'Aucune bien observable ce soir', DE: 'Heute Nacht keine gut sichtbar', ES: 'Ninguno claramente observable esta noche', PT: 'Nenhum claramente observável esta noite'
  },
  dayTitle: {
    IT: 'Il giorno da custodire', EN: 'A day to keep', FR: 'Un jour à garder', DE: 'Ein Tag zum Bewahren', ES: 'Un día para guardar', PT: 'Um dia para guardar'
  },
  daySubtitle: {
    IT: 'Ogni giorno porta con sé qualcosa da non perdere: una frase, una poesia, un’immagine, una parola, una memoria, un passaggio di fede. Uno spazio per raccoglierli, leggerli con calma e custodirli sulla carta o nel cuore.',
    EN: 'Every day carries something worth keeping: a line, a poem, an image, a word, a memory, a passage of faith. A quiet space to gather them, read slowly, and keep them on paper or in the heart.',
    FR: 'Chaque jour apporte son lot de choses à ne pas manquer : une phrase, un poème, une image, un mot, un souvenir, un passage de foi. Un espace pour les rassembler, les lire calmement et les garder sur le papier ou dans le cœur.',
    DE: 'Jeder Tag bringt etwas Wertvolles mit sich: eine Zeile, ein Gedicht, ein Bild, ein Wort, eine Erinnerung, eine Glaubenspassage. Ein stiller Ort, um sie zu sammeln, langsam zu lesen und auf Papier oder im Herzen zu bewahren.',
    ES: 'Cada día trae consigo algo digno de guardar: una frase, un poema, una imagen, una palabra, un recuerdo, un pasaje de fe. Un espacio tranquilo para reunirlos, leer lentamente y guardarlos en papel o en el corazón.',
    PT: 'Cada dia traz consigo algo que vale a pena guardar: uma frase, um poema, uma imagem, uma palavra, uma memória, uma passagem de fé. Um espaço tranquilo para recolhê-los, ler devagar e guardá-los no papel ou no coração.'
  },
  savedPages: {
    IT: 'Cose custodite', EN: 'Saved pages', FR: 'Pages sauvegardées', DE: 'Gespeicherte Seiten', ES: 'Páginas guardadas', PT: 'Páginas salvas'
  },
  savedPagesTitle: {
    IT: 'Cose custodite', EN: 'Kept items', FR: 'Objets gardés', DE: 'Aufbewahrte Dinge', ES: 'Cosas guardadas', PT: 'Coisas guardadas'
  },
  noSaved: {
    IT: 'Non hai ancora custodito nulla. Clicca sull\'icona della piuma o del segnalibro per salvare i tuoi momenti preferiti.',
    EN: 'You haven\'t kept anything yet. Click the feather or bookmark icon to save your favorite moments.',
    FR: 'Vous n\'avez encore rien gardé. Cliquez sur la plume ou le signet pour sauvegarder vos moments préférés.',
    DE: 'Sie haben noch nichts gespeichert. Klicken Sie auf das Feder- oder Lesezeichensymbol, um Ihre Lieblingsmomente zu speichern.',
    ES: 'Aún no has guardado nada. Haz clic en la pluma o en el marcador para guardar tus momentos favoritos.',
    PT: 'Ainda não guardou nada. Clique na pena ou no marcador para guardar os seus momentos favoritos.'
  },
  clearAll: {
    IT: 'Cancella tutto', EN: 'Clear all', FR: 'Tout effacer', DE: 'Alles löschen', ES: 'Borrar todo', PT: 'Limpar tudo'
  },
  visited: {
    IT: 'già consultato', EN: 'already visited', FR: 'déjà visité', DE: 'bereits besucht', ES: 'ya visitado', PT: 'já visitado'
  },
  passportPreview: {
    IT: 'Anteprima del passaporto', EN: 'Passport preview', FR: 'Aperçu du passeport', DE: 'Reisepass-Vorschau', ES: 'Vista previa del pasaporte', PT: 'Visualização del pasaporte'
  },
  keepsake: {
    IT: 'Da conservare', EN: 'Keepsake', FR: 'À conserver', DE: 'Zum Aufbewahren', ES: 'Para conservar', PT: 'Para guardar'
  },
  zineSubtitle: {
    IT: 'Un foglio A4, otto facciate di cultura quotidiana.', EN: 'One A4 sheet, eight pages of daily culture.', FR: 'Une feuille A4, huit pages de culture quotidienne.', DE: 'Ein A4-Blatt, acht Seiten täglicher Kultur.', ES: 'Una hoja A4, ocho páginas de cultura diaria.', PT: 'Uma folha A4, ao longo de oito páginas de cultura quotidiana.'
  },
  printPdf: {
    IT: 'Stampa / Salva PDF', EN: 'Print / Save PDF', FR: 'Imprimer / Sauver PDF', DE: 'Drucken / Als PDF speichern', ES: 'Imprimir / Guardar PDF', PT: 'Imprimir / Salvar PDF'
  },
  close: {
    IT: 'Chiudi', EN: 'Close', FR: 'Fermer', DE: 'Schließen', ES: 'Cerrar', PT: 'Fechar'
  },
  closePreview: {
    IT: 'Chiudi anteprima', EN: 'Close preview', FR: 'Fermer l\'aperçu', DE: 'Vorschau schließen', ES: 'Cerrar vista previa', PT: 'Fechar visualização'
  },
  author: {
    IT: 'Autore', EN: 'Author', FR: 'Auteur', DE: 'Autor', ES: 'Autor', PT: 'Autor'
  },
  visitedStamp: {
    IT: 'Visitato', EN: 'Visited', FR: 'Visité', DE: 'Besucht', ES: 'Visitado', PT: 'Visitado'
  },
  foldHint: {
    IT: 'Piega lungo i tratteggi', EN: 'Fold on dashed lines', FR: 'Plier le long des pointillés', DE: 'An den gestrichelten Linien falten', ES: 'Doblar por las líneas discontinuas', PT: 'Dobrar ao longo das linhas tracejadas'
  },
  authorPhoto: {
    IT: 'Ritratto dell’autore', EN: 'Author portrait', FR: 'Portrait de l\'auteur', DE: 'Porträt des Autors', ES: 'Retrato del autor', PT: 'Retrato do autor'
  },
  artworkImage: {
    IT: 'Immagine dell’opera', EN: 'Artwork image', FR: 'Image de l\'œuvre', DE: 'Bild des Kunstwerks', ES: 'Imagen de la obra', PT: 'Imagem da obra'
  },
  authorOfTheDay: {
    IT: 'Autore del giorno', EN: 'Author of the day', FR: 'Auteur du jour', DE: 'Autor des Tages', ES: 'Autor del día', PT: 'Autor do dia'
  },
  shareCardPreview: {
    IT: 'Anteprima della card da condividere (formato 9:16)', EN: 'Preview of the shareable card (9:16 format)', FR: 'Aperçu de la carte à partager (format 9:16)', DE: 'Vorschau der teilbaren Karte (9:16 Format)', ES: 'Vista previa de la tarjeta para compartir (formato 9:16)', PT: 'Visualização do cartão de partilha (formato 9:16)'
  },
  hide: {
    IT: 'Nascondi', EN: 'Hide', FR: 'Masquer', DE: 'Ausblenden', ES: 'Ocultar', PT: 'Ocultar'
  },
  save: {
    IT: 'Salva', EN: 'Save', FR: 'Sauver', DE: 'Speichern', ES: 'Guardar', PT: 'Salvar'
  },
  generating: {
    IT: 'Generando', EN: 'Generating', FR: 'Génération', DE: 'Wird generiert', ES: 'Generando', PT: 'Gerando'
  },
  createPassport: {
    IT: 'Crea il passaporto del giorno', EN: 'Create today’s passport', FR: 'Créer le passeport du jour', DE: 'Reisepass des Tages erstellen', ES: 'Crear el pasaporte del día', PT: 'Criar o passaporte do dia'
  },
  download: {
    IT: 'Scarica', EN: 'Download', FR: 'Télécharger', DE: 'Herunterladen', ES: 'Descargar', PT: 'Descarregar'
  },
  downloadTicket: {
    IT: 'Scarica il biglietto', EN: 'Download ticket', FR: 'Télécharger le billet', DE: 'Ticket herunterladen', ES: 'Descargar billete', PT: 'Descarregar bilhete'
  },
  downloadTicketAria: {
    IT: 'Scarica il biglietto in PNG ad alta risoluzione', EN: 'Download the ticket as a high-resolution PNG', FR: 'Télécharger le billet en PNG haute résolution', DE: 'Ticket als hochauflösendes PNG herunterladen', ES: 'Descargar el billete en PNG de alta resolución', PT: 'Descarregar o bilhete em PNG de alta resolução'
  },
  ticketReadyTitle: {
    IT: 'Il biglietto è pronto', EN: 'Your ticket is ready', FR: 'Le billet est prêt', DE: 'Das Ticket ist bereit', ES: 'El billete está listo', PT: 'O bilhete está pronto'
  },
  ticketReadySubtitle: {
    IT: 'Tocca qui sotto per salvarlo in alta risoluzione.', EN: 'Tap below to save it in high resolution.', FR: 'Appuyez ci-dessous pour le sauvegarder en haute résolution.', DE: 'Tippen Sie unten, um es in hoher Auflösung zu speichern.', ES: 'Toque a continuación para guardarlo in alta resolución.', PT: 'Toque abaixo para guardá-lo em alta resolução.'
  },
  saveTicket: {
    IT: 'Salva il biglietto', EN: 'Save ticket', FR: 'Sauver le billet', DE: 'Ticket speichern', ES: 'Guardar billete', PT: 'Salvar bilhete'
  },
  openDay: {
    IT: 'Apri il giorno', EN: 'Open the day', FR: 'Ouvrir le jour', DE: 'Tag öffnen', ES: 'Abrir el día', PT: 'Abrir o dia'
  },
  openDayAria: {
    IT: 'Apri il giorno {date}', EN: 'Open {date}', FR: 'Ouvrir le {date}', DE: '{date} öffnen', ES: 'Abrir el día {date}', PT: 'Abrir o dia {date}'
  },
  changeTheme: {
    IT: 'Cambia tema', EN: 'Change theme', FR: 'Changer de thème', DE: 'Thema ändern', ES: 'Cambiar tema', PT: 'Mudar de tema'
  },
  passportTitle: {
    IT: 'Passaporto del Giorno', EN: 'Passport of the Day', FR: 'Passeport du Jour', DE: 'Reisepass des Tages', ES: 'Pasaporte del Día', PT: 'Passaporte do Dia'
  },
  passportSubtitle: {
    IT: 'Una mappa pieghevole da scaricare, stampare e conservare.', EN: 'A foldable map to download, print, and keep.', FR: 'Une carte pliable à télécharger, imprimer et conserver.', DE: 'Eine faltbare Karte zum Herunterladen, Drucken und Aufbewahren.', ES: 'Un mapa plegable para descargar, imprimir y guardar.', PT: 'Um mapa dobrável para descarregar, imprimir e guardar.'
  },
  downloadPdf: {
    IT: 'Scarica PDF', EN: 'Download PDF', FR: 'Télécharger PDF', DE: 'PDF herunterladen', ES: 'Descargar PDF', PT: 'Descarregar PDF'
  },
  openPrint: {
    IT: 'Apri stampa', EN: 'Open print', FR: "Ouvrir l'impression", DE: 'Druckansicht', ES: 'Abrir impresión', PT: 'Abrir impressão'
  },
  quote: {
    IT: 'Citazione', EN: 'Quote', FR: 'Citation', DE: 'Zitat', ES: 'Cita', PT: 'Citação'
  },
  word: {
    IT: 'Parola del Giorno', EN: 'Word of the Day', FR: 'Mot du Jour', DE: 'Wort des Tages', ES: 'Palabra del Día', PT: 'Palavra do Dia'
  },
  saintsTitle: {
    IT: 'I Santi di Oggi', EN: "Today's Saints", FR: "Les Saints d'Aujourd'hui", DE: 'Die heutigen Heiligen', ES: 'Los Santos de Hoy', PT: 'Os Santos de Hoje'
  },
  eventsTitle: {
    IT: 'Accadde Oggi', EN: 'This Day in History', FR: "Ce Jour-là dans l'Histoire", DE: 'Historische Ereignisse', ES: 'Un Día Como Hoy', PT: 'Aconteceu Hoje'
  },
  poemTitle: {
    IT: 'Poesia del giorno', EN: 'Poem of the Day', FR: 'Poème du Jour', DE: 'Gedicht des Tages', ES: 'Poema del Día', PT: 'Poema do Dia'
  },
  bibleTitle: {
    IT: 'Passaggio biblico', EN: 'Biblical passage', FR: 'Passage biblique', DE: 'Bibelpassage', ES: 'Pasaje bíblico', PT: 'Passagem bíblica'
  },
  musicTitle: {
    IT: 'Consiglio Musicale', EN: 'Musical Recommendation', FR: 'Recommandation Musicale', DE: 'Musikempfehlung', ES: 'Recomendación Musical', PT: 'Recomendação Musical'
  },
  artworkTitle: {
    IT: 'Opera del Giorno', EN: 'Artwork of the Day', FR: 'Œuvre du Jour', DE: 'Kunstwerk des Tages', ES: 'Obra del Día', PT: 'Obra do Dia'
  },
  artworkSelectorPrefix: {
    IT: 'Opera d’', EN: 'Artwork of d’', FR: 'Œuvre d’', DE: 'Kunstwerk d’', ES: 'Obra d’', PT: 'Obra d’'
  },
  artworkSelectorSuffix: {
    IT: ' · selezione del giorno', EN: ' · selection of the day', FR: ' · sélection du jour', DE: ' · Auswahl des Tages', ES: ' · selección del día', PT: ' · seleção do dia'
  },
  artworkSelectorSpring: {
    IT: 'Opera di primavera', EN: 'Spring artwork', FR: 'Œuvre de printemps', DE: 'Frühlingskunstwerk', ES: 'Obra de primavera', PT: 'Obra de primavera'
  },
  madeWithLove: {
    IT: 'Realizzato con amore da Antonello.',
    EN: 'Made with love by Antonello.',
    FR: 'Fait avec amour par Antonello.',
    DE: 'Mit Liebe gemacht von Antonello.',
    ES: 'Hecho con amor por Antonello.',
    PT: 'Feito com amor por Antonello.'
  },
  waxSealAria: {
    IT: 'Sigillo di ceralacca del giorno',
    EN: 'Daily wax seal',
    FR: 'Sceau de cire quotidien',
    DE: 'Tägliches Wachssiegel',
    ES: 'Sello de lacre diario',
    PT: 'Selo de lacre diário'
  },
  edition: {
    IT: 'edizione', EN: 'edition', FR: 'édition', DE: 'Edition', ES: 'edición', PT: 'edição'
  },
  of: {
    IT: 'di', EN: 'of', FR: 'de', DE: 'von', ES: 'de', PT: 'de'
  },
  number: {
    IT: 'n.', EN: 'no.', FR: 'n°', DE: 'Nr.', ES: 'n.º', PT: 'n.º'
  },
  footerText: {
    IT: 'Un foglio quotidiano di cultura, memoria e ascolto.',
    EN: 'A daily page of culture, memory, and listening.',
    FR: "Une page quotidienne de culture, de mémoire et d'écoute.",
    DE: 'Ein tägliches Blatt für Kultur, Erinnerung und Zuhören.',
    ES: 'Una página diaria de cultura, memoria y escucha.',
    PT: 'Uma página diária de cultura, memória e escuta.'
  },
  socialLinks: {
    IT: 'Collegamenti social', EN: 'Social links', FR: 'Liens réseaux sociaux', DE: 'Social Links', ES: 'Enlaces sociales', PT: 'Links de redes sociais'
  },
  support: {
    IT: 'Supporta', EN: 'Support', FR: 'Soutenir', DE: 'Unterstützen', ES: 'Apoyar', PT: 'Apoiar'
  },
  quoteCard: {
    IT: 'Citazione', EN: 'Quote', FR: 'Citation', DE: 'Zitat', ES: 'Cita', PT: 'Citação'
  },
  wordCard: {
    IT: 'Parola del giorno', EN: 'Word of the day', FR: 'Mot du jour', DE: 'Wort des Tages', ES: 'Palabra del día', PT: 'Palavra do dia'
  },
  saintsCard: {
    IT: 'I santi di oggi', EN: "Today's saints", FR: "Les saints d'aujourd'hui", DE: 'Die heutigen Heiligen', ES: 'Los saints de hoy', PT: 'Os saints de hoje'
  },
  artworkCard: {
    IT: 'Opera del giorno', EN: 'Artwork of the day', FR: 'Œuvre du jour', DE: 'Kunstwerk des Tages', ES: 'Obra del día', PT: 'Obra do dia'
  },
  eventsCard: {
    IT: 'Accadde oggi', EN: 'This day in history', FR: "Ce jour-là dans l'histoire", DE: 'Historische Ereignisse', ES: 'Un día como hoy', PT: 'Aconteceu hoje'
  },
  poemCard: {
    IT: 'Poesia del giorno', EN: 'Poem of the Day', FR: 'Poème du jour', DE: 'Gedicht des Tages', ES: 'Poema del día', PT: 'Poema do dia'
  },
  bibleCard: {
    IT: 'Passaggio biblico', EN: 'Biblical passage', FR: 'Passage biblique', DE: 'Bibelpassage', ES: 'Pasaje bíblico', PT: 'Passagem bíblica'
  },
  musicCard: {
    IT: 'Consiglio musicale', EN: 'Musical recommendation', FR: 'Recommandation musicale', DE: 'Musikempfehlung', ES: 'Recomendación musical', PT: 'Recomendação musical'
  },
  apodCard: {
    IT: 'Foto astronomica del giorno', EN: 'Astronomy picture of the day', FR: 'Photo astronomique du jour', DE: 'Astronomisches Bild des Tages', ES: 'Foto astronómica del día', PT: 'Foto astronómica do dia'
  },
  archiveTitle: {
    IT: 'Archivio', EN: 'Archive', FR: 'Archives', DE: 'Archiv', ES: 'Archivo', PT: 'Arquivo'
  },
  preparingPageStep1: {
    IT: 'Sfogliando le pagine...',
    EN: 'Turning the pages...',
    FR: 'Feuilletant le carnet...',
    DE: 'Seiten werden umgeblättert...',
    ES: 'Hojando las páginas...',
    PT: 'Folheando as páginas...'
  },
  preparingPageStep2: {
    IT: 'Cercando i pensieri di oggi...',
    EN: "Searching for today's thoughts...",
    FR: 'Recherche des pensées du jour...',
    DE: 'Suche nach den Gedanken von heute...',
    ES: 'Buscando los pensamientos de hoy...',
    PT: 'Buscando os pensamentos de hoje...'
  },
  preparingPageStep3: {
    IT: 'Inchiostrando la carta...',
    EN: 'Inking the paper...',
    FR: 'Encres sur le papier...',
    DE: 'Papier wird beschriftet...',
    ES: 'Entintando el papel...',
    PT: 'Entintando o papel...'
  },
  preparingNotebookAria: {
    IT: 'Il taccuino si sta preparando',
    EN: 'The notebook is being prepared',
    FR: 'Le carnet se prépare',
    DE: 'Das Notizbuch wird vorbereitet',
    ES: 'El cuaderno se está preparando',
    PT: 'O caderno está a ser preparado'
  },
  leaveAPenny: {
    IT: 'Lascia un pensiero',
    EN: 'Leave a thought',
    FR: 'Laisser un mot',
    DE: 'Hinterlasse einen Gedanken',
    ES: 'Deja un pensamiento',
    PT: 'Deixe um pensiero'
  },
  guestbookTitle: {
    IT: 'Registro dei visitatori',
    EN: 'Guestbook',
    FR: "Livre d'or",
    DE: 'Gästebuch',
    ES: 'Libro de visitas',
    PT: 'Livro de visitas'
  },
  guestbookSubtitle: {
    IT: 'Scrivi un pensiero anonimo o firmato per custodirlo nel taccuino.',
    EN: 'Write an anonymous or signed note to keep it in the notebook.',
    FR: "Écrivez un mot anonyme ou signé pour le conserver dans le carnet.",
    DE: 'Schreibe einen anonymen oder signierten Gedanken, um ihn im Notizbuch aufzubewahren.',
    ES: 'Escribe una nota anónima o firmada para guardarla en el cuaderno.',
    PT: 'Escreva uma nota anônima ou assinada para guardá-la no caderno.'
  },
  yourMessage: {
    IT: 'Il tuo messaggio',
    EN: 'Your message',
    FR: 'Votre message',
    DE: 'Deine Nachricht',
    ES: 'Tu mensaje',
    PT: 'Sua mensagem'
  },
  yourSignature: {
    IT: 'La tua firma (opzionale)',
    EN: 'Your signature (optional)',
    FR: 'Votre signature (optionnelle)',
    DE: 'Deine Unterschrift (optional)',
    ES: 'Tu firma (opcional)',
    PT: 'Sua assinatura (opcional)'
  },
  signaturePlaceholder: {
    IT: 'es. Un viandante',
    EN: 'e.g. A wanderer',
    FR: 'ex. Un voyageur',
    DE: 'z.B. Ein Wanderer',
    ES: 'ej. Un caminante',
    PT: 'ex. Um viajante'
  },
  sendButton: {
    IT: 'Spedisci',
    EN: 'Send',
    FR: 'Envoyer',
    DE: 'Senden',
    ES: 'Enviar',
    PT: 'Enviar'
  },
  sendingButton: {
    IT: 'Spedizione in corso...',
    EN: 'Sending...',
    FR: 'Envoi en cours...',
    DE: 'Senden...',
    ES: 'Enviando...',
    PT: 'Enviando...'
  },
  thankYouTitle: {
    IT: 'Messaggio spedito',
    EN: 'Message sent',
    FR: 'Message envoyé',
    DE: 'Nachricht gesendet',
    ES: 'Mensaje enviado',
    PT: 'Mensagem enviada'
  },
  thankYouSubtitle: {
    IT: 'Il tuo pensiero è stato custodito nel registro.',
    EN: 'Your thought has been kept in the register.',
    FR: 'Votre pensée a été conservée dans le registre.',
    DE: 'Dein Gedanke wurde im Register festgehalten.',
    ES: 'Tu pensamiento ha sido guardado en el registro.',
    PT: 'Seu pensamento foi guardado no registro.'
  }
};

export function t(key: keyof typeof UI_TRANSLATIONS, lingua: LanguageCode): string {
  return UI_TRANSLATIONS[key]?.[lingua] ?? UI_TRANSLATIONS[key]?.['EN'] ?? '';
}

const SECTION_KEY_MAP: Record<string, keyof typeof UI_TRANSLATIONS> = {
  autore: 'author',
  citazione: 'quote',
  parola: 'word',
  santi: 'saintsTitle',
  opera: 'artworkTitle',
  avvenimenti: 'eventsTitle',
  poesia: 'poemTitle',
  bibbia: 'bibleTitle',
  apod: 'apodCard',
  musica: 'musicTitle'
};

export function getSectionLabel(id: string, lingua: LanguageCode, fallbackIT: string, fallbackEN: string): string {
  const key = SECTION_KEY_MAP[id];
  if (key) {
    const translation = t(key, lingua);
    if (translation) return translation;
  }
  return lingua === 'IT' ? fallbackIT : fallbackEN;
}
