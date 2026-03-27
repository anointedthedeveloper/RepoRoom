import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BLOCKED = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;
const URL_RE = /^https?:\/\/.+/i;

function getMeta(html: string, ...props: string[]): string {
  for (const prop of props) {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
           || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { url } = await req.json() as { url: string };

    if (!url || !URL_RE.test(url)) {
      return Response.json({ error: "Invalid URL" }, { status: 400, headers: cors });
    }

    const host = new URL(url).hostname;
    if (BLOCKED.test(host)) {
      return Response.json({ error: "Blocked" }, { status: 403, headers: cors });
    }

    // Check cache first
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cached } = await supabase
      .from("link_previews")
      .select("*")
      .eq("url", url)
      .single();

    // Return cache if less than 24 hours old
    if (cached && new Date(cached.fetched_at) > new Date(Date.now() - 86400000)) {
      return Response.json(cached, { headers: cors });
    }

    // Fetch the page
    const res = await fetch(url, {
      headers: { "User-Agent": "RepoRoomBot/1.0 (link preview)" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const preview = {
      url,
      title: getMeta(html, "og:title", "twitter:title") || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "",
      description: getMeta(html, "og:description", "twitter:description", "description"),
      image: getMeta(html, "og:image", "twitter:image"),
      site_name: getMeta(html, "og:site_name"),
      fetched_at: new Date().toISOString(),
    };

    // Upsert into cache
    await supabase.from("link_previews").upsert(preview, { onConflict: "url" });

    return Response.json(preview, { headers: cors });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: cors });
  }
});
