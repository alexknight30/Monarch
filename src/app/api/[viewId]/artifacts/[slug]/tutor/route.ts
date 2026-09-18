import { withUsageRequest } from "@/lib/usage-route";
import {NextResponse} from "next/server";
import {resolveApiView} from "@/lib/api-view";
import {tutorLesson} from "@/lib/lesson-tutor";
export const runtime="nodejs";
export const maxDuration=180;
async function handlePOST(request:Request,context:{params:Promise<{viewId:string;slug:string}>}){
  const {viewId,slug}=await context.params;
  const resolved=await resolveApiView(viewId);if("error" in resolved)return resolved.error;
  try{
    const body=await request.json();
    if(!body||typeof body.blockId!=="string"||typeof body.question!=="string"||typeof body.answer!=="string")throw new Error("Provide a lesson question and your reasoning.");
    const result=await tutorLesson(resolved.viewId,slug,body.blockId,body.question,body.answer,request.signal);
    return NextResponse.json(result);
  }catch(error){const message=error instanceof Error?error.message:"Could not get feedback.";return NextResponse.json({error:message},{status:message.includes("not found")?404:400});}
}

export const POST = withUsageRequest("special", handlePOST);
