'use client';

import { type FormEvent, useState } from 'react';
import { IM_Fell_Double_Pica } from 'next/font/google';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const garamond = IM_Fell_Double_Pica({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');

    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setPending(false);
        setMessage('Email o password non valide.');
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setPending(false);
      setMessage('Impossibile completare l’accesso. Riprova tra poco.');
    }
  }

  return (
    <main className={`${garamond.className} login-page min-h-screen bg-[#f8f6f0] px-5 py-10 text-[#2a2522]`}>
      <section className="login-card mx-auto mt-12 max-w-xl rounded-[18px] border border-[#b5956a]/25 bg-[#fffdf6]/90 p-7 shadow-[0_24px_70px_-52px_rgba(42,37,34,0.42)] md:mt-20 md:p-10">
        <p className="login-kicker mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#9e2a2b]">Area riservata</p>
        <h1 className="login-title text-4xl font-bold leading-tight md:text-5xl">Accesso editor</h1>
        <p className="login-intro mt-4 text-lg italic leading-relaxed text-[#5f5548]">
          La direzione curatoriale del giorno è accessibile solo all’account autorizzato.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="login-label mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#6f614d]">Email</span>
            <input
              className="login-input w-full rounded-xl border border-[#b5956a]/35 bg-[#f8f1df] px-4 py-3 text-lg outline-none transition focus:border-[#9e2a2b]"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>

          <label className="block">
            <span className="login-label mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#6f614d]">Password</span>
            <input
              className="login-input w-full rounded-xl border border-[#b5956a]/35 bg-[#f8f1df] px-4 py-3 text-lg outline-none transition focus:border-[#9e2a2b]"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button
            className="login-submit w-full rounded-xl bg-[#9e2a2b] px-5 py-3 text-lg font-bold text-[#fffdf6] transition hover:bg-[#7f2022] disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={pending}
          >
            {pending ? 'Verifico…' : 'Entra nell’editor'}
          </button>
        </form>

        {message ? (
          <p className="login-message mt-5 rounded-xl border border-[#9e2a2b]/25 bg-[#9e2a2b]/8 px-4 py-3 text-[#7f2022]" role="alert">
            {message}
          </p>
        ) : null}

        <Link className="login-back-link mt-8 inline-block text-sm font-bold uppercase tracking-[0.14em] text-[#6f614d] underline decoration-[#b5956a]/60 underline-offset-4" href="/">
          Torna al taccuino
        </Link>
      </section>
    </main>
  );
}
