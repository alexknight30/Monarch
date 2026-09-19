"use client";
import { DesignCopy } from "@/components/design/runtime";

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
  return <div data-design-id="m-99c07d78a07a" className="flex min-h-0 flex-1 justify-center overflow-y-auto px-6 pt-12 pb-16"><div data-design-id="m-e6b3c1465e84" className="w-full max-w-4xl">
    <h1 data-design-id="m-dc4233cf06e6" className="font-display text-[34px] tracking-tight"><DesignCopy id="m-dc4233cf06e6">Settings</DesignCopy></h1><p data-design-id="m-760cdfdcb22b" className="mt-2 text-sm text-stone-500"><DesignCopy id="m-760cdfdcb22b">Your profile, local workspace, model connection, and chat skills.</DesignCopy></p>
    <div data-design-id="m-481db579059b" className="mt-8"><TextTabs items={TABS} value={tab} onChange={value=>{setTab(value);if(value==="Skills")setSkills(listSkills());}}/></div>
    {tab==="Student info"&&<form data-design-id="m-b260a9cac6d4" className="mt-8 space-y-6" onSubmit={e=>{e.preventDefault();void save();}}><div data-design-id="m-aecf52b23a9f" className="grid gap-5 sm:grid-cols-2">{PROFILE_FIELDS.map(key=><label data-design-id="m-e456cca23ca5" key={key} className="text-xs font-medium text-stone-500">{labels[key]}<input data-design-id="m-f7e6faf94c8c" type={key==="email"?"email":"text"} maxLength={500} className="mt-2 w-full rounded-lg border border-stone-200 p-3 text-sm text-stone-900 outline-none focus:border-stone-500" value={profile[key]} onChange={e=>setProfile({...profile,[key]:e.target.value})}/></label>)}</div><p data-design-id="m-9728509c605f" className="text-xs text-stone-400"><DesignCopy id="m-9728509c605f">Saved only in this local workspace. These fields do not sign you into a school account or send notifications.</DesignCopy></p><div data-design-id="m-35c3baa9e39e" className="flex items-center justify-between"><p data-design-id="m-265d839f5173" role="status" className="text-sm text-stone-500">{status}</p><Button data-design-id="m-31b664d4cfbe" data-design-key="m-31b664d4cfbe" disabled={busy}>{busy?"Saving…":"Save profile"}</Button></div></form>}
    {tab==="Workspace"&&<section data-design-id="m-0bc073794f82" className="mt-8 space-y-7"><div data-design-id="m-e8185156f1a4" className="grid gap-3 sm:grid-cols-3">{Object.entries(counts).map(([label,count])=><div data-design-id="m-7b2ca55dace1" data-design-key={label} key={label} className="rounded-xl border border-stone-200 p-5"><p data-design-id="m-db66f7fbd47e" className="text-3xl font-medium">{count}</p><p data-design-id="m-5e5070bafb87" className="mt-2 text-xs capitalize text-stone-500">{label}</p></div>)}</div><div data-design-id="m-34527f8b2e16" className="rounded-xl bg-stone-50 p-5 text-sm leading-6 text-stone-600"><p data-design-id="m-9d165676d418"><DesignCopy id="m-9d165676d418">Schoolwork is stored on this Mac. Saved changes create rolling workspace snapshots automatically.</DesignCopy></p><p data-design-id="m-3337dd9beefb" className="mt-3"><DesignCopy id="m-3337dd9beefb">Model costs are handled by your provider account. Open the Usage tab for recorded tokens, spending, and a monthly forecast.</DesignCopy></p></div><a data-design-id="m-6eae65d2baed" href={"/api/"+viewId+"/workspace/export"} download className="inline-block rounded-lg border border-stone-200 px-4 py-2 text-sm"><DesignCopy id="m-6eae65d2baed">Export workspace records</DesignCopy></a><p data-design-id="m-7ddc0d7f45da" className="text-xs text-stone-400"><DesignCopy id="m-7ddc0d7f45da">Exports courses, artifacts, tasks, dates, links, profile and saved conversations as JSON. Original uploaded files remain in your local data folder and are not included in this records export.</DesignCopy></p><WorkspaceBackupControls/></section>}
    {tab==="Usage"&&<UsageDashboard/>}
    {tab==="Connection"&&<section data-design-id="m-f0afc0374b4a" className="mt-8 space-y-5"><div data-design-id="m-ff0f8286546d" className="rounded-xl border border-stone-200 p-6"><h2 data-design-id="m-140892ca17a9" className="font-medium"><DesignCopy id="m-140892ca17a9">Grok 4.5</DesignCopy></h2><p data-design-id="m-cbc23fa83d1e" className="mt-3 text-sm text-stone-600">{connection.xai?"xAI API key is configured on this Mac.":"No xAI API key is configured."}</p><p data-design-id="m-052edd3ce5bb" className="mt-2 text-xs text-stone-400">Model: {connection.model}</p></div><div data-design-id="m-32a5f253e09a" className="rounded-xl border border-stone-200 p-6"><h2 data-design-id="m-bb6c62b9fbb4" className="font-medium"><DesignCopy id="m-bb6c62b9fbb4">Optional Haiku tasks</DesignCopy></h2><p data-design-id="m-8b044f34506a" className="mt-3 text-sm text-stone-600">{connection.haiku?"An Anthropic key is present. Its validity is checked when used.":"No Anthropic key is configured."}</p></div><p data-design-id="m-ae469b06ae52" className="text-xs leading-5 text-stone-400"><DesignCopy id="m-ae469b06ae52">Provider keys are configured in the local environment. Monarch does not issue a separate personal API key.</DesignCopy></p></section>}
        {tab === "Skills" ? (
          <section data-design-id="m-8e8dddd0715b" className="mt-8 flex flex-col gap-6">
            <div data-design-id="m-c0006159dbab">
              <h2 data-design-id="m-0da945138d18" className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]"><DesignCopy id="m-0da945138d18">
                Chat skills
              </DesignCopy></h2>
              <p data-design-id="m-f2f8efe9bcc2" className="pt-1.5 text-[13px] leading-[18px] text-[#9A9A98]">
                Type{" "}
                <span data-design-id="m-05d2625dd401" className="font-mono text-[#5E5E5E]"><DesignCopy id="m-05d2625dd401">/</DesignCopy></span> in chat to
                run a skill on the last reply.
              </p>
            </div>

            <ul data-design-id="m-fb8d36f8f8c3" className="flex flex-col">
              {skills.map((skill, index) => (
                <li data-design-id="m-bed84c93b842" data-design-key={skill.id}
                  key={skill.id}
                  className={`flex items-start justify-between gap-4 py-4 ${
                    index > 0 ? "border-t border-[#EFEFED]" : ""
                  }`}
                >
                  <div data-design-id="m-3e9d25ea6aea" className="min-w-0">
                    <div data-design-id="m-d9461356eb31" className="flex items-center gap-2">
                      <span data-design-id="m-dae766021e43" className="font-mono text-sm leading-[18px] text-[#0A0A0A]">
                        /{skill.command}
                      </span>
                      {skill.builtin ? (
                        <span data-design-id="m-00a67d7443ea" className="rounded-md bg-[#F1F1EF] px-1.5 py-0.5 text-[11px] leading-3 text-[#5E5E5E]"><DesignCopy id="m-00a67d7443ea">
                          Built-in
                        </DesignCopy></span>
                      ) : null}
                    </div>
                    <p data-design-id="m-7395fab5d741" className="pt-1 text-[13px] leading-[18px] text-[#9A9A98]">
                      {skill.description}
                    </p>
                  </div>
                  {!skill.builtin ? (
                    <button data-design-id="m-e295d0ac360d"
                      type="button"
                      onClick={() => {
                        removeCustomSkill(skill.id);
                        setSkills(listSkills());
                      }}
                      className="shrink-0 text-[13px] leading-4 text-[#9A9A98] hover:text-[#0A0A0A]"
                    ><DesignCopy id="m-e295d0ac360d">
                      Remove
                    </DesignCopy></button>
                  ) : null}
                </li>
              ))}
            </ul>

            {addingSkill ? (
              <div data-design-id="m-2340d33c1144" className="flex flex-col gap-4 border-t border-[#EFEFED] pt-6">
                <div data-design-id="m-c8ffeef0a38e" className="grid grid-cols-2 gap-4">
                  <label data-design-id="m-62c7cb65f426" className="flex flex-col gap-1.5">
                    <span data-design-id="m-c08d040e8d07" className="text-[13px] leading-4 font-medium text-[#5E5E5E]"><DesignCopy id="m-c08d040e8d07">
                      Command
                    </DesignCopy></span>
                    <div data-design-id="m-7600f9b59831" className="flex h-10 items-center rounded-lg border border-[#E6E6E6] bg-white px-3">
                      <span data-design-id="m-7939f61c8156" className="font-mono text-sm text-[#9A9A98]"><DesignCopy id="m-7939f61c8156">/</DesignCopy></span>
                      <input data-design-id="m-20e513e2a05b"
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
                  <label data-design-id="m-77e976f4f4f7" className="flex flex-col gap-1.5">
                    <span data-design-id="m-3aa6befad309" className="text-[13px] leading-4 font-medium text-[#5E5E5E]"><DesignCopy id="m-3aa6befad309">
                      Name
                    </DesignCopy></span>
                    <input data-design-id="m-9c5e49c86ed4"
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
                <label data-design-id="m-2bf88ea03b71" className="flex flex-col gap-1.5">
                  <span data-design-id="m-28e1181f299c" className="text-[13px] leading-4 font-medium text-[#5E5E5E]"><DesignCopy id="m-28e1181f299c">
                    Short description
                  </DesignCopy></span>
                  <input data-design-id="m-818e6b086bbd"
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
                <label data-design-id="m-ccd267d2d6a2" className="flex flex-col gap-1.5">
                  <span data-design-id="m-f7768e201b7d" className="text-[13px] leading-4 font-medium text-[#5E5E5E]"><DesignCopy id="m-f7768e201b7d">
                    Instruction
                  </DesignCopy></span>
                  <textarea data-design-id="m-504ac4af9da2"
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
                  <p data-design-id="m-27ea5eeb158d" className="text-[13px] leading-4 text-red-600">
                    {skillError}
                  </p>
                ) : null}
                <div data-design-id="m-60152e877cba" className="flex justify-end gap-2">
                  <Button data-design-id="m-ebdce91da60c" data-design-key="m-ebdce91da60c"
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
                  ><DesignCopy id="m-ebdce91da60c">
                    Cancel
                  </DesignCopy></Button>
                  <Button data-design-id="m-452e581c41ee" data-design-key="m-452e581c41ee"
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
                  ><DesignCopy id="m-452e581c41ee">
                    Save skill
                  </DesignCopy></Button>
                </div>
              </div>
            ) : (
              <div data-design-id="m-520c3e1a3a25" className="flex justify-end border-t border-[#EFEFED] pt-5">
                <Button data-design-id="m-2401fe832eb3" data-design-key="m-2401fe832eb3" onClick={() => setAddingSkill(true)}><DesignCopy id="m-2401fe832eb3">
                  Add custom skill
                </DesignCopy></Button>
              </div>
            )}
          </section>
        ) : null}
  </div></div>;
}
