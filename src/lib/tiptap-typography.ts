import { Extension, textInputRule } from "@tiptap/core";

/**
 * `--` → em dash, `-->` → right arrow.
 * `--` converts as soon as the second dash is typed; typing `>` after that
 * still becomes an arrow via the em-dash + `>` rule.
 */
export const TypographyShortcuts = Extension.create({
  name: "typographyShortcuts",

  addInputRules() {
    return [
      textInputRule({ find: /-->$/, replace: "→" }),
      textInputRule({ find: /—>$/, replace: "→" }),
      textInputRule({ find: /--$/, replace: "—" }),
    ];
  },
});
