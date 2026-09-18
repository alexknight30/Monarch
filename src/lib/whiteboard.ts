import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { b64Vecs } from "@tldraw/tlschema";
import type { DiagramArtifact } from "./mock-data";

export type WhiteboardPage = { id: string; name: string; elements: readonly ExcalidrawElement[]; files: BinaryFiles; appState?: Partial<Pick<AppState, "viewBackgroundColor" | "gridSize">> };
export type WhiteboardDocument = { version: 1; pages: WhiteboardPage[]; migrationNotes?: string[] };
type Data = Record<string, unknown>;
const object = (value: unknown): Data => value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
const num = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const str = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const colors: Record<string, string> = { black: "#1d1d1d", grey: "#777777", blue: "#4263eb", "light-blue": "#4dabf7", red: "#e03131", "light-red": "#ff8787", green: "#2f9e44", "light-green": "#8ce99a", yellow: "#f2c94c", orange: "#f08c00", violet: "#7048e8", "light-violet": "#b197fc", white: "#ffffff" };
function richText(value: unknown): string {
  const node = object(value);
  if (typeof node.text === "string") return node.text;
  if (node.type === "hardBreak") return "\n";
  return Array.isArray(node.content) ? node.content.map(richText).join(node.type === "doc" ? "\n" : "") : "";
}
export function isWhiteboardDocument(value: unknown): value is WhiteboardDocument {
  const board = object(value);
  if (board.version !== 1 || !Array.isArray(board.pages) || !board.pages.length || board.pages.length > 100) return false;
  const ids = new Set<string>();
  return board.pages.every(raw => {
    const page = object(raw);
    if (typeof page.id !== "string" || !page.id || ids.has(page.id) || typeof page.name !== "string" || !Array.isArray(page.elements) || !page.files || typeof page.files !== "object" || Array.isArray(page.files)) return false;
    ids.add(page.id);
    const elementIds = new Set<string>();
    const types = new Set(["rectangle", "diamond", "ellipse", "text", "line", "arrow", "freedraw", "image", "frame", "magicframe", "iframe", "embeddable"]);
    if (!Object.entries(page.files).every(([id, rawFile]) => {
      const file = object(rawFile);
      return file.id === id && typeof file.dataURL === "string" && !!file.dataURL && typeof file.mimeType === "string" && file.mimeType.startsWith("image/");
    })) return false;
    return page.elements.every(rawElement => {
      const e = object(rawElement);
      if (typeof e.id !== "string" || !e.id || elementIds.has(e.id) || !types.has(str(e.type)) || !Number.isFinite(e.x) || !Number.isFinite(e.y)) return false;
      elementIds.add(e.id);
      return true;
    });
  });
}

/** One-way editable conversion; the original snapshot remains on the artifact unchanged. */
export function migrateWhiteboard(artifact: DiagramArtifact): WhiteboardDocument {
  if (artifact.whiteboard) return artifact.whiteboard;
  const snapshot = artifact.snapshot;
  const records = snapshot ? Object.values(snapshot.store).map(value => object(value)) : [];
  const byId = new Map(records.map(record => [str(record.id), record]));
  const pageRecords = records.filter(record => record.typeName === "page").sort((a, b) => str(a.index).localeCompare(str(b.index)));
  const pages: WhiteboardPage[] = pageRecords.length ? pageRecords.map(record => ({ id: str(record.id), name: str(record.name, "Page"), elements: [], files: {} })) : [{ id: "page-1", name: "Page 1", elements: [], files: {} }];
  const warnings = new Set<string>();
  const make = (id: string, type: string, x: number, y: number, width: number, height: number, extra: Data = {}): Data => ({ id, type, x, y, width, height, angle: 0, strokeColor: "#1d1d1d", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 0, opacity: 100, seed: 1, version: 1, versionNonce: 0, isDeleted: false, groupIds: [], frameId: null, boundElements: null, updated: 0, link: null, locked: false, ...extra });
  const append = (page: WhiteboardPage, value: Data) => { (page.elements as ExcalidrawElement[]).push(value as unknown as ExcalidrawElement); };
  const textElement = (id: string, value: string, x: number, y: number, width: number, extra: Data = {}) => make(id, "text", x, y, width, Math.max(28, value.split("\n").length * 28), { text: value, originalText: value, fontSize: 20, fontFamily: 2, textAlign: "left", verticalAlign: "top", containerId: null, lineHeight: 1.25, autoResize: true, ...extra });
  if (!snapshot) {
    const page = pages[0];
    const positions = new Map(artifact.spec.nodes.map((node, i) => [node.id, { x: artifact.spec.layout === "process" ? i * 300 : i % 4 * 300, y: artifact.spec.layout === "process" ? 0 : Math.floor(i / 4) * 200 }]));
    artifact.spec.nodes.forEach((node, i) => {
      const p = positions.get(node.id)!;
      append(page, make(node.id, "rectangle", p.x, p.y, 240, 140, { backgroundColor: "#e7f5ff", strokeColor: "#4263eb", boundElements: [{ id: node.id + "-label", type: "text" }] }));
      append(page, textElement(node.id + "-label", [node.label, node.note].filter(Boolean).join("\n"), p.x + 12, p.y + 12, 216, { containerId: node.id }));
      const parent = node.parent || ((artifact.spec.layout === "process" || artifact.spec.layout === "cycle") && i > 0 ? artifact.spec.nodes[i - 1].id : "");
      const from = positions.get(parent);
      if (from) append(page, make(node.id + "-arrow", "arrow", from.x + 240, from.y + 70, p.x - from.x - 240, p.y - from.y, { points: [[0, 0], [p.x - from.x - 240, p.y - from.y]], startBinding: { elementId: parent, focus: 0, gap: 1 }, endBinding: { elementId: node.id, focus: 0, gap: 1 }, startArrowhead: null, endArrowhead: "arrow" }));
    });
    return { version: 1, pages };
  }
  function position(record: Data, seen = new Set<string>()): { x: number; y: number; angle: number; pageId: string; groups: string[] } {
    const id = str(record.id);
    if (seen.has(id)) return { x: 0, y: 0, angle: 0, pageId: pages[0].id, groups: [] };
    seen.add(id);
    const parent = byId.get(str(record.parentId));
    const local = { x: num(record.x), y: num(record.y), angle: num(record.rotation), pageId: str(record.parentId, pages[0].id), groups: [] as string[] };
    if (!parent || parent.typeName !== "shape") return local;
    const p = position(parent, seen), cos = Math.cos(p.angle), sin = Math.sin(p.angle);
    return { x: p.x + local.x * cos - local.y * sin, y: p.y + local.x * sin + local.y * cos, angle: p.angle + local.angle, pageId: p.pageId, groups: [...p.groups, ...(parent.type === "group" ? [str(parent.id)] : [])] };
  }
  const shapes = records.filter(record => record.typeName === "shape").sort((a, b) => str(a.index).localeCompare(str(b.index)));
  for (const shape of shapes) {
    if (shape.type === "group") continue;
    const props = object(shape.props), p = position(shape), id = str(shape.id), type = str(shape.type);
    const page = pages.find(page => page.id === p.pageId) || pages[0];
    const color = colors[str(props.color)] || "#1d1d1d", width = num(props.w, 200), height = num(props.h, type === "note" ? 200 : 120);
    const common = { angle: p.angle, strokeColor: color, opacity: num(shape.opacity, 1) * 100, groupIds: p.groups, locked: Boolean(shape.isLocked), strokeWidth: ({ s: 1, m: 2, l: 3, xl: 5 } as Record<string, number>)[str(props.size)] || 2, strokeStyle: props.dash === "dashed" ? "dashed" : props.dash === "dotted" ? "dotted" : "solid", backgroundColor: props.fill && props.fill !== "none" ? color + "25" : "transparent" };
    const label = richText(props.richText) || str(props.text);
    if (type === "text") { append(page, textElement(id, label, p.x, p.y, width, { ...common, fontSize: ({ s: 18, m: 24, l: 36, xl: 48 } as Record<string, number>)[str(props.size)] || 24 })); continue; }
    if (type === "geo" || type === "note" || type === "frame") {
      const geo = str(props.geo, "rectangle");
      const targetType = type === "frame" ? "frame" : geo === "ellipse" || geo === "oval" ? "ellipse" : geo === "diamond" ? "diamond" : "rectangle";
      if (type === "geo" && !["rectangle", "ellipse", "oval", "diamond"].includes(geo)) warnings.add(`${geo} shapes were converted to editable rectangles.`);
      append(page, make(id, targetType, p.x, p.y, width, height, { ...common, ...(type === "note" ? { backgroundColor: "#fff3bf" } : {}), ...(type === "frame" ? { name: str(props.name, "Frame") } : {}), boundElements: label ? [{ id: id + "-label", type: "text" }] : null }));
      if (label) append(page, textElement(id + "-label", label, p.x + 10, p.y + 10, width - 20, { ...common, backgroundColor: "transparent", containerId: type === "frame" ? null : id }));
      continue;
    }
    if (type === "draw" || type === "highlight" || type === "line") {
      const points: number[][] = [];
      if (type === "line") Object.values(object(props.points)).sort((a, b) => str(object(a).index).localeCompare(str(object(b).index))).forEach(point => points.push([num(object(point).x), num(object(point).y)]));
      else if (Array.isArray(props.segments)) for (const raw of props.segments) {
        const segment = object(raw);
        try {
          const segmentPoints = Array.isArray(segment.points) ? segment.points.map(object) : b64Vecs.decodePoints(str(segment.path), segment.dim === 2 ? 2 : 3);
          segmentPoints.forEach(point => points.push([num(point.x), num(point.y)]));
        } catch { warnings.add("A pen stroke could not be converted; the original snapshot is retained."); }
      }
      if (points.length) append(page, make(id, type === "line" ? "line" : "freedraw", p.x, p.y, Math.max(...points.map(point => point[0])) - Math.min(...points.map(point => point[0])), Math.max(...points.map(point => point[1])) - Math.min(...points.map(point => point[1])), { ...common, points, pressures: [], simulatePressure: true, lastCommittedPoint: null, startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: null, ...(type === "highlight" ? { opacity: 35, strokeWidth: 12 } : {}) }));
      continue;
    }
    if (type === "arrow") {
      const endpoint = (terminal: "start" | "end") => {
        const binding = records.find(record => record.typeName === "binding" && record.fromId === id && object(record.props).terminal === terminal);
        const target = binding && byId.get(str(binding.toId));
        if (target) {
          const t = position(target), tp = object(target.props), anchor = object(object(binding?.props).normalizedAnchor);
          const x = num(anchor.x, .5) * num(tp.w, 200), y = num(anchor.y, .5) * num(tp.h, 120);
          return { x: t.x + x * Math.cos(t.angle) - y * Math.sin(t.angle), y: t.y + x * Math.sin(t.angle) + y * Math.cos(t.angle), binding: { elementId: str(target.id), focus: 0, gap: 1 } };
        }
        const point = object(props[terminal]); return { x: p.x + num(point.x) * Math.cos(p.angle) - num(point.y) * Math.sin(p.angle), y: p.y + num(point.x) * Math.sin(p.angle) + num(point.y) * Math.cos(p.angle), binding: null };
      };
      const start = endpoint("start"), end = endpoint("end");
      append(page, make(id, "arrow", start.x, start.y, end.x - start.x, end.y - start.y, { ...common, angle: 0, points: [[0, 0], [end.x - start.x, end.y - start.y]], startBinding: start.binding, endBinding: end.binding, startArrowhead: props.arrowheadStart === "none" ? null : str(props.arrowheadStart, "") ? "arrow" : null, endArrowhead: props.arrowheadEnd === "none" ? null : "arrow", boundElements: label ? [{ id: id + "-label", type: "text" }] : null }));
      if (label) append(page, textElement(id + "-label", label, (start.x + end.x) / 2, (start.y + end.y) / 2, 180, { containerId: id }));
      if (num(props.bend)) warnings.add("Curved arrows were converted to straight connectors.");
      continue;
    }
    if (type === "image") {
      const asset = object(byId.get(str(props.assetId))), ap = object(asset.props), src = str(ap.src), fileId = str(props.assetId, id);
      if (src) {
        page.files[fileId] = { id: fileId, dataURL: src, mimeType: str(ap.mimeType, "image/png"), created: 0 } as BinaryFiles[string];
        append(page, make(id, "image", p.x, p.y, width, height, { ...common, fileId, status: "saved", scale: [props.flipX ? -1 : 1, props.flipY ? -1 : 1], crop: null }));
        if (props.crop) warnings.add("Cropped images were restored using their full original image.");
        continue;
      }
    }
    warnings.add(`${type} objects are retained in the original snapshot and shown as labeled placeholders.`);
    append(page, make(id, "rectangle", p.x, p.y, width, height, { ...common, strokeStyle: "dashed", link: str(props.url) || null }));
    append(page, textElement(id + "-label", label || str(props.url) || `${type} · original retained`, p.x + 10, p.y + 10, width - 20));
  }
  return { version: 1, pages, ...(warnings.size ? { migrationNotes: [...warnings] } : {}) };
}
