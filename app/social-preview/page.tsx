import type { Metadata } from 'next';
import SocialPreviewClient from './SocialPreviewClient';

export const metadata: Metadata = {
  title: 'Social Stories Preview · Il giorno da custodire',
  robots: { index: false, follow: false },
};

export default function SocialPreviewPage() {
  return <SocialPreviewClient />;
}
