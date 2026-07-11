import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";
import { extractApiMediaPath, toPersistedPublicMediaUrl } from "@/lib/apiBase";
import {
  Bold,
  Braces,
  ImageIcon,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Loader2,
  Quote,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditorHmHtmlPreview } from "@/components/EditorHmHtmlPreview";
import { looksLikeHmRichPageHtml } from "@/lib/prepareHmCustomPageBodyHtml";
import { cn } from "@/lib/utils";

function insertSnippetAtCursor(value: string, start: number | null | undefined, end: number | null | undefined, snippet: string) {
  const s = typeof start === "number" ? start : value.length;
  const e = typeof end === "number" ? end : value.length;
  return value.slice(0, s) + snippet + value.slice(e);
}

function isTemplateLockedHtml(value: string, importSource?: string | null): boolean {
  if (importSource === "wordpress-template") return true;
  return looksLikeHmRichPageHtml(value);
}

function HmPageWysiwygEditor({
  value,
  onChange,
  disabled,
  minHeightClass,
  onEditorReady,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  minHeightClass: string;
  onEditorReady?: (editor: Editor | null) => void;
}) {
  const tabActiveRef = useRef(true);

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Sayfa metnini yazın…",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-red-600 underline",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg my-3",
        },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none px-3 py-3 focus:outline-none",
          "prose-headings:font-bold prose-p:my-2 prose-img:rounded-lg",
          minHeightClass,
        ),
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (!tabActiveRef.current) return;
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  useEffect(() => {
    tabActiveRef.current = true;
    return () => {
      tabActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const cur = editor.getHTML();
    if (value !== cur) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  const runLink = () => {
    if (!editor) return;
    const prev = window.prompt("Bağlantı URL (https://…)", "https://");
    if (prev === null) return;
    const url = prev.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const tbBtn = (active?: boolean) =>
    cn("h-8 w-8 p-0 shrink-0", active ? "bg-slate-200" : "bg-white hover:bg-slate-100");

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-slate-50/90 px-2 py-1.5">
        {editor ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={tbBtn(editor.isActive("bold"))}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Kalın"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={tbBtn(editor.isActive("italic"))}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="İtalik"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={tbBtn(editor.isActive("bulletList"))}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Madde işaretli liste"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={tbBtn(editor.isActive("orderedList"))}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numaralı liste"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={tbBtn(editor.isActive("blockquote"))}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Alıntı"
            >
              <Quote className="h-4 w-4" />
            </Button>
            <span className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block" />
            <Button type="button" variant="ghost" size="sm" className={tbBtn()} disabled={disabled} onClick={runLink} title="Bağlantı ekle">
              <Link2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={tbBtn()}
              disabled={disabled}
              onClick={() => editor.chain().focus().unsetLink().run()}
              title="Bağlantıyı kaldır"
            >
              <Link2Off className="h-4 w-4" />
            </Button>
          </>
        ) : null}
      </div>
      <EditorContent editor={editor} className="news-tiptap-editor" />
    </div>
  );
}

export function EditorHmHtmlField({
  idPrefix,
  label,
  value,
  onChange,
  disabled,
  minHeightClass = "min-h-[220px]",
  corporatePreview = false,
  previewSite,
  importSource,
}: {
  idPrefix: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  minHeightClass?: string;
  /** Kurumsal vitrin ile aynı önizleme (CSS + head içi stiller). */
  corporatePreview?: boolean;
  previewSite?: { id: number; slug: string; domain?: string | null };
  /** WordPress şablon içe aktarımı — WYSIWYG yerine salt okunur önizleme. */
  importSource?: string | null;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const wysiwygEditorRef = useRef<Editor | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<string>("onizleme");

  const templateLocked = isTemplateLockedHtml(value, importSource);

  const flushWysiwygToValue = useCallback(() => {
    const ed = wysiwygEditorRef.current;
    if (!ed || ed.isDestroyed || templateLocked) return;
    const html = ed.getHTML();
    if (html !== value) onChange(html);
  }, [onChange, templateLocked, value]);

  const handleTabChange = (next: string) => {
    if (tab === "onizleme" && next !== "onizleme") {
      flushWysiwygToValue();
    }
    if (next === "onizleme" && wysiwygEditorRef.current && !wysiwygEditorRef.current.isDestroyed && !templateLocked) {
      wysiwygEditorRef.current.commands.setContent(value || "", false);
    }
    setTab(next);
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      toast({ title: "Görsel seçin", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadYekpareMediaFile(file);
      const abs = toPersistedPublicMediaUrl(url);
      const src = extractApiMediaPath(abs) ?? abs;
      const ed = wysiwygEditorRef.current;
      if (tab === "onizleme" && ed && !ed.isDestroyed && !templateLocked) {
        ed.chain().focus().setImage({ src }).run();
        onChange(ed.getHTML());
        toast({ title: "Görsel eklendi" });
      } else {
        const snippet = `\n<p><img src="${abs.replace(/"/g, "&quot;")}" alt="" loading="lazy" class="max-w-full rounded-lg" /></p>\n`;
        const ta = taRef.current;
        const next = insertSnippetAtCursor(value, ta?.selectionStart, ta?.selectionEnd, snippet);
        onChange(next);
        toast({ title: "Görsel eklendi", description: "HTML içine yerleştirildi." });
      }
    } catch (err) {
      toast({
        title: "Yükleme başarısız",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const appendCodeBlock = () => {
    const snippet = `\n<pre><code>// Kodunuzu buraya yazın\n</code></pre>\n`;
    const ed = wysiwygEditorRef.current;
    if (tab === "onizleme" && ed && !ed.isDestroyed && !templateLocked) {
      ed.chain().focus().insertContent(snippet).run();
      onChange(ed.getHTML());
      return;
    }
    const ta = taRef.current;
    const next = insertSnippetAtCursor(value, ta?.selectionStart, ta?.selectionEnd, snippet);
    onChange(next);
    setTab("duzenle");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={`${idPrefix}-html`} className="text-slate-900">
          {label}
        </Label>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(ev) => void onPickFile(ev)} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
            Resim ekle
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" disabled={disabled} onClick={appendCodeBlock}>
            <Braces className="h-3.5 w-3.5" />
            Kod kutusu
          </Button>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-amber-700">
        {templateLocked
          ? "Bu sayfa şablon HTML kullanıyor. Düzenlemek için HTML veya Kod sekmesini kullanın; Görünüm yalnızca önizleme gösterir."
          : "Görünüm sekmesinde WordPress benzeri zengin metin düzenleyici kullanılır. Gelişmiş HTML için HTML veya Kod sekmesine geçin."}
      </p>

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-slate-100">
          <TabsTrigger value="onizleme" className="text-xs">
            Görünüm
          </TabsTrigger>
          <TabsTrigger value="duzenle" className="text-xs">
            HTML
          </TabsTrigger>
          <TabsTrigger value="kod" className="text-xs">
            Kod
          </TabsTrigger>
        </TabsList>
        <TabsContent value="onizleme" className="mt-2">
          {templateLocked ? (
            corporatePreview && previewSite ? (
              <EditorHmHtmlPreview html={value} corporate site={previewSite} />
            ) : (
              <div
                className={`rounded-lg border border-slate-200 bg-white p-4 prose prose-sm max-w-none ${minHeightClass} overflow-auto`}
                dangerouslySetInnerHTML={{ __html: value || "<p class='text-slate-400'>Önizleme için HTML girin.</p>" }}
              />
            )
          ) : (
            <HmPageWysiwygEditor
              value={value}
              onChange={onChange}
              disabled={disabled}
              minHeightClass={minHeightClass}
              onEditorReady={(ed) => {
                wysiwygEditorRef.current = ed;
              }}
            />
          )}
        </TabsContent>
        <TabsContent value="duzenle" className="mt-2">
          <Textarea
            ref={taRef}
            id={`${idPrefix}-html`}
            className={`font-serif text-sm ${minHeightClass}`}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
        </TabsContent>
        <TabsContent value="kod" className="mt-2">
          <Textarea
            className={`font-mono text-xs leading-relaxed ${minHeightClass} whitespace-pre`}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
