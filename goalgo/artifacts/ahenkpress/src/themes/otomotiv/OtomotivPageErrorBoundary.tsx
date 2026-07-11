import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "wouter";
import { OTOMOTIV } from "./otomotivRoutes";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

export class OtomotivPageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[otomotiv]", this.props.label ?? "page", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <div className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Otomotiv sayfası yüklenemedi</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              İçerik geçici olarak gösterilemiyor. Ana sayfaya dönebilir veya modül vitrinlerini deneyebilirsiniz.
            </p>
            <p className="mt-2 text-xs text-slate-400">{this.state.error.message}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={OTOMOTIV.hub}
                className="rounded-full bg-[#1e3a5f] px-5 py-2.5 text-sm font-black text-white hover:bg-[#152a45]"
              >
                Otomotiv ana sayfa
              </Link>
              <Link
                href={OTOMOTIV.galeri.home}
                className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Galeri
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
