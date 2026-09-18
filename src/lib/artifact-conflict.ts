import { isDeepStrictEqual } from "node:util";
import type { Artifact } from "./mock-data";

export class ArtifactConflict extends Error {
  constructor(public artifact:Artifact,public fields:string[]) {
    super("This artifact changed in another tab or conversation. Your draft has been kept. Review the versions before saving.");
  }
}

export function checkArtifactBase(artifact:Artifact,patch:Record<string,unknown>,base?:Record<string,unknown>) {
  if(!base)return;
  const current=artifact as unknown as Record<string,unknown>;
  const conflicts=Object.keys(patch).filter(key=>
    !isDeepStrictEqual(current[key]??null,base[key]??null)&&!isDeepStrictEqual(current[key]??null,patch[key]??null));
  if(conflicts.length)throw new ArtifactConflict(artifact,conflicts);
}
