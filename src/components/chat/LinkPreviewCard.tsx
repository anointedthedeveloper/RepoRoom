import { useState, useEffect } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LinkPreview {
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

interface Props {
  url: string;
  isMine: boolean;
}

const LinkPreviewCard = ({ url, isMine }: Props) => {
  const [preview, setPreview] = useState<LinkPreview | null>(cache.get(url) ?? null);
  const [loading, setLoading] = useState(!cache.has(url));

  useEffect(() => {
    if (cache.has(url)) {
      setPreview(cache.get(url) ?? null);
      setLoading(false);
      return;
    }
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

  if (!loading && !preview) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`mt-2 block rounded-xl overflow-hidden border transition-opacity hover:opacity-90 ${
        isMine ? "border-white/15 bg-white/10" : "border-border bg-card"
      }`}
    >
      {loading && (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading preview…</span>
        </div>
      )}
      {preview && !loading && (
        <>
          {preview.image && (
            <img
              src={preview.image}
              alt={preview.title}
              className="w-full max-h-40 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="px-3 py-2.5 space-y-0.5">
            {preview.site_name && (
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                isMine ? "text-primary-foreground/50" : "text-muted-foreground"
              }`}>{preview.site_name}</p>
            )}
            {preview.title && (
              <p className="text-xs font-semibold line-clamp-2 text-foreground">{preview.title}</p>
            )}
            {preview.description && (
              <p className={`text-[11px] line-clamp-2 ${
                isMine ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}>{preview.description}</p>
            )}
            <p className={`text-[10px] flex items-center gap-1 ${
              isMine ? "text-primary-foreground/40" : "text-muted-foreground/60"
            }`}>
              <ExternalLink className="h-2.5 w-2.5" />
              {new URL(url).hostname}
            </p>
          </div>
        </>
      )}
    </a>
  );
};

export default LinkPreviewCard;
