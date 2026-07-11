import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3099),
  demoMode: String(process.env.PBX_DEMO_MODE ?? "true").toLowerCase() !== "false",
  jwtSecret: String(process.env.PBX_JWT_SECRET ?? process.env.PBX_AGENT_JWT_SECRET ?? "dev-pbx-secret-change-me"),
  /** @deprecated use jwtSecret */
  agentJwtSecret: String(process.env.PBX_JWT_SECRET ?? process.env.PBX_AGENT_JWT_SECRET ?? "dev-pbx-secret-change-me"),
  apiServerUrl: String(process.env.API_SERVER_URL ?? process.env.PBX_API_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, ""),
  wsPath: String(process.env.PBX_WS_PATH ?? "/ws"),
  sip: {
    localUri: String(process.env.PBX_SIP_LOCAL_URI ?? "sip:pbx@yekpare.net"),
    trunkHost: String(process.env.PBX_SIP_TRUNK_HOST ?? "").trim(),
    wsPort: Number(process.env.PBX_SIP_WS_PORT ?? 8090),
  },
  ami: {
    host: String(process.env.ASTERISK_AMI_HOST ?? "").trim(),
    port: Number(process.env.ASTERISK_AMI_PORT ?? 5038),
    user: String(process.env.ASTERISK_AMI_USER ?? "").trim(),
    pass: String(process.env.ASTERISK_AMI_PASS ?? "").trim(),
  },
};

export function isSipBridgeConfigured(): boolean {
  return Boolean(config.sip.trunkHost);
}

export function isAmiConfigured(): boolean {
  return Boolean(config.ami.host && config.ami.user && config.ami.pass);
}
