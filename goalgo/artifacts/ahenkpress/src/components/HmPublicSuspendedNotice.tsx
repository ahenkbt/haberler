import { HM_PUBLIC_SUSPENDED_PAGE_HTML } from "@/lib/hmPublicSuspendedPage.js";

/** Kamu vitrini askıdayken tüm site kabuğunun yerine geçen Ahenk sayfası. */
export function HmPublicSuspendedNotice() {
  return (
    <iframe
      title="Hizmet Askıya Alındı"
      srcDoc={HM_PUBLIC_SUSPENDED_PAGE_HTML}
      className="fixed inset-0 z-[80] h-[100dvh] w-full border-0 bg-[#080b11]"
      data-hm-public-suspended="true"
    />
  );
}
