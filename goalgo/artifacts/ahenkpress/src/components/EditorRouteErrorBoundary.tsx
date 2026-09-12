import { Component, type ReactNode } from "react";
import { Link } from "wouter";

type Props = {
  children: ReactNode;
  fallbackHref?: string;
};

type State = { error: string | null };

/** Keeps an editor-page throw from unmounting the whole HM SPA (blank dark screen). */
export class EditorRouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "render");
    return { error: message.slice(0, 280) };
  }

  componentDidCatch(error: unknown) {
    console.error("[HmEditor] route render failed", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const back = this.props.fallbackHref ?? "/editor/haberler";
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <p className="text-base font-semibold text-slate-900">Editör sayfası yüklenemedi.</p>
        <p className="mt-2 max-w-md text-sm text-slate-600">{this.state.error}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={back}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => this.setState({ error: null })}
          >
            Haberlere dön
          </Link>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
            onClick={() => window.location.reload()}
          >
            Sayfayı yenile
          </button>
        </div>
      </div>
    );
  }
}
