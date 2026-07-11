import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "wouter";
import { ytRoutes } from "@/lib/routes";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[yektube]", this.props.label ?? "route", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center yt-app-bg">
          <p className="text-lg font-semibold text-[var(--color-yt-text)]">Sayfa yüklenemedi</p>
          <p className="max-w-md text-sm text-[var(--color-yt-muted)]">
            {this.state.error.message || "Beklenmeyen bir hata oluştu."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-full border border-[var(--color-yt-border)] px-4 py-2 text-sm font-medium yt-panel-hover"
            >
              Tekrar dene
            </button>
            <Link href={ytRoutes.home()} className="rounded-full yt-btn-primary px-4 py-2 text-sm font-semibold">
              Ana sayfa
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
