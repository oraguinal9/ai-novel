import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ai.zbjh.top";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: base + "/play", lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: base + "/help", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: base + "/account", lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];
}
