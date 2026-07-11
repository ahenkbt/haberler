import net from "node:net";
import { EventEmitter } from "node:events";
import { config, isAmiConfigured } from "../config.js";
import type { LiveAgentRow, LiveQueueRow } from "../types.js";
import { agentStatusLabelTr, store } from "../store/memory-store.js";

type AmiEvent = Record<string, string>;

export class AmiClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private buffer = "";
  private connected = false;
  private actionId = 0;
  private pending = new Map<string, { resolve: (v: AmiEvent[]) => void; reject: (e: Error) => void; events: AmiEvent[] }>();

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<boolean> {
    if (!isAmiConfigured()) return false;
    if (this.connected) return true;

    return new Promise((resolve) => {
      const socket = net.createConnection({ host: config.ami.host, port: config.ami.port }, () => {
        this.socket = socket;
      });

      const fail = () => {
        this.cleanup();
        resolve(false);
      };

      socket.setTimeout(8000, fail);

      socket.on("data", (chunk) => this.onData(chunk.toString()));
      socket.on("error", fail);
      socket.on("close", () => {
        this.connected = false;
        this.emit("disconnected");
      });

      socket.once("data", () => {
        this.sendAction("Login", {
          Username: config.ami.user,
          Secret: config.ami.pass,
        })
          .then((events) => {
            const resp = events.find((e) => e.Response);
            if (resp?.Response === "Success") {
              this.connected = true;
              socket.setTimeout(0);
              this.emit("connected");
              resolve(true);
            } else {
              fail();
            }
          })
          .catch(fail);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      try {
        this.socket.end();
      } catch {
        /* ignore */
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.socket = null;
    this.connected = false;
    this.buffer = "";
    for (const [, p] of this.pending) {
      p.reject(new Error("AMI bağlantısı kapandı"));
    }
    this.pending.clear();
  }

  private onData(text: string): void {
    this.buffer += text;
    let idx: number;
    while ((idx = this.buffer.indexOf("\r\n\r\n")) >= 0) {
      const block = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 4);
      const event = this.parseBlock(block);
      if (!event) continue;

      const actionId = event.ActionID;
      if (actionId && this.pending.has(actionId)) {
        const p = this.pending.get(actionId)!;
        p.events.push(event);
        if (event.Event === "QueueStatusComplete" || event.Response) {
          if (event.Response && event.Response !== "Success" && p.events.length === 1) {
            this.pending.delete(actionId);
            p.reject(new Error(event.Message ?? "AMI hatası"));
          } else if (event.Event === "QueueStatusComplete" || (event.Response && p.events.length > 0)) {
            if (event.Event !== "QueueStatusComplete" && event.Response) {
              /* wait for complete event */
            } else {
              this.pending.delete(actionId);
              p.resolve(p.events);
            }
          }
        }
      } else if (event.Event) {
        this.emit("event", event);
      }
    }
  }

  private parseBlock(block: string): AmiEvent | null {
    const lines = block.split("\r\n").filter(Boolean);
    if (!lines.length) return null;
    const event: AmiEvent = {};
    for (const line of lines) {
      const sep = line.indexOf(":");
      if (sep < 0) continue;
      event[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
    }
    return event;
  }

  sendAction(action: string, fields: Record<string, string> = {}): Promise<AmiEvent[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("AMI bağlı değil"));
        return;
      }
      const id = String(++this.actionId);
      this.pending.set(id, { resolve, reject, events: [] });
      const lines = [`Action: ${action}`, `ActionID: ${id}`];
      for (const [k, v] of Object.entries(fields)) {
        lines.push(`${k}: ${v}`);
      }
      lines.push("", "");
      this.socket.write(lines.join("\r\n"));
      setTimeout(() => {
        if (this.pending.has(id)) {
          const p = this.pending.get(id)!;
          this.pending.delete(id);
          p.resolve(p.events);
        }
      }, 5000);
    });
  }

  async fetchLiveQueues(): Promise<LiveQueueRow[] | null> {
    if (!this.connected) return null;
    try {
      const events = await this.sendAction("QueueStatus");
      const queues = new Map<string, LiveQueueRow>();
      for (const ev of events) {
        if (ev.Event === "QueueParams") {
          queues.set(ev.Queue, {
            queueId: ev.Queue,
            queueName: ev.Queue,
            waiting: Number(ev.Calls ?? 0),
            longestWaitSec: Number(ev.Holdtime ?? 0),
            agentsLoggedIn: 0,
            agentsAvailable: 0,
            agentsOnCall: 0,
            callsAnsweredToday: Number(ev.Completed ?? 0),
            callsAbandonedToday: Number(ev.Abandoned ?? 0),
            serviceLevelPct: Number(ev.ServiceLevelPerf ?? 0),
          });
        }
        if (ev.Event === "QueueMember") {
          const q = queues.get(ev.Queue);
          if (!q) continue;
          q.agentsLoggedIn += 1;
          if (ev.Status === "1") q.agentsAvailable += 1;
          if (ev.InCall === "1") q.agentsOnCall += 1;
        }
      }
      return [...queues.values()];
    } catch {
      return null;
    }
  }

  async fetchLiveAgents(): Promise<LiveAgentRow[] | null> {
    if (!this.connected) return null;
    try {
      const events = await this.sendAction("QueueStatus");
      const rows: LiveAgentRow[] = [];
      for (const ev of events) {
        if (ev.Event !== "QueueMember") continue;
        const status = ev.InCall === "1" ? "on_call" : ev.Status === "1" ? "available" : "paused";
        rows.push({
          agentId: ev.Name ?? ev.Location ?? randomId(),
          displayName: ev.Name ?? ev.Location ?? "Temsilci",
          extension: ev.Location?.replace(/^SIP\//, "").split("-")[0] ?? null,
          status,
          statusLabelTr: agentStatusLabelTr(status),
          currentCall: ev.InCall === "1" ? ev.Call ?? null : null,
          queueNames: [ev.Queue],
          loginDurationSec: Number(ev.LastCall ?? 0),
          callsHandledToday: Number(ev.CallsTaken ?? 0),
        });
      }
      return rows.length ? rows : null;
    } catch {
      return null;
    }
  }
}

function randomId(): string {
  return `ami-${Math.random().toString(36).slice(2, 9)}`;
}

export const amiClient = new AmiClient();

export async function getLiveQueues(demoMode: boolean): Promise<LiveQueueRow[]> {
  if (!demoMode) {
    const live = await amiClient.fetchLiveQueues();
    if (live?.length) return live;
  }
  return store.demoLiveQueue;
}

export async function getLiveAgents(demoMode: boolean): Promise<LiveAgentRow[]> {
  if (!demoMode) {
    const live = await amiClient.fetchLiveAgents();
    if (live?.length) return live;
  }
  store.refreshDemoLiveAgents();
  return store.demoLiveAgents;
}
