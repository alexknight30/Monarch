export const ARTIFACT_CONFLICT_EVENT="monarch:artifact-conflict";
export type ArtifactConflictNotice={
  key:string;title:string;fields:string[];local:Record<string,unknown>;remote:Record<string,unknown>;
  keepLocal:()=>Promise<unknown>;useSaved:()=>void;
};
export function announceArtifactConflict(notice:ArtifactConflictNotice) {
  if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent(ARTIFACT_CONFLICT_EVENT,{detail:notice}));
}
