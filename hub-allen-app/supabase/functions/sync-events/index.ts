import { createClient } from 'npm:@supabase/supabase-js@2';
import { deriveCategory } from '../_shared/categoryUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Minimal iCal parser ────────────────────────────────────────────────────

interface VEvent {
  uid: string;
  summary: string;
  description: string | null;
  dtstart: Date;
  dtend: Date;
  rrule: string | null;
  imageUrl: string | null;
  eventUrl: string | null;
  costType: string;
}

function unfoldLines(raw: string): string[] {
  return raw
    .replace(/\r\n[ \t]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');
}

function parseDate(val: string): Date {
  const hasCentralTZ = val.toUpperCase().includes('TZID=AMERICA/CHICAGO') ||
                       val.toUpperCase().includes('TZID=US/CENTRAL');

  const stripped = val.includes(':') ? val.split(':').pop()! : val;
  const s = stripped.replace(/Z$/, '').trim();

  if (s.length === 8) {
    // DATE-only: YYYYMMDD — treat as midnight CST
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00-05:00`);
  }

  const datePart = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const timePart = `${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}`;

  if (s.endsWith('Z')) {
    return new Date(`${datePart}T${timePart}Z`);
  }

  // Apply CDT (-05:00) Mar–Oct, CST (-06:00) Nov–Feb
  const month = parseInt(s.slice(4, 6), 10);
  const offset = (month >= 3 && month <= 10) ? '-05:00' : '-06:00';
  return new Date(`${datePart}T${timePart}${offset}`);
}

function stripHtml(html: string | null): string | null {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseICS(raw: string): VEvent[] {
  const lines = unfoldLines(raw);
  const events: VEvent[] = [];
  let inEvent = false;
  let cur: Partial<VEvent> & { raw: Record<string, string> } = { raw: {} };

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      cur = { raw: {} };
      continue;
    }
    if (line === 'END:VEVENT') {
      inEvent = false;
      if (cur.uid && cur.summary && cur.dtstart && cur.dtend) {
        events.push({
          uid: cur.uid,
          summary: cur.summary,
          description: cur.description ?? null,
          dtstart: cur.dtstart,
          dtend: cur.dtend,
          rrule: cur.rrule ?? null,
          imageUrl: cur.imageUrl ?? null,
          eventUrl: cur.eventUrl ?? null,
          costType: cur.costType ?? 'free',
        });
      }
      continue;
    }
    if (!inEvent) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const rawKey = line.slice(0, colonIdx).toUpperCase();
    const value = line.slice(colonIdx + 1).trim();

    // Strip param portion from key: DTSTART;TZID=... → DTSTART
    const key = rawKey.split(';')[0];

    switch (key) {
      case 'UID':         cur.uid = value; break;
      case 'SUMMARY':     cur.summary = value.replace(/\\n/g, '\n').replace(/\\,/g, ','); break;
      case 'DESCRIPTION':
        cur.description = stripHtml(value.replace(/\\n/g, '\n').replace(/\\,/g, ','));
        break;
      case 'DTSTART':     cur.dtstart = parseDate(rawKey + ':' + value); break;
      case 'DTEND':       cur.dtend = parseDate(rawKey + ':' + value); break;
      case 'RRULE':       cur.rrule = value; break;
      case 'URL':         cur.eventUrl = value; break;
      case 'X-WP-IMAGES-URL': cur.imageUrl = value; break;
      case 'X-COST-TYPE':
        cur.costType = value.toLowerCase().includes('paid') ? 'paid' : 'free';
        break;
    }
  }

  return events;
}

// ─── Minimal RRULE expander ──────────────────────────────────────────────────

const DAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

function expandRRule(rruleStr: string, dtstart: Date, until: Date): Date[] {
  const params: Record<string, string> = {};
  for (const part of rruleStr.split(';')) {
    const [k, v] = part.split('=');
    if (k && v) params[k.toUpperCase()] = v.toUpperCase();
  }

  const freq = params['FREQ'];
  const count = params['COUNT'] ? parseInt(params['COUNT'], 10) : Infinity;
  const rruleUntil = params['UNTIL'] ? parseDate(params['UNTIL']) : null;
  const effectiveUntil = rruleUntil && rruleUntil < until ? rruleUntil : until;

  const interval = parseInt(params['INTERVAL'] ?? '1', 10);
  const byDay: number[] = params['BYDAY']
    ? params['BYDAY'].split(',').map((d) => DAY_MAP[d.replace(/[-+0-9]/g, '')] ?? -1).filter((d) => d !== -1)
    : [];

  const occurrences: Date[] = [];
  const cur = new Date(dtstart);
  let iterations = 0;
  const maxIter = 500;

  while (cur <= effectiveUntil && occurrences.length < count && iterations < maxIter) {
    iterations++;
    if (cur >= dtstart) {
      if (byDay.length === 0 || byDay.includes(cur.getDay())) {
        occurrences.push(new Date(cur));
      }
    }

    if (freq === 'DAILY') {
      cur.setDate(cur.getDate() + interval);
    } else if (freq === 'WEEKLY') {
      if (byDay.length > 1) {
        // Multi-day weekly: advance one day at a time within the week
        cur.setDate(cur.getDate() + 1);
        // Jump to next week start when we've passed all byDays
        const nextDays = byDay.filter((d) => d > cur.getDay());
        if (nextDays.length === 0 && cur.getDay() !== byDay[0]) {
          const daysToNext = (7 - cur.getDay() + byDay[0]) % 7 || 7 * interval;
          cur.setDate(cur.getDate() + daysToNext - 1);
        }
      } else {
        cur.setDate(cur.getDate() + 7 * interval);
      }
    } else if (freq === 'MONTHLY') {
      cur.setMonth(cur.getMonth() + interval);
    } else {
      break;
    }
  }

  return occurrences;
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')!;
    const icalUrl = Deno.env.get('ICAL_URL')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch iCal feed
    const icalRes = await fetch(icalUrl);
    if (!icalRes.ok) throw new Error(`iCal fetch failed: ${icalRes.status}`);
    const icalText = await icalRes.text();

    // 2. Parse
    const vevents = parseICS(icalText);

    const now = new Date();
    const ninetyDaysOut = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    type EventRow = {
      uid: string;
      summary: string;
      description: string | null;
      category: string;
      start_at: string;
      end_at: string;
      is_recurring: boolean;
      image_url: string | null;
      event_url: string | null;
      cost_type: string;
      is_active: boolean;
      synced_at: string;
    };

    const rows: EventRow[] = [];

    for (const ev of vevents) {
      const category = deriveCategory(ev.summary);

      if (ev.rrule) {
        const occurrences = expandRRule(ev.rrule, ev.dtstart, ninetyDaysOut);
        const durationMs = ev.dtend.getTime() - ev.dtstart.getTime();

        for (const occ of occurrences) {
          if (occ < now) continue;
          const occUid = `${ev.uid}_${occ.toISOString()}`;
          rows.push({
            uid: occUid,
            summary: ev.summary,
            description: ev.description,
            category,
            start_at: occ.toISOString(),
            end_at: new Date(occ.getTime() + durationMs).toISOString(),
            is_recurring: true,
            image_url: ev.imageUrl,
            event_url: ev.eventUrl,
            cost_type: ev.costType,
            is_active: true,
            synced_at: now.toISOString(),
          });
        }
      } else {
        if (ev.dtstart >= now && ev.dtstart <= ninetyDaysOut) {
          rows.push({
            uid: ev.uid,
            summary: ev.summary,
            description: ev.description,
            category,
            start_at: ev.dtstart.toISOString(),
            end_at: ev.dtend.toISOString(),
            is_recurring: false,
            image_url: ev.imageUrl,
            event_url: ev.eventUrl,
            cost_type: ev.costType,
            is_active: true,
            synced_at: now.toISOString(),
          });
        }
      }
    }

    // 3. Upsert in batches of 100
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase
        .from('events')
        .upsert(batch, { onConflict: 'uid' });
      if (error) throw error;
    }

    // 4. Deactivate stale future events not in this sync
    if (rows.length > 0) {
      const syncedUids = rows.map((r) => r.uid);
      // Deactivate in batches to avoid URL length limits
      for (let i = 0; i < syncedUids.length; i += 200) {
        const chunk = syncedUids.slice(i, i + 200);
        await supabase
          .from('events')
          .update({ is_active: false })
          .not('uid', 'in', `(${chunk.map((u) => `"${u}"`).join(',')})`)
          .gt('start_at', now.toISOString());
      }
    }

    return new Response(
      JSON.stringify({ synced: rows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('sync-events error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
