declare module "*animations/butterfly-meadow/scene.js" {
  export const CONFIG: {
    scrollSpeed: number;
    groundRatio: number;
    flightX: number;
    flapHz: number;
    butterflyScale: number;
    trailSeconds: number;
    trailSampleMs: number;
  };

  export class Scene {
    width: number;
    height: number;
    resize(width: number, height: number): void;
    update(dt: number): void;
    draw(ctx: CanvasRenderingContext2D): void;
    drawStatic(ctx: CanvasRenderingContext2D): void;
  }
}
