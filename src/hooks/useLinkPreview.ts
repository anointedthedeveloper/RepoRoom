import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
  site_name: string;
}

const cache = new Map<string, LinkPreview | null>();
const URL_RE = /(https?:\/\/[^\s]+)/;

export function extractUrl(text: string): string | null {
  return text.match(URL_RE)?.[1] ?? null;
}

export function useLinkPreview(text: string) {
  const url = extractUrl(text);
  const [preview, setPreview] = useState<LinkPreview | null>(cache.get(url ?? "") ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) return;
    if (cache.has(url)) { setPreview(cache.get(url) ?? null); return; }

    setLoading(true);
    supabase.functions
      .invoke("link-preview", { body: { url } })
      .then(({ data, error }) => {
        const result = (!error && data && !data.error) ? data as LinkPreview : null;
        cache.set(url, result);
        setPreview(result);
      })
      .finally(() => setLoading(false));
  }, [url]);

  return { preview, loading, url };
}
