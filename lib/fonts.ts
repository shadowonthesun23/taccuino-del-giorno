import { IM_Fell_Double_Pica, Caveat } from 'next/font/google';
import localFont from 'next/font/local';

export const garamond = IM_Fell_Double_Pica({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export const jocky = localFont({
  src: '../public/fonts/JockyStarline.ttf',
  display: 'block',
  preload: true,
  fallback: ['serif'],
});

export const masterSignature = localFont({
  src: '../public/fonts/MasterSignature.otf',
  display: 'block',
  preload: true,
  fallback: ['serif'],
});

export const stampwriter = localFont({
  src: '../public/fonts/STAMPWRITER-KIT.ttf',
  display: 'swap',
  preload: true,
  fallback: ['Courier New', 'monospace'],
});
