import { get, set, del, keys } from "idb-keyval";

export const idbGet = <T = unknown>(key: string) => get<T>(key);
export const idbSet = (key: string, value: unknown) => set(key, value);
export const idbDel = (key: string) => del(key);
export const idbKeys = () => keys();

export const resumeOriginalKey = (id: string) => `resume:${id}:original`;
export const attachmentKey = (jobId: string, attId: string) =>
  `job:${jobId}:att:${attId}`;
