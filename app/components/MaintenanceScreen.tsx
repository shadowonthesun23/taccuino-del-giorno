import { MAINTENANCE_COPY, type MaintenanceLocale } from '@/lib/maintenance';

export default function MaintenanceScreen({ locale }: { locale: MaintenanceLocale }) {
  const copy = MAINTENANCE_COPY[locale];

  return (
    <main className="maintenance-screen">
      <section className="maintenance-screen-paper" aria-labelledby="maintenance-title">
        <span className="maintenance-screen-kicker">Day Atlas</span>
        <span className="maintenance-screen-ink" aria-hidden="true" />
        <h1 id="maintenance-title">{copy.title}</h1>
        <p>{copy.body}</p>
        <footer>Day Atlas · Il giorno da custodire</footer>
      </section>
    </main>
  );
}
