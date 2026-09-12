/**
 * Yektube Worker entry (wrangler.yektube.toml).
 * Reuses the shared fetch handler from worker.js; exports only
 * YektubeApiContainer so this Worker’s DO migration stays isolated from
 * haberler’s GoalgoApiContainer.
 *
 * Traffic isolation: routes are only yektube.com / www.yektube.com.
 * CPU isolation: separate [[containers]] max_instances on this Worker.
 * HM-only edge paths in worker.js are no-ops when Host is yektube.com.
 */
export { default } from "./worker.js";
export { YektubeApiContainer } from "./goalgo-api-container.js";
