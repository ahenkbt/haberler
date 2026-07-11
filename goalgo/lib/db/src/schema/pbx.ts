import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** SIP trunk credentials (Twilio, Netgsm, custom). */
export const pbxTrunksTable = pgTable("pbx_trunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  provider: text("provider").notNull().default(""),
  host: text("host").notNull().default(""),
  username: text("username").notNull().default(""),
  passwordEnc: text("password_enc"),
  register: boolean("register").notNull().default(true),
  outboundCallerId: text("outbound_caller_id").notNull().default(""),
  maxChannels: integer("max_channels").notNull().default(10),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Dahili (extension) SIP accounts. */
export const pbxExtensionsTable = pgTable("pbx_extensions", {
  id: uuid("id").primaryKey().defaultRandom(),
  extension: text("extension").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().default(""),
  sipSecret: text("sip_secret").notNull(),
  /** local | verimor */
  provider: text("provider").notNull().default("local"),
  externalNumber: text("external_number").notNull().default(""),
  verimorQueueNumbers: jsonb("verimor_queue_numbers").notNull().default([]),
  voicemail: boolean("voicemail").notNull().default(true),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pbxQueuesTable = pgTable("pbx_queues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  strategy: text("strategy").notNull().default("ringall"),
  timeoutSec: integer("timeout_sec").notNull().default(30),
  maxlen: integer("maxlen").notNull().default(50),
  musicOnHold: text("music_on_hold").notNull().default("default"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pbxQueueMembersTable = pgTable("pbx_queue_members", {
  queueId: uuid("queue_id")
    .notNull()
    .references(() => pbxQueuesTable.id, { onDelete: "cascade" }),
  extensionId: uuid("extension_id")
    .notNull()
    .references(() => pbxExtensionsTable.id, { onDelete: "cascade" }),
});

export const pbxAgentsTable = pgTable("pbx_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  extensionId: uuid("extension_id").references(() => pbxExtensionsTable.id, { onDelete: "set null" }),
  /** offline | available | on_call | wrap_up | break | paused */
  status: text("status").notNull().default("offline"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pbxAgentQueuesTable = pgTable("pbx_agent_queues", {
  agentId: uuid("agent_id")
    .notNull()
    .references(() => pbxAgentsTable.id, { onDelete: "cascade" }),
  queueId: uuid("queue_id")
    .notNull()
    .references(() => pbxQueuesTable.id, { onDelete: "cascade" }),
});

export const pbxCampaignsTable = pgTable("pbx_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** manual | auto_dial */
  campaignType: text("campaign_type").notNull().default("manual"),
  queueId: uuid("queue_id").references(() => pbxQueuesTable.id, { onDelete: "set null" }),
  /** draft | running | paused | completed */
  status: text("status").notNull().default("draft"),
  dialRatio: integer("dial_ratio").notNull().default(1),
  maxAttempts: integer("max_attempts").notNull().default(3),
  scheduleJson: jsonb("schedule_json"),
  /** ai_only | human_only | hybrid */
  routingMode: text("routing_mode").notNull().default("human_only"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pbxCampaignContactsTable = pgTable("pbx_campaign_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => pbxCampaignsTable.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(),
  name: text("name").notNull().default(""),
  /** pending | dialing | answered | failed | completed */
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pbxIvrFlowsTable = pgTable("pbx_ivr_flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  flowJson: jsonb("flow_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pbxCallLogsTable = pgTable("pbx_call_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  direction: text("direction").notNull().default("outbound"),
  fromNumber: text("from_number").notNull().default(""),
  toNumber: text("to_number").notNull().default(""),
  agentId: uuid("agent_id").references(() => pbxAgentsTable.id, { onDelete: "set null" }),
  queueId: uuid("queue_id").references(() => pbxQueuesTable.id, { onDelete: "set null" }),
  campaignId: uuid("campaign_id").references(() => pbxCampaignsTable.id, { onDelete: "set null" }),
  trunkId: uuid("trunk_id").references(() => pbxTrunksTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("completed"),
  durationSec: integer("duration_sec").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  recordingUrl: text("recording_url"),
  metadataJson: jsonb("metadata_json"),
});

export const pbxSettingsTable = pgTable("pbx_settings", {
  id: integer("id").primaryKey().default(1),
  demoMode: boolean("demo_mode").notNull().default(true),
  sipBridgeUrl: text("sip_bridge_url"),
  sipBridgeWsUrl: text("sip_bridge_ws_url"),
  hybridModeEnabled: boolean("hybrid_mode_enabled").notNull().default(false),
  defaultRoutingMode: text("default_routing_mode").notNull().default("hybrid"),
  defaultPbxQueueId: uuid("default_pbx_queue_id").references(() => pbxQueuesTable.id, { onDelete: "set null" }),
  transferWebhookSecret: text("transfer_webhook_secret"),
  verimorEnabled: boolean("verimor_enabled").notNull().default(false),
  verimorApiKeyEnc: text("verimor_api_key_enc"),
  verimorDomain: text("verimor_domain"),
  verimorWebhookSecret: text("verimor_webhook_secret"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Verimor otomatik arama kampanyası kaydı (OIM'de oluşturulan kampanyalar). */
export const pbxVerimorCampaignsTable = pgTable("pbx_verimor_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  verimorCampaignId: text("verimor_campaign_id").notNull(),
  name: text("name").notNull().default(""),
  callType: text("call_type").notNull().default("queue"),
  queueNumber: integer("queue_number"),
  status: text("status").notNull().default("active"),
  enabled: boolean("enabled").notNull().default(true),
  metadataJson: jsonb("metadata_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Verimor report_event webhook olayları. */
export const pbxVerimorEventsTable = pgTable("pbx_verimor_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull().default(""),
  callerId: text("caller_id").notNull().default(""),
  extension: text("extension").notNull().default(""),
  callUuid: text("call_uuid").notNull().default(""),
  payloadJson: jsonb("payload_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** AI kampanya ↔ PBX kuyruk eşlemesi ve yönlendirme modu. */
export const pbxAiCampaignConfigTable = pgTable("pbx_ai_campaign_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  aiCampaignId: text("ai_campaign_id").notNull().unique(),
  aiCampaignName: text("ai_campaign_name").notNull().default(""),
  routingMode: text("routing_mode").notNull().default("hybrid"),
  pbxQueueId: uuid("pbx_queue_id").references(() => pbxQueuesTable.id, { onDelete: "set null" }),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** AgentLabs'tan gelen bekleyen canlı temsilci aktarımları. */
export const pbxPendingTransfersTable = pgTable("pbx_pending_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalCallId: text("external_call_id").notNull().default(""),
  phone: text("phone").notNull().default(""),
  aiCampaignId: text("ai_campaign_id").notNull().default(""),
  aiCampaignName: text("ai_campaign_name").notNull().default(""),
  queueId: uuid("queue_id").references(() => pbxQueuesTable.id, { onDelete: "set null" }),
  agentId: uuid("agent_id").references(() => pbxAgentsTable.id, { onDelete: "set null" }),
  summary: text("summary").notNull().default(""),
  contextJson: jsonb("context_json").notNull().default({}),
  status: text("status").notNull().default("waiting"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  metadataJson: jsonb("metadata_json").notNull().default({}),
});
