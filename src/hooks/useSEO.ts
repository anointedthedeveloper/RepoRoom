import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
}

const BASE_URL = "https://www.reporoom.site";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

const setMeta = (name: string, nameAttr: "name" | "property", content: string) => {
  let el = document.querySelector<HTMLMetaElement>(`meta[${nameAttr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(nameAttr, name);
    document.head.appendChild(el);
  }
  el.content = content;
};

const useSEO = ({ title, description, path = "/", image = DEFAULT_IMAGE }: SEOProps) => {
  useEffect(() => {
    const fullTitle = `${title} — RepoRoom`;
    const url = `${BASE_URL}${path}`;

    document.title = fullTitle;

    setMeta("description", "name", description);

    // Open Graph
    setMeta("og:title", "property", fullTitle);
    setMeta("og:description", "property", description);
    setMeta("og:url", "property", url);
    setMeta("og:image", "property", image);

    // Twitter
    setMeta("twitter:title", "name", fullTitle);
    setMeta("twitter:description", "name", description);
    setMeta("twitter:image", "name", image);

    // Canonical
    let canonical = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [title, description, path, image]);
};

export default useSEO;
