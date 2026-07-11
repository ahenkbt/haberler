import type { YektubeVideo } from "@workspace/yektube-core";

export type KidsCategory = {
  id: string;
  label: string;
  keywords?: string[];
};

export const KIDS_CATEGORIES: KidsCategory[] = [
  { id: "onerilen", label: "Önerilen", keywords: [] },
  { id: "muzik", label: "Müzik", keywords: ["müzik", "music", "song", "şarkı", "nursery", "lullaby"] },
  { id: "kesfet", label: "Keşfet", keywords: ["keşfet", "explore", "macera", "adventure", "fun"] },
  { id: "ogrenme", label: "Öğrenme", keywords: ["öğren", "learn", "eğitim", "education", "okul", "alphabet", "sayı"] },
  { id: "sovlar", label: "Şovlar", keywords: ["show", "şov", "episode", "bölüm", "dizi", "cartoon", "çizgi"] },
];

function haystack(video: YektubeVideo): string {
  return `${video.title ?? ""} ${video.channelName ?? ""} ${video.description ?? ""}`.toLowerCase();
}

function keywordMatches(text: string, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;
  if (kw.includes(" ")) return text.includes(kw);
  return new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

export function matchesKidsCategory(video: YektubeVideo, categoryId: string): boolean {
  if (categoryId === "onerilen" || categoryId === "all") return true;
  const cat = KIDS_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat?.keywords?.length) return true;
  const text = haystack(video);
  return cat.keywords.some((kw) => keywordMatches(text, kw));
}

export function filterVideosByKidsCategory(videos: YektubeVideo[], categoryId: string): YektubeVideo[] {
  if (categoryId === "all" || categoryId === "onerilen") return videos;
  return videos.filter((v) => matchesKidsCategory(v, categoryId));
}
