import { useEffect, useState } from "react";
import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { apiUrl } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { useToast } from "@/hooks/use-toast";
import { UserRound } from "lucide-react";

async function editorPatch(path: string, body: Record<string, unknown>) {
  const token = readHmJwt();
  if (!token) throw new Error("Oturum yok");
  const res = await fetch(apiUrl(path), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean; editor?: unknown };
  if (!res.ok) throw new Error(j.error || res.statusText);
  return j;
}

export default function EditorProfil() {
  const { editor, site, refreshMe } = useHmEditor();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [nextPw2, setNextPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    setDisplayName(editor?.displayName ?? "");
    setEmail(editor?.email ?? "");
    setUsername((editor as { username?: string | null } | null)?.username ?? "");
  }, [editor?.displayName, editor?.email, editor]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailChanged = email.trim().toLowerCase() !== String(editor?.email ?? "").toLowerCase();
    const usernameChanged =
      username.trim().toLowerCase() !==
      String((editor as { username?: string | null } | null)?.username ?? "")
        .trim()
        .toLowerCase();
    if ((emailChanged || usernameChanged) && !profilePassword) {
      toast({ title: "E-posta veya kullanıcı adı için mevcut şifre gerekli", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      await editorPatch("/api/hm/editor/me", {
        displayName,
        email,
        username,
        ...(emailChanged || usernameChanged ? { currentPassword: profilePassword } : {}),
      });
      setProfilePassword("");
      await refreshMe();
      toast({ title: "Profil güncellendi" });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Kaydedilemedi",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nextPw.length < 8) {
      toast({ title: "Yeni şifre en az 8 karakter", variant: "destructive" });
      return;
    }
    if (nextPw !== nextPw2) {
      toast({ title: "Yeni şifreler eşleşmiyor", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    try {
      await editorPatch("/api/hm/editor/me/password", {
        currentPassword: currentPw,
        newPassword: nextPw,
      });
      setCurrentPw("");
      setNextPw("");
      setNextPw2("");
      toast({
        title: "Şifre güncellendi",
        description: "Aynı e-postalı diğer siteleriniz de senkronlandı.",
      });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Şifre güncellenemedi",
        variant: "destructive",
      });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <EditorLayout title="Profil">
      <div className="p-4 md:p-6 max-w-xl space-y-8">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-slate-500" />
            Hesabım
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {site?.displayName ? `${site.displayName} — ` : ""}
            site sahibi profili. E-posta veya kullanıcı adı ile giriş yapabilirsiniz.
          </p>
        </div>

        <form onSubmit={saveProfile} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Profil</h2>
          <div>
            <Label>Görünen ad</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1"
              placeholder="Adınız"
            />
          </div>
          <div>
            <Label>E-posta</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label>Kullanıcı adı</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1"
              placeholder="ornek: sehirgazetesi"
              autoComplete="username"
            />
            <p className="mt-1 text-xs text-slate-500">
              En az 3 karakter. Girişte e-posta yerine kullanılabilir.
            </p>
          </div>
          <div>
            <Label>Mevcut şifre (e-posta / kullanıcı adı değişince)</Label>
            <Input
              type="password"
              value={profilePassword}
              onChange={(e) => setProfilePassword(e.target.value)}
              className="mt-1"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={savingProfile} className="bg-slate-900 text-white">
            {savingProfile ? "Kaydediliyor…" : "Profili kaydet"}
          </Button>
        </form>

        <form onSubmit={savePassword} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Şifre değiştir</h2>
          <div>
            <Label>Mevcut şifre</Label>
            <Input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="mt-1"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label>Yeni şifre</Label>
            <Input
              type="password"
              value={nextPw}
              onChange={(e) => setNextPw(e.target.value)}
              className="mt-1"
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label>Yeni şifre (tekrar)</Label>
            <Input
              type="password"
              value={nextPw2}
              onChange={(e) => setNextPw2(e.target.value)}
              className="mt-1"
              required
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={savingPw} className="bg-red-600 hover:bg-red-700 text-white">
            {savingPw ? "Kaydediliyor…" : "Şifreyi güncelle"}
          </Button>
        </form>
      </div>
    </EditorLayout>
  );
}
