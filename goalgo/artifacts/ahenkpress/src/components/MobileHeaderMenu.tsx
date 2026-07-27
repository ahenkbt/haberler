import { useState } from "react";
import { Link } from "wouter";
import { Heart, Menu, UserRound } from "lucide-react";
import { AppsGridPanel } from "@/components/AppsGridPanel";
import { AuthModal } from "@/components/AuthModal";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

export function MobileHeaderMenu() {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { user } = useCustomerAuth();
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="seh-mobile-menu-btn"
        aria-label="Menü"
        title="Menü"
        aria-expanded={open}
        aria-controls="seh-mobile-menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          id="seh-mobile-menu"
          side="bottom"
          overlayClassName="seh-mobile-menu-overlay"
          className="seh-apps-sheet seh-apps-popup seh-mobile-menu-sheet"
          aria-labelledby="seh-mobile-menu-title"
        >
          <SheetTitle className="sr-only">Tüm kategoriler</SheetTitle>

          <AppsGridPanel
            titleId="seh-mobile-menu-title"
            showActiveState
            onClose={close}
          />

          <div className="seh-mobile-menu-utilities" aria-label="Hesap">
            {user ? (
              <>
                <Link href="/hesabim" className="seh-mobile-menu-util" onClick={close}>
                  <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                  <span>Hesabım</span>
                </Link>
                <Link href="/hesabim" className="seh-mobile-menu-util" onClick={close}>
                  <Heart className="h-4 w-4 shrink-0" aria-hidden />
                  <span>Favoriler</span>
                </Link>
              </>
            ) : (
              <button
                type="button"
                className="seh-mobile-menu-util"
                onClick={() => {
                  close();
                  setAuthOpen(true);
                }}
              >
                <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                <span>Giriş yap</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {authOpen ? <AuthModal onClose={() => setAuthOpen(false)} /> : null}
    </>
  );
}
