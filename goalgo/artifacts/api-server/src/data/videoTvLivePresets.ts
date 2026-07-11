/**
 * Hazır YouTube canlı yayın kaynakları — doğrudan watch?v= video ID ile oynatılır.
 */
export type VideoTvLivePreset = {
  name: string;
  videoId: string;
  category: string;
  logoUrl?: string;
};

export const VIDEO_TV_LIVE_PRESETS: VideoTvLivePreset[] = [
  { name: "Haber Global", videoId: "EqoCJ8BPxtE", category: "haberler" },
  { name: "TGRT Haber", videoId: "WX29nlgdqho", category: "haberler" },
  { name: "A Haber", videoId: "v1Eww2tZwb4", category: "haberler" },
  { name: "Kanal 7", videoId: "nL8WXo7FWSs", category: "haberler" },
  { name: "ÜLKE TV", videoId: "Dq2cTP4HPEM", category: "haberler" },
  { name: "Bengü Türk", videoId: "W-wgfi-XdN8", category: "haberler" },
  { name: "Kral Akustik TV", videoId: "O_-NjHABJIg", category: "muzik" },
  { name: "HT Spor", videoId: "gcWaPe_LBMc", category: "spor" },
  { name: "beIN SPORTS Haber", videoId: "i7UpPgxfZZ8", category: "spor" },
  { name: "A Spor", videoId: "jsFa02l5KIs", category: "spor" },
  { name: "Dream Flow", videoId: "VDSXeNkLnO4", category: "muzik" },
  { name: "TVNET", videoId: "Z5bqy4gwEmc", category: "haberler" },
  { name: "Ulusal Kanal TV", videoId: "Gcxkjxhbhk8", category: "haberler" },
  { name: "Akit TV", videoId: "ds7aS4H1fbs", category: "haberler" },
  { name: "24 TV", videoId: "6B-nPOdP720", category: "haberler" },
  { name: "Bloomberg HT", videoId: "hHSmBJk6w0c", category: "haberler" },
  { name: "Lider Haber", videoId: "tU7fpiiGNOw", category: "haberler" },
  { name: "A Para", videoId: "6-Q8v_e-M2g", category: "haberler" },
  { name: "A News", videoId: "L4O-IO_dySQ", category: "haberler" },
  { name: "A Haber Canlı 2", videoId: "wOFmrMgAcsE", category: "haberler" },
];

export function livePresetThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId.trim()}/hqdefault.jpg`;
}
