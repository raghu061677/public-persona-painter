import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TARGET_URL = "https://app.go-ads.in/";
const SITEMAP_URL = "https://app.go-ads.in/sitemap.xml";
const ROBOTS_URL = "https://app.go-ads.in/robots.txt";
const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

async function runLighthouse(strategy: "mobile" | "desktop") {
  const params = new URLSearchParams({
    url: TARGET_URL,
    strategy,
    category: "performance",
  });
  const psiKey = Deno.env.get("PAGESPEED_API_KEY");
  if (psiKey) params.set("key", psiKey);

  const resp = await fetch(`${PSI_ENDPOINT}?${params.toString()}`);
  if (!resp.ok) {
    throw new Error(`PSI ${strategy} failed [${resp.status}]: ${await resp.text()}`);
  }
  const json = await resp.json();
  const audits = json?.lighthouseResult?.audits ?? {};
  const cats = json?.lighthouseResult?.categories ?? {};
  return {
    performance_score: cats?.performance?.score != null ? Math.round(cats.performance.score * 100) : null,
    lcp_ms: audits["largest-contentful-paint"]?.numericValue ?? null,
    fcp_ms: audits["first-contentful-paint"]?.numericValue ?? null,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
    tbt_ms: audits["total-blocking-time"]?.numericValue ?? null,
    speed_index_ms: audits["speed-index"]?.numericValue ?? null,
    raw: { lcpEl: audits["largest-contentful-paint-element"]?.details ?? null },
  };
}

async function checkSitemap() {
  try {
    const r = await fetch(SITEMAP_URL);
    const text = r.ok ? await r.text() : "";
    const urlCount = (text.match(/<loc>/g) || []).length;
    return { status: r.status, urlCount };
  } catch (e) {
    return { status: 0, urlCount: 0, error: String(e) };
  }
}

async function checkRobots() {
  try {
    const r = await fetch(ROBOTS_URL);
    return r.status;
  } catch {
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRole);

  const errors: string[] = [];
  let lh: Awaited<ReturnType<typeof runLighthouse>> | null = null;
  try {
    lh = await runLighthouse("mobile");
  } catch (e) {
    errors.push(String(e));
  }

  const sitemap = await checkSitemap();
  if (sitemap.status !== 200) errors.push(`sitemap status ${sitemap.status}`);
  const robotsStatus = await checkRobots();
  if (robotsStatus !== 200) errors.push(`robots status ${robotsStatus}`);

  const { data, error } = await supabase
    .from("seo_reports")
    .insert({
      target_url: TARGET_URL,
      strategy: "mobile",
      performance_score: lh?.performance_score ?? null,
      lcp_ms: lh?.lcp_ms ?? null,
      fcp_ms: lh?.fcp_ms ?? null,
      cls: lh?.cls ?? null,
      tbt_ms: lh?.tbt_ms ?? null,
      speed_index_ms: lh?.speed_index_ms ?? null,
      sitemap_status: sitemap.status,
      sitemap_url_count: sitemap.urlCount,
      robots_status: robotsStatus,
      gsc_indexed_count: null, // populated once Google Search Console is connected
      errors,
      raw: lh?.raw ?? null,
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, report: data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});