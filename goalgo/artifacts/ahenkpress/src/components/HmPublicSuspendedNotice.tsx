import { HM_PUBLIC_SUSPENDED_NOTICE } from "@/lib/newsSiteLayout";

/** Kamu vitrini askıdayken tüm site kabuğunun yerine geçen sabit yazı. */
export function HmPublicSuspendedNotice() {
  const email = "ahenkbt@gmail.com";
  const [before, after] = HM_PUBLIC_SUSPENDED_NOTICE.split(email);
  return (
    <div
      className="flex min-h-[100dvh] w-full items-center justify-center bg-white px-6 py-16"
      data-hm-public-suspended="true"
    >
      <p className="max-w-xl text-center text-lg font-semibold leading-relaxed text-slate-900">
        {before}
        <a className="underline" href={`mailto:${email}`}>
          {email}
        </a>
        {after}
      </p>
    </div>
  );
}
