import {
  HM_PUBLIC_SUSPENDED_LINK_HOST,
  HM_PUBLIC_SUSPENDED_NOTICE,
  HM_PUBLIC_SUSPENDED_TITLE,
} from "@/lib/newsSiteLayout";

/** Kamu vitrini askıdayken tüm site kabuğunun yerine geçen sabit yazı. */
export function HmPublicSuspendedNotice() {
  const [before, after] = HM_PUBLIC_SUSPENDED_NOTICE.split(HM_PUBLIC_SUSPENDED_LINK_HOST);
  return (
    <div
      className="flex min-h-[100dvh] w-full items-center justify-center bg-white px-6 py-16"
      data-hm-public-suspended="true"
    >
      <div className="max-w-2xl text-center">
        <h1 className="text-2xl font-black leading-tight text-slate-900">{HM_PUBLIC_SUSPENDED_TITLE}</h1>
        <p className="mt-4 text-lg font-semibold leading-relaxed text-slate-900">
          {before}
          <a className="underline" href={`https://${HM_PUBLIC_SUSPENDED_LINK_HOST}`}>
            {HM_PUBLIC_SUSPENDED_LINK_HOST}
          </a>
          {after}
        </p>
      </div>
    </div>
  );
}
