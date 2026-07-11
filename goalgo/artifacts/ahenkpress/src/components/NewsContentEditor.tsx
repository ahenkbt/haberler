import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link2,
  ImagePlus,
  LayoutGrid,
  Video,
  Link2Off,
  Code2,
  Eye,
  Upload,
  Loader2,
  X,
  Images,
} from "lucide-react";
import { YekpareMediaPickerDialog } from "@/components/YekpareMediaPickerDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { extractApiMediaPath, resolveClientMediaSrc } from "@/lib/apiBase";
import { NewsGalleryExtension } from "@/tiptap/newsGalleryExtension";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";
import { useToast } from "@/hooks/use-toast";

type EditorMode = "visual" | "code";

type Props = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
};

function insertYoutubeFromUrl(editor: Editor, raw: string) {
  const u = raw.trim();
  if (!u) return false;
  return editor.chain().focus().setYoutubeVideo({ src: u }).run();
}

function normalizeGalleryUrls(urls: string[]): string[] {
  return urls
    .map((u) => {
      const t = u.trim();
      if (!t) return "";
      return extractApiMediaPath(t) ?? t;
    })
    .filter(Boolean);
}

export function NewsContentEditor({ value, onChange, className }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<EditorMode>("visual");
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const [mediaOpen, setMediaOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryMediaOpen, setGalleryMediaOpen] = useState(false);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryUrlText, setGalleryUrlText] = useState("");
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Haber metnini yazın veya araç çubuğundan ortam ekleyin…",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-red-600 underline font-medium",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg my-3",
        },
      }),
      NewsGalleryExtension,
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: "w-full max-w-full aspect-video rounded-lg my-4",
        },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[280px] px-3 py-3 focus:outline-none " +
          "prose-headings:font-bold prose-p:my-2 prose-img:rounded-lg",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (modeRef.current !== "visual") return;
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed || mode !== "visual") return;
    const cur = editor.getHTML();
    if (value !== cur) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor, mode]);

  const switchMode = useCallback(
    (next: EditorMode) => {
      if (next === mode) return;
      if (next === "code" && editor) {
        onChange(editor.getHTML());
      }
      setMode(next);
    },
    [mode, editor, onChange],
  );

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

  const runVideo = () => {
    if (!editor) return;
    const raw = window.prompt(
      "Video adresi (YouTube veya Vimeo paylaşım bağlantısı)",
      "https://www.youtube.com/watch?v=",
    );
    if (raw === null || !raw.trim()) return;
    if (!insertYoutubeFromUrl(editor, raw)) {
      window.alert("Bu video adresi eklenemedi. Geçerli bir YouTube / Vimeo URL’si deneyin.");
    }
  };

  const insertGallery = (urls: string[]) => {
    if (!editor) return;
    const normalized = normalizeGalleryUrls(urls);
    if (!normalized.length) return;
    editor.chain().focus().insertNewsGallery(normalized).run();
    setGalleryUrls([]);
    setGalleryOpen(false);
  };

  const mergeGalleryUrls = (incoming: string[]) => {
    const normalized = normalizeGalleryUrls(incoming);
    if (!normalized.length) return;
    setGalleryUrls((prev) => {
      const next = [...prev];
      for (const u of normalized) {
        if (!next.includes(u)) next.push(u);
      }
      return next;
    });
  };

  const appendGalleryUrlsFromText = () => {
    const lines = galleryUrlText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length) return;
    mergeGalleryUrls(lines);
    setGalleryUrlText("");
  };

  const onGalleryFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    setGalleryUploading(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const { url } = await uploadYekpareMediaFile(file);
        added.push(extractApiMediaPath(url) ?? url);
      }
      if (added.length) {
        mergeGalleryUrls(added);
        toast({ title: "Yüklendi", description: `${added.length} görsel galeriye eklendi.` });
      }
    } catch (err) {
      toast({
        title: "Yükleme başarısız",
        description: err instanceof Error ? err.message.slice(0, 160) : String(err),
        variant: "destructive",
      });
    } finally {
      setGalleryUploading(false);
    }
  };

  const openGalleryDialog = () => {
    setGalleryUrls([]);
    setGalleryUrlText("");
    setGalleryOpen(true);
  };

  const tbBtn = (active?: boolean) =>
    cn(
      "h-8 w-8 p-0 shrink-0",
      active ? "bg-slate-200" : "bg-white hover:bg-slate-100",
    );

  return (
    <div className={cn("rounded-md border border-input bg-background overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50/90 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5" title="Biçimlendirme ve ortam (resim, galeri, bağlantı, video)">
          {editor ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={tbBtn(editor.isActive("bold"))}
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
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                title="Alıntı"
              >
                <Quote className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={tbBtn()}
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Yatay çizgi"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-px h-6 bg-slate-200 mx-0.5 hidden sm:block" />
              <Button type="button" variant="ghost" size="sm" className={tbBtn()} onClick={runLink} title="Bağlantı ekle">
                <Link2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={tbBtn()}
                onClick={() => editor.chain().focus().unsetLink().run()}
                title="Bağlantıyı kaldır"
              >
                <Link2Off className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={tbBtn()}
                onClick={() => setMediaOpen(true)}
                title="Resim ekle"
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(tbBtn(), "w-auto px-2 gap-1")}
                onClick={openGalleryDialog}
                title="Foto galeri ekle"
              >
                <LayoutGrid className="h-4 w-4 shrink-0" />
                <span className="text-[11px] font-semibold hidden md:inline">Foto galeri</span>
              </Button>
              <Button type="button" variant="ghost" size="sm" className={tbBtn()} onClick={runVideo} title="Video ekle">
                <Video className="h-4 w-4" />
              </Button>
            </>
          ) : null}
        </div>
        <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-xs font-bold shrink-0">
          <button
            type="button"
            className={cn(
              "flex items-center gap-1 rounded px-2.5 py-1 transition-colors",
              mode === "visual" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50",
            )}
            onClick={() => switchMode("visual")}
          >
            <Eye className="h-3.5 w-3.5" />
            Görsel
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1 rounded px-2.5 py-1 transition-colors",
              mode === "code" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50",
            )}
            onClick={() => switchMode("code")}
          >
            <Code2 className="h-3.5 w-3.5" />
            Kod
          </button>
        </div>
      </div>

      {mode === "visual" ? (
        <EditorContent editor={editor} className="news-tiptap-editor" />
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[320px] rounded-none border-0 font-mono text-sm focus-visible:ring-0 resize-y"
          spellCheck={false}
          placeholder="HTML kaynak kodu…"
        />
      )}

      <p className="text-xs text-muted-foreground px-3 py-1.5 border-t bg-slate-50/50">{value.length} karakter</p>

      <YekpareMediaPickerDialog
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        title="İçeriğe resim ekle"
        onSelect={(url) => {
          const src = extractApiMediaPath(url) ?? url;
          editor?.chain().focus().setImage({ src }).run();
        }}
      />

      <YekpareMediaPickerDialog
        open={galleryMediaOpen}
        onOpenChange={setGalleryMediaOpen}
        multiSelect
        title="Galeri için görseller seç"
        onSelect={() => {}}
        onConfirm={(urls) => mergeGalleryUrls(urls)}
      />

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Foto galeri ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Birden fazla görsel seçin; haber metninde kaydırmalı galeri olarak görünür.
            </p>
            <div className="flex flex-col gap-2">
              <input
                ref={galleryFileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={onGalleryFiles}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={galleryUploading}
                onClick={() => galleryFileRef.current?.click()}
              >
                {galleryUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {galleryUploading ? "Yükleniyor…" : "Dosyadan yükle"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => setGalleryMediaOpen(true)}
              >
                <Images className="h-4 w-4" />
                Yekpare medyadan seç
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">veya URL yapıştırın (her satır bir görsel)</Label>
              <Textarea
                value={galleryUrlText}
                onChange={(e) => setGalleryUrlText(e.target.value)}
                rows={4}
                className="font-mono text-xs"
                placeholder={"https://…/gorsel1.jpg\n/api/media/uploads/…/gorsel2.webp"}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                disabled={!galleryUrlText.trim()}
                onClick={appendGalleryUrlsFromText}
              >
                URL&apos;leri listeye ekle
              </Button>
            </div>
            {galleryUrls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto rounded-md border p-2 bg-slate-50">
                {galleryUrls.map((url) => (
                  <div key={url} className="relative aspect-square rounded overflow-hidden border bg-white">
                    <img
                      src={resolveClientMediaSrc(url) || url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
                      onClick={() => setGalleryUrls((prev) => prev.filter((u) => u !== url))}
                      aria-label="Kaldır"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Henüz görsel seçilmedi.</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setGalleryOpen(false)}>
              İptal
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={galleryUrls.length === 0}
              onClick={() => insertGallery(galleryUrls)}
            >
              Galeriyi ekle ({galleryUrls.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
