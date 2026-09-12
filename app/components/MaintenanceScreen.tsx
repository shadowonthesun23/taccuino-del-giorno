import { MAINTENANCE_COPY, type MaintenanceLocale } from '@/lib/maintenance';

export default function MaintenanceScreen({ locale }: { locale: MaintenanceLocale }) {
  const copy = MAINTENANCE_COPY[locale];

  return (
    <main className="maintenance-screen">
      <section
        className="maintenance-screen-paper"
        aria-labelledby="maintenance-title"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <span className="maintenance-screen-kicker">Day Atlas</span>
        <span className="maintenance-screen-ink" aria-hidden="true" />
        <h1 id="maintenance-title">{copy.title}</h1>
        <p>{copy.body}</p>
        <footer style={{ position: 'static', marginTop: 'auto', paddingTop: 'clamp(2rem, 5vw, 3rem)' }}>
          Day Atlas · Il giorno da custodire
        </footer>
      </section>
    </main>
  );
}
