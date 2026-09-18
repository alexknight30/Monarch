"use client";
import {useSyncExternalStore} from "react";
import {CHAT_LIST_EVENT,listChatThreads,getActiveChatId,type ChatThread} from "./chat-history";
const empty:ChatThread[]=[];
const server=()=>empty;
function subscribe(changed:()=>void){window.addEventListener(CHAT_LIST_EVENT,changed);return()=>window.removeEventListener(CHAT_LIST_EVENT,changed);}
export function useChatThreads(){return useSyncExternalStore(subscribe,listChatThreads,server);}
const noActive=()=>null;
export function useActiveChatId(){return useSyncExternalStore(subscribe,getActiveChatId,noActive);}
