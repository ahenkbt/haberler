import { EditorLayout } from "@/components/EditorLayout";
import { LlmProviderKeysPanel } from "@/components/LlmProviderKeysPanel";
import { useHmEditorOptional } from "@/contexts/HmEditorContext";
import { isHmCorporateLikeTheme } from "@/lib/newsSiteLayout";

export default function EditorYapayZeka() {
  const hm = useHmEditorOptional();
  const corporate = isHmCorporateLikeTheme(hm?.newsLayoutPrefs?.hmVitrinTheme);
  return (
    <EditorLayout title="Yapay zekâ">
      {corporate ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Bu bölüm haber sitelerine özeldir. Kurumsal sitede yapay zekâ anahtarı yönetilmez.
        </p>
      ) : (
        <LlmProviderKeysPanel mode="editor" />
      )}
    </EditorLayout>
  );
}
