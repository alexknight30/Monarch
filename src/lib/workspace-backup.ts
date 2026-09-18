import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import { readViewStore, type ViewStore } from "./local-db";
import { withWorkspaceTransaction, writeWorkspaceCollections } from "./workspace-store";
import type { ViewId } from "./views";

const compress=promisify(gzip);
const decompress=promisify(gunzip);
const MAX_JSON=256*1024*1024;
const MAX_FILES=10000;
const root=(view:ViewId)=>path.join(/*turbopackIgnore: true*/ process.env.MONARCH_DATA_ROOT || path.join(/*turbopackIgnore: true*/ process.cwd(),"data"),view);
const hash=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
type BackupFile={path:string;sha256:string;data:string};
type Backup={format:"monarch-full-backup";version:1;viewId:ViewId;exportedAt:string;workspace:ViewStore;files:BackupFile[]};

function safePath(value:string) {
  if(!/^(uploads|assets|chat-files)\//.test(value)||value.includes("\\")||value.includes("\0")||value.split("/").some(part=>!part||part==="."||part===".."))throw new Error("The backup contains an invalid file path.");
  return value;
}
function validImmutablePath(value:string) {
  if(value.startsWith("assets/")&&!/^assets\/[a-f0-9-]{36}(?:\.json)?$/.test(value))throw new Error("Invalid whiteboard asset path in backup.");
  if(value.startsWith("chat-files/")&&!/^chat-files\/[a-f0-9]{64}\.(?:bin|json)$/.test(value))throw new Error("Invalid chat attachment path in backup.");
}
async function names(directory:string):Promise<string[]> {
  try {return await fs.readdir(directory);} catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return [];throw error;}
}

export async function exportWorkspaceBackup(viewId:ViewId) {
  const seed=await readViewStore(viewId);
  return withWorkspaceTransaction(viewId,seed,async()=>{
    const workspace=await readViewStore(viewId);
    const folder=root(viewId);
    const wanted=new Set<string>();
    for(const document of workspace.documents) {
      const relative=safePath(path.relative(folder,document.storedPath).split(path.sep).join("/"));
      if(!relative.startsWith("uploads/"))throw new Error("A source document is outside the workspace uploads folder.");
      wanted.add(relative);document.storedPath=relative;
      delete document.fileApiId; // Provider-side file caches are recreated as needed.
    }
    for(const kind of ["assets","chat-files"])for(const filename of await names(path.join(/*turbopackIgnore: true*/ folder,kind)))wanted.add(safePath(kind+"/"+filename));
    if(wanted.size>MAX_FILES)throw new Error("This workspace has too many files for an in-app backup. Copy the data folder instead.");
    const files:BackupFile[]=[];
    let size=Buffer.byteLength(JSON.stringify(workspace));
    for(const relative of wanted) {
      const absolute=path.join(/*turbopackIgnore: true*/ folder,relative);
      if(!(await fs.realpath(absolute)).startsWith((await fs.realpath(folder))+path.sep))throw new Error("An attachment points outside this workspace.");
      const stat=await fs.lstat(absolute);
      if(!stat.isFile()||stat.isSymbolicLink())throw new Error("A workspace attachment is not a regular file.");
      size+=Math.ceil(stat.size*4/3)+relative.length+100;
      if(size>MAX_JSON)throw new Error("This workspace is too large for an in-app backup. Stop Monarch and copy the data folder instead.");
      const bytes=await fs.readFile(absolute);
      files.push({path:relative,sha256:hash(bytes),data:bytes.toString("base64")});
    }
    const backup:Backup={format:"monarch-full-backup",version:1,viewId,exportedAt:new Date().toISOString(),workspace,files};
    return compress(Buffer.from(JSON.stringify(backup)));
  });
}

export async function inspectWorkspaceBackup(viewId:ViewId,bytes:Buffer) {
  if(bytes.length>MAX_JSON)throw new Error("The backup is larger than 256 MB.");
  let backup:Backup;
  try {backup=JSON.parse((await decompress(bytes,{maxOutputLength:MAX_JSON})).toString("utf8"));}
  catch {throw new Error("Choose a valid Monarch full backup (.monarch.gz), up to 256 MB uncompressed.");}
  if(backup?.format!=="monarch-full-backup"||backup.version!==1)throw new Error("This is not a supported Monarch full backup.");
  if(backup.viewId!==viewId)throw new Error("Switch to the workspace this backup belongs to before restoring it.");
  const seed=await readViewStore(viewId);
  if(!backup.workspace||typeof backup.workspace!=="object"||Array.isArray(backup.workspace))throw new Error("The backup has no workspace records.");
  backup.workspace.trash ??= []; // Backups made before artifact trash was introduced.
  for(const key of Object.keys(seed) as (keyof ViewStore)[]) {
    const value=backup.workspace[key];
    if(key==="memory"||key==="profile") {if(!value||typeof value!=="object"||Array.isArray(value))throw new Error(`Invalid ${key} in backup.`);}
    else if(!Array.isArray(value))throw new Error(`Invalid ${key} in backup.`);
  }
  if(!Array.isArray(backup.files)||backup.files.length>MAX_FILES)throw new Error("Invalid backup file list.");
  const paths=new Set<string>();
  for(const file of backup.files) {
    if(!file||typeof file.path!=="string"||typeof file.data!=="string"||typeof file.sha256!=="string")throw new Error("Invalid backup attachment.");
    safePath(file.path);
    validImmutablePath(file.path);
    if(paths.has(file.path))throw new Error("The backup contains duplicate file paths.");
    paths.add(file.path);
    if(hash(Buffer.from(file.data,"base64"))!==file.sha256)throw new Error("A backup attachment failed its integrity check.");
  }
  for(const document of backup.workspace.documents) {
    if(typeof document.storedPath!=="string"||!document.storedPath.startsWith("uploads/")||!paths.has(safePath(document.storedPath)))throw new Error("The backup is missing a source document.");
  }
  return backup;
}

export function backupSummary(backup:Backup) {
  return {exportedAt:backup.exportedAt,courses:backup.workspace.courses.length,artifacts:backup.workspace.artifacts.length,tasks:backup.workspace.planner.length,conversations:backup.workspace.chats.length,files:backup.files.length};
}

export async function restoreWorkspaceBackup(viewId:ViewId,bytes:Buffer) {
  const backup=await inspectWorkspaceBackup(viewId,bytes);
  const folder=root(viewId);
  const importFolder=`uploads/restore-${crypto.randomUUID()}`;
  const seed=await readViewStore(viewId);
  return withWorkspaceTransaction(viewId,seed,async()=>{
    for(const kind of ["uploads","assets","chat-files"]) {
      const directory=path.join(/*turbopackIgnore: true*/ folder,kind);await fs.mkdir(directory,{recursive:true});
      if((await fs.lstat(directory)).isSymbolicLink())throw new Error("Restore requires ordinary workspace attachment folders, not symbolic links.");
    }
    // Existing immutable files must agree before any records are replaced.
    for(const file of backup.files.filter(file=>!file.path.startsWith("uploads/"))) {
      try {if(hash(await fs.readFile(path.join(/*turbopackIgnore: true*/ folder,file.path)))!==file.sha256)throw new Error("An attachment conflicts with an existing file. Your workspace has not been replaced.");}
      catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
    }
    for(const file of backup.files) {
      const relative=file.path.startsWith("uploads/")?`${importFolder}/${file.path.slice(8)}`:file.path;
      const absolute=path.join(/*turbopackIgnore: true*/ folder,relative);
      await fs.mkdir(path.dirname(absolute),{recursive:true});
      try {await fs.writeFile(absolute,Buffer.from(file.data,"base64"),{flag:"wx"});}
      catch(error){if((error as NodeJS.ErrnoException).code!=="EEXIST")throw error;}
    }
    const workspace=Object.fromEntries(Object.keys(seed).map(key=>[key,structuredClone(backup.workspace[key as keyof ViewStore])])) as ViewStore;
    for(const document of workspace.documents)document.storedPath=path.join(/*turbopackIgnore: true*/ folder,importFolder,document.storedPath.slice(8));
    // writeWorkspaceCollections creates a recoverable snapshot of current records.
    // Original uploads and immutable attachments are retained, never deleted.
    await writeWorkspaceCollections(viewId,seed,workspace);
    return backupSummary(backup);
  });
}
