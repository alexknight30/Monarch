"use client";
import {useSyncExternalStore} from "react";
const subscribe=()=>()=>{};
const client=()=>true;
const server=()=>false;
/** A stable client snapshot for portals and browser-only storage. */
export function useHydrated(){return useSyncExternalStore(subscribe,client,server);}
