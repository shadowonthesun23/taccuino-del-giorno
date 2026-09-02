import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Accesso editor | Il giorno da custodire',
  robots: {
    index: false,
    follow: false,
  },
};

function safeNextPath(value: string | string[] | undefined) {
  const nextPath = Array.isArray(value) ? value[0] : value;
  return nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/editor';
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;

  return <LoginForm nextPath={safeNextPath(params.next)} />;
}
