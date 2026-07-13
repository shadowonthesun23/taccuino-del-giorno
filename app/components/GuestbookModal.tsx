'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Check } from 'lucide-react';
import type { LanguageCode } from '@/lib/types';
import { t } from '@/lib/translation';
import { garamond } from '@/lib/fonts';

export default function GuestbookModal({
  isOpen,
  onClose,
  isDark,
  lingua = 'IT',
}: {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  lingua?: LanguageCode;
}) {
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot trap
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openTime, setOpenTime] = useState<number>(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // Set the open time and reset state when opened
  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => {
        setOpenTime(Date.now());
        setMessage('');
        setSignature('');
        setWebsite('');
        setIsSubmitting(false);
        setIsSuccess(false);
        setErrorMsg(null);
      }, 0);
      
      // Lock page scroll
      document.body.style.overflow = 'hidden';
      
      // Accessibility focus trap
      const focusable = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex="0"]'
      );
      if (focusable && focusable.length > 0) {
        (focusable[0] as HTMLElement).focus();
      }
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Local Validation
    if (!message.trim()) {
      setErrorMsg(lingua === 'IT' ? 'Inserisci un messaggio prima di spedire.' : 'Please write a message before sending.');
      return;
    }

    // Rate Limiting (Local Check)
    const lastSubmission = localStorage.getItem('last_guestbook_submission');
    if (lastSubmission) {
      const elapsed = Date.now() - Number(lastSubmission);
      if (elapsed < 120000) { // 2 minutes
        const remainingSec = Math.ceil((120000 - elapsed) / 1000);
        setErrorMsg(
          lingua === 'IT'
            ? `Attendi ancora ${remainingSec} secondi prima di spedire un altro pensiero.`
            : `Please wait ${remainingSec} seconds before sending another note.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/guestbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          signature,
          language: lingua,
          website, // Honeypot field
          clientTime: openTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit message.');
      }

      // Success
      setIsSuccess(true);
      localStorage.setItem('last_guestbook_submission', String(Date.now()));
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : '';
      setErrorMsg(errMsg || (lingua === 'IT' ? 'Errore imprevisto di spedizione.' : 'Unexpected submission error.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div 
      className={`guestbook-overlay flex items-center justify-center ${garamond.className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guestbook-title"
    >
      <div 
        ref={modalRef}
        className={`guestbook-modal-card ${isDark ? 'is-dark' : ''} ${isSuccess ? 'is-success-card' : ''}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="guestbook-close"
          aria-label={t('close', lingua)}
        >
          <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </button>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="guestbook-form">
            <h2 id="guestbook-title" className="guestbook-headline font-bold text-3xl mb-1 text-[#DE6B58]">
              {t('guestbookTitle', lingua)}
            </h2>
            <p className="guestbook-subtitle italic text-sm text-[#8A817C] dark:text-[#A0A0A0] mb-5">
              {t('guestbookSubtitle', lingua)}
            </p>

            {errorMsg && (
              <div className="guestbook-error text-xs p-2.5 mb-4 rounded border border-[#DE6B58]/35 bg-[#DE6B58]/5 text-[#DE6B58] italic font-medium" role="alert">
                {errorMsg}
              </div>
            )}

            {/* Honeypot field - completely hidden from visual and screen readers */}
            <div style={{ position: 'absolute', overflow: 'hidden', height: 0, width: 0, opacity: 0 }} aria-hidden="true">
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="guestbook-field mb-4">
              <label htmlFor="guestbook-message-input" className="guestbook-label block text-xs uppercase tracking-wider font-semibold mb-1 text-[#8A817C] dark:text-[#A0A0A0]">
                {t('yourMessage', lingua)} *
              </label>
              <textarea
                id="guestbook-message-input"
                required
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="guestbook-textarea w-full p-3 rounded"
                rows={4}
              />
            </div>

            <div className="guestbook-field mb-6">
              <label htmlFor="guestbook-signature-input" className="guestbook-label block text-xs uppercase tracking-wider font-semibold mb-1 text-[#8A817C] dark:text-[#A0A0A0]">
                {t('yourSignature', lingua)}
              </label>
              <input
                id="guestbook-signature-input"
                type="text"
                maxLength={100}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder={t('signaturePlaceholder', lingua)}
                className="guestbook-input w-full p-2.5 rounded"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="guestbook-submit-btn w-full py-2.5 flex items-center justify-center gap-2 rounded text-base font-bold transition-all focus:outline-none"
            >
              <Send className="h-4 w-4" strokeWidth={1.7} />
              <span>{isSubmitting ? t('sendingButton', lingua) : t('sendButton', lingua)}</span>
            </button>
          </form>
        ) : (
          <div className="guestbook-success-layout text-center py-6">
            <div className="guestbook-postage-stamp-wrapper mx-auto mb-6">
              <div className="guestbook-postage-stamp">
                <Check className="h-8 w-8 text-[#DE6B58] stroke-[2.5]" />
              </div>
            </div>
            <h2 className="guestbook-headline font-bold text-3xl mb-2 text-[#DE6B58]">
              {t('thankYouTitle', lingua)}
            </h2>
            <p className="guestbook-subtitle italic text-base text-[#8A817C] dark:text-[#A0A0A0] max-w-[280px] mx-auto">
              {t('thankYouSubtitle', lingua)}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
