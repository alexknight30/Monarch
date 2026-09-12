import { Extension } from "@tiptap/core";
import "@tiptap/extension-text-style";
import { FONT_DISPLAY_OFFSET, parseTrueFontSize } from "@/lib/doc-font";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

/** TipTap mark attribute for font-size via textStyle. */
export const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              const stored = parseTrueFontSize(
                element.getAttribute("data-font-size"),
              );
              if (stored != null) return `${stored}px`;
              const css = element.style.fontSize?.replace(/['"]+/g, "") || null;
              return css;
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              const trueSize = parseTrueFontSize(String(attributes.fontSize));
              if (trueSize == null) return {};
              return {
                style: `font-size: ${trueSize + FONT_DISPLAY_OFFSET}px`,
                "data-font-size": String(trueSize),
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});
