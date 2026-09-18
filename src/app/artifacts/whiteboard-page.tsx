"use client";
import dynamic from "next/dynamic";
import type { DiagramArtifact } from "@/lib/mock-data";
const WhiteboardEditor = dynamic(() => import("./whiteboard-canvas"), { ssr: false,
  loading: () => <div className="flex flex-1 items-center justify-center text-sm text-stone-400">Opening your whiteboard…</div> });
export default function WhiteboardPage({ artifact }: { artifact: DiagramArtifact }) { return <WhiteboardEditor artifact={artifact} />; }
