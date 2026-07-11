import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles/app.css";
import "./features/admin/adminEmbedLight.css";
import { registerServiceWorker } from "./lib/pwaRegister";
import { installAudioUnlockListeners } from "./lib/audioUnlock";
import { MemberAuthProvider } from "./features/auth/MemberAuth";
import { ThemeProvider } from "./features/theme/ThemeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

registerServiceWorker();
installAudioUnlockListeners();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemberAuthProvider>
          <App />
        </MemberAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
