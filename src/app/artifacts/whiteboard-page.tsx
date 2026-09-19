"use client";
import { DesignCopy } from "@/components/design/runtime";

import dynamic from "next/dynamic";
import type { DiagramArtifact } from "@/lib/mock-data";
const WhiteboardEditor = dynamic(() => import("./whiteboard-canvas"), { ssr: false,
  loading: () => <div data-design-id="m-09e2bbcf43d0" className="flex flex-1 items-center justify-center text-sm text-stone-400"><DesignCopy id="m-09e2bbcf43d0">Opening your whiteboard…</DesignCopy></div> });
export default function WhiteboardPage({ artifact }: { artifact: DiagramArtifact }) { return <WhiteboardEditor artifact={artifact} />; }
