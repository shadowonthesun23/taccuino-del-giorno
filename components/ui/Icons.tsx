import React from 'react';

export const XIcon = ({ className, strokeWidth = 1.5 }: { className?: string, strokeWidth?: number }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);

export const InstagramIcon = ({ className, strokeWidth = 1.5 }: { className?: string, strokeWidth?: number }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export const CoffeeIcon = ({ className, strokeWidth = 1.5 }: { className?: string, strokeWidth?: number }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
    <line x1="6" x2="6" y1="2" y2="4"/>
    <line x1="10" x2="10" y1="2" y2="4"/>
    <line x1="14" x2="14" y1="2" y2="4"/>
  </svg>
);

export const SpotifyIcon = ({ className, strokeWidth = 1.7 }: { className?: string, strokeWidth?: number }) => (
  <svg aria-hidden="true" className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M7.2 9.3c3.2-.9 6.9-.7 9.7.8" />
    <path d="M7.7 12.2c2.7-.7 5.7-.5 8.2.7" />
    <path d="M8.4 15c2.2-.5 4.5-.3 6.6.6" />
  </svg>
);

export const YouTubeIcon = ({ className, strokeWidth = 1.7 }: { className?: string, strokeWidth?: number }) => (
  <svg aria-hidden="true" className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.6 7.1a2.7 2.7 0 0 0-1.9-1.9C17 4.7 12 4.7 12 4.7s-5 0-6.7.5a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2.9 12a28 28 0 0 0 .5 4.9 2.7 2.7 0 0 0 1.9 1.9c1.7.5 6.7.5 6.7.5s5 0 6.7-.5a2.7 2.7 0 0 0 1.9-1.9 28 28 0 0 0 .5-4.9 28 28 0 0 0-.5-4.9Z" />
    <path d="m10.1 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
  </svg>
);
