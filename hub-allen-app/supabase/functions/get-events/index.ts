import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const url = new URL(req.url);
    const params = url.searchParams;

    // Parse query params
    const dateStr = params.get('date') ?? todayCST();
    const days = Math.min(parseInt(params.get('days') ?? '1', 10), 30);
    const category = params.get('category') ?? null;
    const limit = Math.min(parseInt(params.get('limit') ?? '50', 10), 100);
    const offset = parseInt(params.get('offset') ?? '0', 10);

    // Calculate date range
    const startDate = new Date(`${dateStr}T00:00:00-06:00`);
    const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

    // Use service role to bypass RLS for public event reads
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let query = supabase
      .from('events')
      .select('id,uid,summary,category,start_at,end_at,image_url,event_url,cost_type,is_recurring,attendee_count')
      .eq('is_active', true)
      .gte('start_at', startDate.toISOString())
      .lt('start_at', endDate.toISOString())
      .order('start_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return new Response(
      JSON.stringify({ events: data ?? [], count: (data ?? []).length, date: dateStr }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('get-events error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

function todayCST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}
