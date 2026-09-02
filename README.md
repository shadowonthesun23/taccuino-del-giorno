This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Accesso editor

La pagina `/editor` è un’area riservata: l’accesso avviene con Supabase Auth e le API editoriali verificano anche l’UUID dell’utente autorizzato lato server.

Per abilitarla:

1. Crea un solo utente in Supabase, nella sezione Authentication → Users, con email e password.
2. Copia l’UUID dell’utente e aggiungilo alle variabili d’ambiente locali e di Vercel come `EDITOR_USER_ID`.
3. Mantieni `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` esclusivamente nelle variabili server-side. Non inserirli nel browser o in `NEXT_PUBLIC_*`.
4. Se non vuoi nuove registrazioni nel progetto Supabase, disattiva la registrazione pubblica nelle impostazioni Authentication.

Sono già necessarie anche `NEXT_PUBLIC_SUPABASE_URL` e la chiave pubblica Supabase (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` oppure l’attuale `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Il cron di `/api/generate` continua a usare `CRON_SECRET` senza passare dall’area editor.
