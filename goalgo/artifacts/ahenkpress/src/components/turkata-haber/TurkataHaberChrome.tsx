import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { TurkataNewsFooter } from "@/components/turkata-haber/TurkataNewsFooter";
import {
  applyTurkataDocumentSeo,
  TURKATA_BRAND,
  TURKATA_DESCRIPTION,
  TURKATA_STATEMENT,
  TURKATA_WORDMARK,
  turkataSitePath,
  type TurkataArticleSeo,
} from "@/lib/turkataHaber";
import "@/styles/turkataHaber.css";

export function TurkataHaberChrome({
  children,
  subHeader,
  title = TURKATA_BRAND,
  description = TURKATA_DESCRIPTION,
  image,
  article,
}: {
  children: ReactNode;
  subHeader?: ReactNode;
  title?: string;
  description?: string;
  image?: string | null;
  article?: TurkataArticleSeo | null;
}) {
  useEffect(() => {
    const path = typeof window !== "undefined" ? window.location.pathname : "/";
    applyTurkataDocumentSeo({
      title,
      description,
      path,
      image: image || article?.imageUrl,
      article,
    });
  }, [title, description, image, article]);

  const home = turkataSitePath("/");

  return (
    <div className="turkata-haber">
      <header className="turkata-haber-header">
        <div className="turkata-haber-header-inner">
          <Link href={home} className="turkata-haber-brand" aria-label={TURKATA_BRAND}>
            <img src={TURKATA_WORDMARK} alt="TürkAta Haber Ajansı" width={220} height={44} />
          </Link>
          <nav className="turkata-haber-nav" aria-label="Site">
            <Link href={home}>Gündem</Link>
            <Link href={turkataSitePath("/hakkimizda")}>Hakkımızda</Link>
            <Link href={turkataSitePath("/kunye")}>Künye</Link>
            <Link href={turkataSitePath("/iletisim")}>İletişim</Link>
          </nav>
        </div>
        {subHeader ? <div className="turkata-haber-cats">{subHeader}</div> : null}
      </header>
      {children}
      <p className="turkata-statement-bar">{TURKATA_STATEMENT}</p>
      <TurkataNewsFooter />
    </div>
  );
}
