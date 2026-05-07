import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  });
}

function todayCST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

function dayOfWeekCST(): number {
  // 0=Sun, 6=Sat
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }),
  ).getDay();
}

function cstHour(iso: string): number {
  return new Date(
    new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago' }),
  ).getHours();
}

async function sendBatch(messages: PushMessage[]): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.ok) {
      sent += batch.length;
    } else {
      failed += batch.length;
      console.error('Push batch failed:', await res.text());
    }
  }

  return { sent, failed };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const window = url.searchParams.get('window') ?? 'evening';

    // Morning is weekends only (0=Sun, 6=Sat)
    if (window === 'morning') {
      const dow = dayOfWeekCST();
      if (dow !== 0 && dow !== 6) {
        return new Response(
          JSON.stringify({ sent: 0, reason: 'morning is weekends only' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const today = todayCST();
    const startOfDay = new Date(`${today}T00:00:00-06:00`);
    const endOfDay = new Date(`${today}T23:59:59-06:00`);

    // Fetch today's events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('uid,summary,category,start_at')
      .eq('is_active', true)
      .gte('start_at', startOfDay.toISOString())
      .lte('start_at', endOfDay.toISOString())
      .order('start_at', { ascending: true });

    if (eventsError) throw eventsError;

    // Filter by time window
    // morning → CST hour < 15 (before 3pm)
    // evening → CST hour >= 15
    const windowEvents = (events ?? []).filter((e) => {
      const h = cstHour(e.start_at);
      return window === 'morning' ? h < 15 : h >= 15;
    });

    if (windowEvents.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: 'no events in window' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch subscribers
    const alertCol = window === 'morning' ? 'morning_alerts' : 'evening_alerts';
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_prefs')
      .select('expo_push_token,categories')
      .eq('is_active', true)
      .eq(alertCol, true);

    if (prefsError) throw prefsError;
    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: 'no subscribers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const title =
      window === 'morning'
        ? 'Good morning! HUB has plans ☀️'
        : 'Tonight at The HUB 🍻';

    const messages: PushMessage[] = [];

    for (const pref of prefs) {
      const categories: string[] = pref.categories ?? ['all'];
      const filtered =
        categories.includes('all')
          ? windowEvents
          : windowEvents.filter((e) => categories.includes(e.category));

      if (filtered.length === 0) continue;

      const top2 = filtered.slice(0, 2);
      const bodyText = top2
        .map((e) => `${e.summary} ${formatTime(e.start_at)}`)
        .join(' · ');

      messages.push({
        to: pref.expo_push_token,
        title,
        body: bodyText,
        data: { screen: 'tonight' },
      });
    }

    const { sent, failed } = await sendBatch(messages);

    return new Response(
      JSON.stringify({ sent, failed, window }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-notifications error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
