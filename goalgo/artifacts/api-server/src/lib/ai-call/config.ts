/** USE_NATIVE_AI_CALL=false ile AgentLabs vekiline geri dönülür. */
export function isNativeAiCallEnabled(): boolean {
  const raw = String(process.env.USE_NATIVE_AI_CALL ?? "true").trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "no";
}
