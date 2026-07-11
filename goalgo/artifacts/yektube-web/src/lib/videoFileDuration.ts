import { YEKCEK_MAX_DURATION_SECONDS } from "@/lib/yektubeVideoClassify";

/** Yerel video dosyasının süresini saniye olarak okur */
export function readVideoFileDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const sec = video.duration;
      if (!Number.isFinite(sec) || sec <= 0) {
        reject(new Error("Video süresi okunamadı."));
        return;
      }
      resolve(sec);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Video dosyası okunamadı."));
    };
    video.src = url;
  });
}

export function assertYekcekDuration(seconds: number): void {
  if (seconds > YEKCEK_MAX_DURATION_SECONDS) {
    throw new Error(`Yekçek videoları en fazla ${YEKCEK_MAX_DURATION_SECONDS / 60} dakika olabilir.`);
  }
}
