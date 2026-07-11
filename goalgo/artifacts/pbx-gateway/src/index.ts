import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { amiClient } from "./ami/ami-client.js";
import { createApp } from "./app.js";
import { config, isAmiConfigured, isSipBridgeConfigured } from "./config.js";
import { attachSipBridgeWebSocket } from "./sip-bridge.js";
import { setAmiConnected, startLivePolling } from "./sse/events.js";
import { store } from "./store/memory-store.js";

const app = createApp();
const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const pathname = req.url?.split("?")[0] ?? "";
  if (pathname === config.wsPath || pathname === "/ws") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      attachSipBridgeWebSocket(ws, req);
    });
    return;
  }
  socket.destroy();
});

async function main(): Promise<void> {
  await store.init();

  if (isAmiConfigured()) {
    const connected = await amiClient.connect();
    setAmiConnected(connected);
    if (connected) {
      console.log(`[pbx-gateway] Asterisk AMI bağlandı: ${config.ami.host}:${config.ami.port}`);
    } else {
      console.warn("[pbx-gateway] AMI bağlantısı kurulamadı — demo modu aktif.");
    }
  }

  startLivePolling();
  httpServer.listen(config.port, () => {
    const demo = config.demoMode || (!isAmiConfigured() && !isSipBridgeConfigured());
    console.log(
      `[pbx-gateway] http://0.0.0.0:${config.port} demo=${demo} ws=${config.wsPath} ami=${isAmiConfigured()} sip=${isSipBridgeConfigured()}`,
    );
  });
}

main().catch((err) => {
  console.error("[pbx-bridge] fatal", err);
  process.exit(1);
});
