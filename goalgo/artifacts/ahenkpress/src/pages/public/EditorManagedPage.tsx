import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { readEditorPageFlags, type EditorStandardPageKey } from "@/lib/editorPageFlags";

export function EditorManagedPage({
  pageKey,
  title,
  subtitle,
  children,
}: {
  pageKey: EditorStandardPageKey;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sync = () => setEnabled(readEditorPageFlags()[pageKey]);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("yekpare-editor-flags", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("yekpare-editor-flags", sync);
    };
  }, [pageKey]);

  if (!enabled) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-10">
          <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
          <p className="mt-3 text-sm text-zinc-600">
            Bu sayfa site yöneticisi tarafından devre dışı bırakılmıştır.
          </p>
          <Link href="/" className="inline-block mt-6 text-sm font-semibold text-red-600 hover:underline">
            Anasayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-zinc-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 bg-zinc-950 text-white px-6 py-5 md:px-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Kurumsal</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-zinc-300 max-w-xl">{subtitle}</p> : null}
          </div>
          <div className="px-6 py-8 md:px-8 prose prose-zinc prose-sm max-w-none">{children}</div>
        </div>
      </div>
    </div>
  );
}
