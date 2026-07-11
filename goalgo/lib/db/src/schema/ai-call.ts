import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pbxTrunksTable } from "./pbx";

export const aiCallSettingsTable = pgTable("ai_call_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  openaiApiKeyEnc: text("openai_api_key_enc"),
  geminiApiKeyEnc: text("gemini_api_key_enc"),
  defaultProvider: text("default_provider").notNull().default("openai"),
  defaultModel: text("default_model").notNull().default("gpt-4o-mini"),
  demoMode: boolean("demo_mode").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiCallAssistantsTable = pgTable("ai_call_assistants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  systemPrompt: text("system_prompt").notNull().default(""),
  voice: text("voice").notNull().default("alloy"),
  provider: text("provider").notNull().default("openai"),
  model: text("model").notNull().default("gpt-4o-mini"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiCallCampaignsTable = pgTable("ai_call_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  assistantId: uuid("assistant_id").references(() => aiCallAssistantsTable.id, { onDelete: "set null" }),
  trunkId: uuid("trunk_id").references(() => pbxTrunksTable.id, { onDelete: "set null" }),
  contactListJson: jsonb("contact_list_json").notNull().default([]),
  scheduleJson: jsonb("schedule_json"),
  routingMode: text("routing_mode").notNull().default("ai_only"),
  status: text("status").notNull().default("draft"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiCallContactsTable = pgTable("ai_call_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => aiCallCampaignsTable.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(),
  name: text("name").notNull().default(""),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastCalledAt: timestamp("last_called_at", { withTimezone: true }),
  metadataJson: jsonb("metadata_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiCallLogsTable = pgTable("ai_call_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").references(() => aiCallCampaignsTable.id, { onDelete: "set null" }),
  contactId: uuid("contact_id").references(() => aiCallContactsTable.id, { onDelete: "set null" }),
  assistantId: uuid("assistant_id").references(() => aiCallAssistantsTable.id, { onDelete: "set null" }),
  phone: text("phone").notNull().default(""),
  direction: text("direction").notNull().default("outbound"),
  status: text("status").notNull().default("completed"),
  durationSec: integer("duration_sec").notNull().default(0),
  provider: text("provider").notNull().default(""),
  model: text("model").notNull().default(""),
  transcript: text("transcript").notNull().default(""),
  aiSummary: text("ai_summary").notNull().default(""),
  transferred: boolean("transferred").notNull().default(false),
  metadataJson: jsonb("metadata_json").notNull().default({}),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const aiCallFlowsTable = pgTable("ai_call_flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  flowJson: jsonb("flow_json").notNull().default({}),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
