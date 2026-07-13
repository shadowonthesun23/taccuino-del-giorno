import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, signature, language, website, clientTime } = body;

    // 1. Honeypot check (invisible form trap)
    if (website && website.trim() !== '') {
      // Return a fake success so spambots think they succeeded
      return NextResponse.json({ success: true, status: 'fake_success' });
    }

    // 2. Validate content presence
    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
    }

    const trimmedMessage = message.trim();

    // 3. Spam Prevention: Maximum length check
    if (trimmedMessage.length > 1000) {
      return NextResponse.json({ error: 'Message is too long (maximum 1000 characters).' }, { status: 400 });
    }

    // 4. Spam Prevention: Link filtering (allow at most 1 link)
    const links = trimmedMessage.match(/https?:\/\/[^\s]+/gi) || [];
    if (links.length > 1) {
      return NextResponse.json(
        { error: 'For spam prevention, messages cannot contain more than one web link.' },
        { status: 400 }
      );
    }

    // 5. Spam Prevention: Time-Lock check (ensure user didn't submit in under 2.5 seconds)
    if (clientTime) {
      const elapsed = Date.now() - Number(clientTime);
      if (elapsed < 2500) {
        return NextResponse.json({ error: 'Submission rejected: too fast.' }, { status: 400 });
      }
    }

    // 6. Connect to Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase environment configuration is incomplete.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 7. Insert message row
    const cleanSignature = signature && signature.trim() !== '' ? signature.trim() : null;
    const cleanLanguage = language && language.trim() !== '' ? language.trim() : 'IT';

    const { error } = await supabase
      .from('guestbook_messages')
      .insert([
        {
          message: trimmedMessage,
          signature: cleanSignature,
          language: cleanLanguage,
        },
      ]);

    if (error) {
      console.error('Supabase guestbook error:', error);
      return NextResponse.json({ error: 'Failed to write message into register.' }, { status: 500 });
    }

    // 8. (Optional) Send notification to Telegram
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (telegramToken && telegramChatId) {
      try {
        const escapeHtml = (str: string) =>
          str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeSignature = escapeHtml(cleanSignature || 'Un viandante');
        const safeMessage = escapeHtml(trimmedMessage);
        
        const text = `📬 <b>Nuovo messaggio sul Taccuino!</b>\n\n<b>Da:</b> ${safeSignature} (${cleanLanguage})\n<b>Messaggio:</b>\n${safeMessage}`;
        
        const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: text,
            parse_mode: 'HTML',
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error('Telegram API returned error status:', res.status, errText);
        }
      } catch (tgError) {
        console.error('Telegram notification error:', tgError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Guestbook endpoint exception:', err);
    return NextResponse.json({ error: 'Server error occurred.' }, { status: 500 });
  }
}
