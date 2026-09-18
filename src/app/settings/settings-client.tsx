"use client";
import { useState } from "react";
import UsageDashboard from "./usage-dashboard";
import { useRouter } from "next/navigation";
import { WorkspaceBackupControls } from "@/components/workspace-backup-controls";
import { Button } from "@/components/ui/button";
import { TextTabs } from "@/components/ui/text-tabs";
import { useViewId } from "@/components/view-provider";
import { PROFILE_FIELDS, type StudentProfile } from "@/lib/profile";
import { addCustomSkill, listSkills, removeCustomSkill, type Skill } from "@/lib/skills";
const TABS=["Student info","Workspace","Usage","Connection","Skills"] as const;
type Tab=(typeof TABS)[number];
export default function SettingsClient({student,counts,connection}:{student:StudentProfile;counts:{courses:number;artifacts:number;tasks:number;events:number;chats:number};connection:{xai:boolean;haiku:boolean;model:string}}){
  const viewId=useViewId();
  const router=useRouter();
  const [tab,setTab]=useState<Tab>("Student info");
  const [profile,setProfile]=useState(student);
  const [status,setStatus]=useState("");const [busy,setBusy]=useState(false);
  const [skills,setSkills]=useState<Skill[]>([]);
  const [addingSkill,setAddingSkill]=useState(false);
  const [skillForm,setSkillForm]=useState({command:"",name:"",description:"",prompt:""});
  const [skillError,setSkillError]=useState<string|null>(null);
  const labels:Record<keyof StudentProfile,string>={fullName:"Full name",preferredName:"Preferred name",email:"School email",studentId:"Student ID",major:"Major",year:"Course year",school:"School"};
  const save=async()=>{setBusy(true);setStatus("");try{const res=await fetch("/api/"+viewId+"/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(profile)});const result=await res.json();if(!res.ok)throw new Error(result.error||"Could not save your profile.");setProfile(result.profile);setStatus("Profile saved.");router.refresh();}catch(cause){setStatus(cause instanceof Error?cause.message:"Could not save.");}finally{setBusy(false);}};
  return <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-6 pt-12 pb-16"><div className="w-full max-w-4xl">
    <h1 className="font-display text-[34px] tracking-tight">Settings</h1><p className="mt-2 text-sm text-stone-500">Your profile, local workspace, model connection, and chat skills.</p>
    <div className="mt-8"><TextTabs items={TABS} value={tab} onChange={value=>{setTab(value);if(value==="Skills")setSkills(listSkills());}}/></div>
    {tab==="Student info"&&<form className="mt-8 space-y-6" onSubmit={e=>{e.preventDefault();void save();}}><div className="grid gap-5 sm:grid-cols-2">{PROFILE_FIELDS.map(key=><label key={key} className="text-xs font-medium text-stone-500">{labels[key]}<input type={key==="email"?"email":"text"} maxLength={500} className="mt-2 w-full rounded-lg border border-stone-200 p-3 text-sm text-stone-900 outline-none focus:border-stone-500" value={profile[key]} onChange={e=>setProfile({...profile,[key]:e.target.value})}/></label>)}</div><p className="text-xs text-stone-400">Saved only in this local workspace. These fields do not sign you into a school account or send notifications.</p><div className="flex items-center justify-between"><p role="status" className="text-sm text-stone-500">{status}</p><Button disabled={busy}>{busy?"Saving…":"Save profile"}</Button></div></form>}
    {tab==="Workspace"&&<section className="mt-8 space-y-7"><div className="grid gap-3 sm:grid-cols-3">{Object.entries(counts).map(([label,count])=><div key={label} className="rounded-xl border border-stone-200 p-5"><p className="text-3xl font-medium">{count}</p><p className="mt-2 text-xs capitalize text-stone-500">{label}</p></div>)}</div><div className="rounded-xl bg-stone-50 p-5 text-sm leading-6 text-stone-600"><p>Schoolwork is stored on this Mac. Saved changes create rolling workspace snapshots automatically.</p><p className="mt-3">Model costs are handled by your provider account. Open the Usage tab for recorded tokens, spending, and a monthly forecast.</p></div><a href={"/api/"+viewId+"/workspace/export"} download className="inline-block rounded-lg border border-stone-200 px-4 py-2 text-sm">Export workspace records</a><p className="text-xs text-stone-400">Exports courses, artifacts, tasks, dates, links, profile and saved conversations as JSON. Original uploaded files remain in your local data folder and are not included in this records export.</p><WorkspaceBackupControls/></section>}
    {tab==="Usage"&&<UsageDashboard/>}
    {tab==="Connection"&&<section className="mt-8 space-y-5"><div className="rounded-xl border border-stone-200 p-6"><h2 className="font-medium">Grok 4.5</h2><p className="mt-3 text-sm text-stone-600">{connection.xai?"xAI API key is configured on this Mac.":"No xAI API key is configured."}</p><p className="mt-2 text-xs text-stone-400">Model: {connection.model}</p></div><div className="rounded-xl border border-stone-200 p-6"><h2 className="font-medium">Optional Haiku tasks</h2><p className="mt-3 text-sm text-stone-600">{connection.haiku?"An Anthropic key is present. Its validity is checked when used.":"No Anthropic key is configured."}</p></div><p className="text-xs leading-5 text-stone-400">Provider keys are configured in the local environment. Monarch does not issue a separate personal API key.</p></section>}
        {tab === "Skills" ? (
          <section className="mt-8 flex flex-col gap-6">
            <div>
              <h2 className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">
                Chat skills
              </h2>
              <p className="pt-1.5 text-[13px] leading-[18px] text-[#9A9A98]">
                Type{" "}
                <span className="font-mono text-[#5E5E5E]">/</span> in chat to
                run a skill on the last reply.
              </p>
            </div>

            <ul className="flex flex-col">
              {skills.map((skill, index) => (
                <li
                  key={skill.id}
                  className={`flex items-start justify-between gap-4 py-4 ${
                    index > 0 ? "border-t border-[#EFEFED]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm leading-[18px] text-[#0A0A0A]">
                        /{skill.command}
                      </span>
                      {skill.builtin ? (
                        <span className="rounded-md bg-[#F1F1EF] px-1.5 py-0.5 text-[11px] leading-3 text-[#5E5E5E]">
                          Built-in
                        </span>
                      ) : null}
                    </div>
                    <p className="pt-1 text-[13px] leading-[18px] text-[#9A9A98]">
                      {skill.description}
                    </p>
                  </div>
                  {!skill.builtin ? (
                    <button
                      type="button"
                      onClick={() => {
                        removeCustomSkill(skill.id);
                        setSkills(listSkills());
                      }}
                      className="shrink-0 text-[13px] leading-4 text-[#9A9A98] hover:text-[#0A0A0A]"
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            {addingSkill ? (
              <div className="flex flex-col gap-4 border-t border-[#EFEFED] pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] leading-4 font-medium text-[#5E5E5E]">
                      Command
                    </span>
                    <div className="flex h-10 items-center rounded-lg border border-[#E6E6E6] bg-white px-3">
                      <span className="font-mono text-sm text-[#9A9A98]">/</span>
                      <input
                        type="text"
                        value={skillForm.command}
                        onChange={(e) =>
                          setSkillForm((f) => ({
                            ...f,
                            command: e.target.value
                              .replace(/^\//, "")
                              .toLowerCase(),
                          }))
                        }
                        placeholder="review"
                        className="h-full min-w-0 flex-1 border-0 bg-transparent font-mono text-sm text-[#0A0A0A] outline-none placeholder:text-[#B0B0AC]"
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] leading-4 font-medium text-[#5E5E5E]">
                      Name
                    </span>
                    <input
                      type="text"
                      value={skillForm.name}
                      onChange={(e) =>
                        setSkillForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Quick review"
                      className="h-10 rounded-lg border border-[#E6E6E6] bg-white px-3 text-sm leading-[18px] text-[#0A0A0A] outline-none focus:border-[#0A0A0A]"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] leading-4 font-medium text-[#5E5E5E]">
                    Short description
                  </span>
                  <input
                    type="text"
                    value={skillForm.description}
                    onChange={(e) =>
                      setSkillForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="What this skill does in one line"
                    className="h-10 rounded-lg border border-[#E6E6E6] bg-white px-3 text-sm leading-[18px] text-[#0A0A0A] outline-none focus:border-[#0A0A0A]"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] leading-4 font-medium text-[#5E5E5E]">
                    Instruction
                  </span>
                  <textarea
                    value={skillForm.prompt}
                    onChange={(e) =>
                      setSkillForm((f) => ({ ...f, prompt: e.target.value }))
                    }
                    rows={4}
                    placeholder="Tell the model what to do with the last reply…"
                    className="resize-none rounded-lg border border-[#E6E6E6] bg-white px-3 py-2.5 text-sm leading-[18px] text-[#0A0A0A] outline-none focus:border-[#0A0A0A]"
                  />
                </label>
                {skillError ? (
                  <p className="text-[13px] leading-4 text-red-600">
                    {skillError}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setAddingSkill(false);
                      setSkillError(null);
                      setSkillForm({
                        command: "",
                        name: "",
                        description: "",
                        prompt: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      try {
                        addCustomSkill(skillForm);
                        setSkills(listSkills());
                        setAddingSkill(false);
                        setSkillError(null);
                        setSkillForm({
                          command: "",
                          name: "",
                          description: "",
                          prompt: "",
                        });
                      } catch (err) {
                        setSkillError(
                          err instanceof Error
                            ? err.message
                            : "Could not add skill.",
                        );
                      }
                    }}
                  >
                    Save skill
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end border-t border-[#EFEFED] pt-5">
                <Button onClick={() => setAddingSkill(true)}>
                  Add custom skill
                </Button>
              </div>
            )}
          </section>
        ) : null}
  </div></div>;
}
