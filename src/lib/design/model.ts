export type Breakpoint = "all" | "mobile" | "tablet" | "desktop";
export type DesignRule = {
  id: string;
  node: string;
  page: string;
  instance?: { node: string; key: string }[];
  breakpoint: Breakpoint;
  state: "normal" | "hover" | "focus";
  style: Record<string, string>;
  text?: string;
};
export type DesignDocument = { version: 1; rules: DesignRule[] };
export const EMPTY_DESIGN: DesignDocument = { version: 1, rules: [] };
export const PROPERTIES = ["width", "height", "min-width", "max-width", "min-height", "max-height", "padding", "padding-top", "padding-right", "padding-bottom", "padding-left", "margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "gap", "row-gap", "column-gap", "display", "position", "top", "left", "right", "bottom", "translate", "rotate", "z-index", "order", "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis", "align-items", "align-self", "justify-content", "grid-template-columns", "grid-column", "grid-row", "color", "background-color", "background-image", "border-color", "border-width", "border-style", "border-radius", "box-shadow", "opacity", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-align", "text-transform", "text-decoration", "overflow", "object-fit", "aspect-ratio", "visibility", "clip-path"] as const;
const allowed = new Set<string>(PROPERTIES);
const nodePattern = /^m-[a-f0-9]{12}$/;
export function validateDesign(input: unknown): DesignDocument {
  if (!input || typeof input !== "object") throw new Error("Invalid design document.");
  const doc = input as DesignDocument;
  if (doc.version !== 1 || !Array.isArray(doc.rules) || doc.rules.length > 5000) throw new Error("Invalid design version or rule count.");
  const ids = new Set<string>();
  for (const rule of doc.rules) {
    if (!rule || typeof rule.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(rule.id) || ids.has(rule.id)) throw new Error("Invalid or duplicate rule identity.");
    ids.add(rule.id);
    if (!nodePattern.test(rule.node) || typeof rule.page !== "string" || rule.page.length > 1000 || !(rule.page === "*" || rule.page.startsWith("/"))) throw new Error("Invalid page or element.");
    if (!["all", "mobile", "tablet", "desktop"].includes(rule.breakpoint) || !["normal", "hover", "focus"].includes(rule.state)) throw new Error("Invalid responsive setting.");
    if (rule.instance && (!Array.isArray(rule.instance) || rule.instance.length > 20 || rule.instance.some(x => !x || !nodePattern.test(x.node) || typeof x.key !== "string" || x.key.length > 300))) throw new Error("Invalid instance.");
    if (rule.text !== undefined && (typeof rule.text !== "string" || rule.text.length > 10000 || rule.instance?.length || rule.breakpoint !== "all" || rule.state !== "normal")) throw new Error("Text is scoped to a page or shared template, at all sizes.");
    if (!rule.style || typeof rule.style !== "object" || Array.isArray(rule.style)) throw new Error("Invalid styles.");
    for (const [property, value] of Object.entries(rule.style)) {
      if (!allowed.has(property) || typeof value !== "string" || value.length > 1000 || /[{};<>\\\x00-\x1f]|url\s*\(|expression\s*\(|@import|!important/i.test(value)) throw new Error("Unsupported style: " + property);
    }
  }
  return doc;
}
export function quote(value: string) { return JSON.stringify(value).replace(/</g, "\\3c ").replace(/>/g, "\\3e "); }
export function targetSelector(rule: Pick<DesignRule, "node" | "instance">) {
  const scopes = rule.instance || [];
  return scopes.map(x => `[data-design-id=${quote(x.node)}][data-design-key=${quote(x.key)}]`).join(" ") + (scopes.length && scopes.at(-1)?.node !== rule.node ? " " : "") + (scopes.at(-1)?.node === rule.node ? "" : `[data-design-id=${quote(rule.node)}]`);
}
export function compileStyles(doc: DesignDocument) {
  // Every generated selector has equal specificity. Scope and state precedence
  // must not depend on ancestor count or on which property was edited last.
  const sorted = [...doc.rules].sort((a,b) =>
    Number(a.page !== "*") - Number(b.page !== "*") ||
    Number(!!a.instance?.length) - Number(!!b.instance?.length) ||
    Number(a.breakpoint !== "all") - Number(b.breakpoint !== "all") ||
    Number(a.state !== "normal") - Number(b.state !== "normal")
  );
  return sorted.map(rule => {
    const page = rule.page === "*" ? "html" : `html:where([data-design-page=${quote(rule.page)}])`;
    const state = rule.state === "normal" ? "" : rule.state === "focus" ? ":focus-visible" : ":hover";
    const selector = page + " :where(" + targetSelector(rule) + state + ")";
    const declarations = Object.entries(rule.style).map(([k,v]) => `${k}:${v} !important`).join(";");
    const css = `${selector}{${declarations}}`;
    const condition = { all: "", mobile: "(width < 640px)", tablet: "(640px <= width < 1024px)", desktop: "(width >= 1024px)" }[rule.breakpoint];
    return condition ? `@media ${condition}{${css}}` : css;
  }).join("\n");
}
export function designText(doc: DesignDocument, node: string, page: string, fallback: string): string {
  let result = fallback;
  for (const scope of ["*", page]) for (const rule of doc.rules) if (rule.node === node && rule.page === scope && rule.text !== undefined) result = rule.text;
  return result;
}
