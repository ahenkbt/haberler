import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "wouter";
import { readHmNewsArticleBoot } from "@/lib/fetchHmNewsPageBundle";

type Props = { children: ReactNode; slug?: string };

type State = { error: Error | null };

/**
 * Haber detay render hatası tüm vitrini unmount etmesin (gece temasında boş koyu ekran).
 */
export class HmArticleDetailErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[HmArticleDetail]", error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.slug !== this.props.slug && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const boot = this.props.slug ? readHmNewsArticleBoot(this.props.slug) : undefined;
    const title = String(boot?.article && "title" in boot.article ? boot.article.title : "").trim();
    const spot = String(
      boot?.article && typeof boot.article === "object" && "spot" in boot.article
        ? (boot.article as { spot?: string }).spot || ""
        : "",
    ).trim();
    return (
      <div className="hm-article-detail-page mx-auto max-w-2xl px-4 py-16 text-center">
        {title ? (
          <>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Haber</p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">{title}</h1>
            {spot ? <p className="mt-3 text-sm leading-relaxed text-slate-600">{spot}</p> : null}
          </>
        ) : (
          <p className="text-xl font-bold text-slate-700">Haber şu an görüntülenemedi.</p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => this.setState({ error: null })}
          >
            Tekrar dene
          </button>
          <Link href="/" className="text-sm font-semibold text-slate-600 underline">
            Ana sayfa
          </Link>
        </div>
      </div>
    );
  }
}
