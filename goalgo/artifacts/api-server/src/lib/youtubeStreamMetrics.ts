import { logger } from "./logger.js";

export type YoutubeStreamMetricEvent =
  | "resolve_miss"
  | "resolve_error"
  | "resolve_ok"
  | "resolve_budget_exceeded"
  | "play_upstream_error"
  | "play_pipe_error";

/** Production izleme — `/play` 404/502 ve çözümleme hataları */
export function logYoutubeStreamMetric(
  event: YoutubeStreamMetricEvent,
  youtubeVideoId: string,
  extra?: Record<string, unknown>,
): void {
  logger.warn(
    {
      streamMetric: true,
      event,
      youtubeVideoId,
      ...extra,
    },
    "[video] youtube-stream metric",
  );
}
