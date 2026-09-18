import SettingsClient from "./settings-client";
import { getServerViewId } from "@/lib/views-server";
import { readViewStore } from "@/lib/local-db";
import { flatten } from "@/lib/planner";
import { GROK_MODEL } from "@/lib/harness/models";
export default async function SettingsPage(){
  const viewId=await getServerViewId();const store=await readViewStore(viewId);
  return <SettingsClient student={store.profile} counts={{courses:store.courses.filter(c=>c.id!=="unassigned").length,artifacts:store.artifacts.length,tasks:store.planner.flatMap(flatten).length,events:store.calendar.length,chats:store.chats.length}} connection={{xai:!!process.env.XAI_API_KEY,haiku:!!process.env.ANTHROPIC_API_KEY,model:GROK_MODEL}}/>;
}
