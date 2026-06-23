import Link from "next/link";
import { Caveat, EB_Garamond } from "next/font/google";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Church,
  Feather,
  Music,
  Palette,
  Quote,
  Type,
} from "lucide-react";
import styles from "./notebook.module.css";

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-editorial",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-hand",
  weight: ["400", "700"],
});

type NotebookBlock = {
  id: string;
  label: string;
  title: string;
  body: string;
  eyebrow?: string;
  meta?: string;
  icon: "quote" | "word" | "saints" | "events" | "poem" | "bible" | "music" | "art";
  kind?: "quote" | "poem" | "long" | "visual" | "compact";
  continuedFrom?: string;
  continues?: boolean;
};

type NumberedNotebookBlock = NotebookBlock & {
  number: number;
};

const iconMap = {
  quote: Quote,
  word: Type,
  saints: Church,
  events: CalendarDays,
  poem: Feather,
  bible: BookOpen,
  music: Music,
  art: Palette,
};

const indexItems = [
  ["autore", "Autore"],
  ["citazione", "Citazione"],
  ["parola", "Parola"],
  ["santi", "Santi"],
  ["opera", "Opera"],
  ["avvenimenti", "Avvenimenti"],
  ["poesia", "Poesia"],
  ["bibbia", "Bibbia"],
  ["musica", "Musica"],
] as const;

const sheets: NotebookBlock[][] = [
  [
    {
      id: "citazione",
      label: "Citazione",
      title: "Una domanda aperta",
      body: "Il mondo e anche questo: una domanda rimasta aperta sul tavolo.",
      meta: "Anna Maria Ortese, taccuino immaginario",
      icon: "quote",
      kind: "quote",
    },
    {
      id: "parola",
      label: "Parola del giorno",
      title: "sottovoce",
      body: "Dire senza occupare tutta la stanza: una misura del linguaggio quando il senso chiede delicatezza, non rinuncia. Nel taccuino diventa anche una regola grafica: lasciare margini, pause, respiro.",
      meta: "avverbio",
      icon: "word",
      kind: "compact",
    },
  ],
  [
    {
      id: "santi",
      label: "I santi di oggi",
      title: "San Giustino martire",
      body: "Filosofo e apologeta, porta nel giorno il tema di una fede che ragiona senza irrigidirsi. La sua memoria sta bene nella sequenza del foglio: dopo la parola, prima degli avvenimenti, come accade ora nel taccuino principale.",
      meta: "filosofo, apologeta, martire",
      icon: "saints",
      kind: "compact",
    },
    {
      id: "opera",
      label: "Opera del giorno",
      title: "Soglia in chiaroscuro",
      body: "Uno spazio visuale pensato per accogliere fotografia, ritratto, opera del Metropolitan Museum o immagine astratta coerente col giorno. In questa fase resta una macchia pittorica: il chiaroscuro vero lo si affina dopo che la lettura funziona.",
      meta: "keyword: threshold",
      icon: "art",
      kind: "visual",
    },
    {
      id: "avvenimenti",
      label: "Accadde oggi",
      title: "Il tempo pubblico",
      body: "1926: la radio entra nelle case con una promessa nuova di prossimita.\n1946: l'Italia sceglie la Repubblica.\n1980: una trasmissione pubblica ridisegna il modo in cui una nazione ascolta se stessa.\nIl giorno non e un elenco: e una costellazione di passaggi.",
      icon: "events",
    },
  ],
  [
    {
      id: "poesia",
      label: "Poesia del giorno",
      title: "La finestra accesa",
      body: "Nel vicolo una finestra\nresta accesa piu del necessario:\nqualcuno sta facendo pace\ncon la propria giornata.\n\nLa poesia, quando arriva lunga, non deve diventare una didascalia microscopica. Deve mantenere il proprio passo, con strofe leggibili e una nota che spieghi senza invadere. Se non entra nel foglio, la si lascia proseguire nel foglio dopo, senza cambiarle natura.",
      meta: "testo e nota critica",
      icon: "poem",
      kind: "poem",
      continues: true,
    },
    {
      id: "poesia-continua",
      label: "Poesia del giorno",
      title: "La finestra accesa",
      body: "La nota critica resta accanto al testo, non in una sezione separata: chiarisce il valore tematico e stilistico della scelta, ma conserva il tono quieto del taccuino compilato a mano.",
      meta: "continua dal foglio precedente",
      icon: "poem",
      kind: "poem",
      continuedFrom: "poesia",
    },
  ],
  [
    {
      id: "bibbia",
      label: "Passaggio biblico del giorno",
      title: "Una luce che non forza la soglia",
      body: "Il passo biblico occupa spesso piu spazio del previsto: una strofa salmodica, una pericope con rientri, un versetto che ha bisogno di respirare. Per questo la pagina non lo schiaccia. Lo accompagna in una colonna quieta, con fonte e nota teologica subito dopo il testo.\n\nQuando il brano e lungo, continua sul foglio successivo esattamente da dove si interrompe: non diventa appendice, non viene riassunto, non viene spostato fuori sequenza.",
      meta: "CEI 2008, nota teologica",
      icon: "bible",
      kind: "long",
      continues: true,
    },
  ],
  [
    {
      id: "bibbia-continua",
      label: "Passaggio biblico del giorno",
      title: "Una luce che non forza la soglia",
      body: "Il senso del passaggio si legge dopo il testo, come avviene nel progetto attuale: una nota impersonale, breve, teologica, che non interrompe la sequenza ma la conclude.",
      meta: "continua dal foglio precedente",
      icon: "bible",
      kind: "long",
      continuedFrom: "bibbia",
    },
    {
      id: "musica",
      label: "Consiglio musicale",
      title: "Nina Simone - Feeling Good",
      body: "Una voce che trasforma il risveglio in atto di presenza. Il blocco musicale chiude il flusso con autore, genere, motivo e chiavi di ascolto, senza diventare un player invasivo.",
      meta: "jazz, soul",
      icon: "music",
      kind: "compact",
    },
  ],
];

function numberSheets(sourceSheets: NotebookBlock[][]): NumberedNotebookBlock[][] {
  let currentNumber = 0;

  return sourceSheets.map((sheet) =>
    sheet.map((block) => {
      if (!block.continuedFrom) {
        currentNumber += 1;
      }

      return { ...block, number: currentNumber };
    })
  );
}

const numberedSheets = numberSheets(sheets);

function NotebookSection({ block }: { block: NumberedNotebookBlock }) {
  const Icon = iconMap[block.icon];

  return (
    <section
      className={`${styles.section} ${block.kind ? styles[block.kind] : ""} ${
        block.continuedFrom ? styles.continuation : ""
      }`}
      id={block.id}
    >
      {!block.continuedFrom ? (
        <div className={styles.sectionMark}>
          <span>{String(block.number).padStart(2, "0")}</span>
          <Icon size={16} aria-hidden="true" />
        </div>
      ) : null}
      <div className={styles.sectionBody}>
        {!block.continuedFrom ? (
          <>
            <p>{block.label}</p>
            <h2>{block.title}</h2>
            {block.meta ? <small>{block.meta}</small> : null}
          </>
        ) : null}
        <div>{block.body}</div>
      </div>
    </section>
  );
}

export default function NotebookPrototypePage() {
  return (
    <main className={`${styles.shell} ${ebGaramond.variable} ${caveat.variable}`}>
      <div className={styles.deskLayer} aria-hidden="true">
        <span className={styles.pencil} />
        <span className={styles.clip} />
        <span className={styles.lightPatch} />
      </div>

      <Link className={styles.backLink} href="/">
        <ArrowLeft size={17} aria-hidden="true" />
        Taccuino classico
      </Link>

      <div className={styles.sheetStack}>
        <article className={styles.paper} aria-labelledby="paper-title">
          <header className={styles.masthead} id="autore">
            <div className={styles.dateBlock}>
              <CalendarDays size={18} aria-hidden="true" />
              <span>Lunedi</span>
              <strong>1</strong>
              <small>giugno 2026</small>
            </div>

            <div className={styles.titleBlock}>
              <p>Il Taccuino del Giorno</p>
              <h1 id="paper-title">Anna Maria Ortese</h1>
              <span>
                Ha trasformato la meraviglia in una forma di attenzione morale:
                precisa, fragile, necessaria.
              </span>
            </div>

            <div className={styles.authorVisual} aria-hidden="true">
              <div />
            </div>
          </header>

          <nav className={styles.index} aria-label="Indice del taccuino">
            {indexItems.map(([href, label], index) => (
              <a href={`#${href}`} key={href}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {label}
              </a>
            ))}
          </nav>

          <div className={styles.flow}>
            {numberedSheets[0].map((block) => (
              <NotebookSection block={block} key={block.id} />
            ))}
          </div>

          <footer className={styles.paperFoot}>
            <span>foglio 1</span>
          </footer>
        </article>

        {numberedSheets.slice(1).map((sheet, sheetIndex) => (
          <article className={styles.paper} key={sheetIndex} aria-label={`Foglio ${sheetIndex + 2}`}>
            <div className={styles.flow}>
              {sheet.map((block) => (
                <NotebookSection block={block} key={block.id} />
              ))}
            </div>

            <footer className={styles.paperFoot}>
              <span>foglio {sheetIndex + 2}</span>
            </footer>
          </article>
        ))}
      </div>
    </main>
  );
}
