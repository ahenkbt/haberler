import { Node, mergeAttributes } from "@tiptap/core";
import {
  NEWS_GALLERY_DATA_ATTR,
  NEWS_GALLERY_FIGURE_CLASS,
  NEWS_GALLERY_IMAGES_ATTR,
  parseGalleryImagesFromFigureHtml,
} from "@/lib/newsInlineGallery";

export type NewsGalleryOptions = {
  HTMLAttributes: Record<string, unknown>;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    newsGallery: {
      insertNewsGallery: (images: string[]) => ReturnType;
    };
  }
}

export const NewsGalleryExtension = Node.create<NewsGalleryOptions>({
  name: "newsGallery",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      images: {
        default: [] as string[],
        parseHTML: (element) => parseGalleryImagesFromFigureHtml(element.outerHTML),
        renderHTML: (attributes) => {
          const images = (attributes.images as string[]) ?? [];
          if (!images.length) return {};
          return {
            [NEWS_GALLERY_IMAGES_ATTR]: JSON.stringify(images),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `figure[${NEWS_GALLERY_DATA_ATTR}]`,
      },
      {
        tag: `figure.${NEWS_GALLERY_FIGURE_CLASS}`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const images = (node.attrs.images as string[]) ?? [];
    const imgNodes = images.map((src) => [
      "img",
      mergeAttributes({ src, alt: "", class: "ap-news-gallery__img", loading: "lazy" }),
    ]);
    return [
      "figure",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: NEWS_GALLERY_FIGURE_CLASS,
        [NEWS_GALLERY_DATA_ATTR]: "true",
      }),
      ["div", { class: "ap-news-gallery__viewport ap-news-gallery__viewport--editor" }, ...imgNodes],
    ];
  },

  addCommands() {
    return {
      insertNewsGallery:
        (images: string[]) =>
        ({ commands }) => {
          const urls = images.map((s) => s.trim()).filter(Boolean);
          if (!urls.length) return false;
          return commands.insertContent({
            type: this.name,
            attrs: { images: urls },
          });
        },
    };
  },
});
