import type { Slide, SlideElement } from "./mock-data";
import { htmlToPlainText } from "./documents";
export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 540;
export function slideElements(slide: Slide): SlideElement[] {
  return slide.elements ?? [
    { id: slide.id + "-title", type: "text", x: 64, y: 48, width: 832, height: 110, text: slide.title, color: "#1c1917", fill: "transparent", fontSize: 42, bold: true },
    { id: slide.id + "-body", type: "text", x: 64, y: 190, width: 832, height: 280, text: htmlToPlainText(slide.bodyHtml), color: "#44403c", fill: "transparent", fontSize: 26 },
  ];
}
export async function exportPowerPoint(slides: Slide[], title: string) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS(); pptx.layout = "LAYOUT_WIDE"; pptx.title = title; pptx.subject = "Monarch study slides"; pptx.author = "Monarch";
  const color = (s: string) => s.replace("#", "");
  for (const slide of slides) {
    const page = pptx.addSlide(); page.background = { color: color(slide.background || "#ffffff") };
    if (slide.notes) page.addNotes(slide.notes);
    for (const element of slideElements(slide)) {
      const box = { x: element.x / 72, y: element.y / 72, w: element.width / 72, h: element.height / 72, rotate: element.rotation || 0 };
      if (element.type === "text") page.addText(element.text || "", { ...box, fontSize: element.fontSize, color: color(element.color), bold: element.bold, align: element.align || "left", fontFace: "Arial", margin: 0, breakLine: false, valign: "top" });
      else if (element.type === "image" && element.src?.startsWith("/api/")) {
        const response = await fetch(element.src); if (!response.ok) throw new Error("A slide image could not be exported.");
        const blob = await response.blob();
        const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
        page.addImage({ data, ...box });
      } else if (element.type !== "image") page.addShape(element.type === "ellipse" ? pptx.ShapeType.ellipse : pptx.ShapeType.rect, { ...box, fill: { color: color(element.fill === "transparent" ? "#ffffff" : element.fill), transparency: element.fill === "transparent" ? 100 : 0 }, line: { color: color(element.color), width: 1.5 } });
    }
  }
  await pptx.writeFile({ fileName: title + ".pptx" });
}
