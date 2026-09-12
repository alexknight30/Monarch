export type MemoryEvent = {
  id: string;
  at: string;
  kind: "page" | "create" | "link" | "copy" | "note";
  text: string;
};

export type CopyFlag = {
  id: string;
  at: string;
  turn?: string;
  source?: "chat" | "document-paste";
};

export type MemoryState = {
  summary: string;
  events: MemoryEvent[];
  copyFlags: CopyFlag[];
};

export function emptyMemory(): MemoryState {
  return { summary: "", events: [], copyFlags: [] };
}

const MAX_EVENTS = 80;
const MAX_COPY_FLAGS = 40;

export function appendMemoryEvent(
  state: MemoryState,
  event: Omit<MemoryEvent, "id" | "at"> & { id?: string; at?: string },
): MemoryState {
  const next: MemoryEvent = {
    id: event.id ?? `mem_${Date.now().toString(36)}`,
    at: event.at ?? new Date().toISOString(),
    kind: event.kind,
    text: event.text,
  };
  return {
    ...state,
    events: [next, ...state.events].slice(0, MAX_EVENTS),
  };
}

export function appendCopyFlag(
  state: MemoryState,
  flag: Omit<CopyFlag, "id" | "at"> & { id?: string; at?: string },
): MemoryState {
  const next: CopyFlag = {
    id: flag.id ?? `copy_${Date.now().toString(36)}`,
    at: flag.at ?? new Date().toISOString(),
    ...(flag.turn ? { turn: flag.turn } : {}),
    ...(flag.source ? { source: flag.source } : {}),
  };
  return {
    ...state,
    copyFlags: [next, ...state.copyFlags].slice(0, MAX_COPY_FLAGS),
  };
}
