import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getActiveStorage } from "./storage-adapter";
import type {
  AppState,
  AppSettings,
  AIProvider,
  BaseResume,
  Job,
  JobStatus,
  ResumeData,
  Todo,
  AttachmentMeta,
  StarStory,
  InterviewQuestion,
  LearningItem,
  InterviewRound,
  OfferDetail,
  OutreachTemplate,
} from "./types";
import { uid } from "./uid";
import { DEFAULT_COVER_LETTER, defaultOutreach } from "./templates";

interface Actions {
  addResume: (name: string, data: ResumeData, hasOriginal: boolean) => string;
  updateResume: (id: string, patch: Partial<BaseResume>) => void;
  updateResumeData: (id: string, data: ResumeData) => void;
  deleteResume: (id: string) => void;
  setActiveResume: (id: string) => void;

  addJob: (partial?: Partial<Job>) => string;
  updateJob: (id: string, patch: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  setJobStatus: (id: string, status: JobStatus) => void;
  setOverride: (jobId: string, path: string, value: string) => void;
  clearOverride: (jobId: string, path: string) => void;

  addTodo: (jobId: string, text: string) => void;
  toggleTodo: (jobId: string, todoId: string) => void;
  updateTodo: (jobId: string, todoId: string, patch: Partial<Todo>) => void;
  deleteTodo: (jobId: string, todoId: string) => void;

  addAttachmentMeta: (jobId: string, meta: AttachmentMeta) => void;
  deleteAttachmentMeta: (jobId: string, attId: string) => void;

  addRound: (jobId: string, partial?: Partial<InterviewRound>) => void;
  updateRound: (jobId: string, roundId: string, patch: Partial<InterviewRound>) => void;
  deleteRound: (jobId: string, roundId: string) => void;
  setOffer: (jobId: string, offer: OfferDetail | undefined) => void;

  addStar: (s: Omit<StarStory, "id" | "createdAt">) => void;
  updateStar: (id: string, patch: Partial<StarStory>) => void;
  deleteStar: (id: string) => void;
  addQuestion: (q: Omit<InterviewQuestion, "id" | "createdAt">) => void;
  updateQuestion: (id: string, patch: Partial<InterviewQuestion>) => void;
  deleteQuestion: (id: string) => void;
  addLearning: (l: Omit<LearningItem, "id" | "createdAt">) => void;
  updateLearning: (id: string, patch: Partial<LearningItem>) => void;
  deleteLearning: (id: string) => void;

  // settings
  updateSettings: (patch: Partial<AppSettings>) => void;
  addProvider: (p: Omit<AIProvider, "id">) => string;
  updateProvider: (id: string, patch: Partial<AIProvider>) => void;
  deleteProvider: (id: string) => void;
  addOutreach: (t: Omit<OutreachTemplate, "id">) => void;
  updateOutreach: (id: string, patch: Partial<OutreachTemplate>) => void;
  deleteOutreach: (id: string) => void;

  // import/replace
  importState: (s: AppState) => void;
}

const defaultSettings: AppSettings = {
  providers: [],
  weeklyGoals: { applications: 5, outreach: 3 },
  outreach: defaultOutreach(),
  coverLetterTemplate: DEFAULT_COVER_LETTER,
  reminderDaysAfterApply: [3, 7, 14],
};

const initialState: AppState = {
  resumes: [],
  jobs: [],
  starStories: [],
  interviewQuestions: [],
  learning: [],
  settings: defaultSettings,
};

function ensureJob(partial?: Partial<Job>): Job {
  const id = partial?.id ?? uid();
  const now = Date.now();
  return {
    id,
    title: "",
    company: "",
    location: "",
    url: "",
    salary: "",
    source: "",
    postedDate: "",
    appliedDate: "",
    description: "",
    notes: "",
    status: "saved",
    priority: 2,
    resumeOverrides: {},
    todos: [],
    attachments: [],
    contacts: [],
    events: [],
    keywords: [],
    rounds: [],
    coverLetter: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export const useStore = create<AppState & Actions>()(
  persist(
    (set) => ({
      ...initialState,
      addResume: (name, data, hasOriginal) => {
        const id = uid();
        set((s) => ({
          resumes: [...s.resumes, { id, name, data, hasOriginal, createdAt: Date.now() }],
          activeResumeId: s.activeResumeId ?? id,
        }));
        return id;
      },
      updateResume: (id, patch) =>
        set((s) => ({ resumes: s.resumes.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      updateResumeData: (id, data) =>
        set((s) => ({ resumes: s.resumes.map((r) => (r.id === id ? { ...r, data } : r)) })),
      deleteResume: (id) =>
        set((s) => ({
          resumes: s.resumes.filter((r) => r.id !== id),
          activeResumeId: s.activeResumeId === id ? s.resumes.find((r) => r.id !== id)?.id : s.activeResumeId,
        })),
      setActiveResume: (id) => set({ activeResumeId: id }),

      addJob: (partial) => {
        const job = ensureJob(partial);
        set((s) => ({ jobs: [job, ...s.jobs] }));
        return job.id;
      },
      updateJob: (id, patch) =>
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: Date.now() } : j)),
        })),
      deleteJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),
      setJobStatus: (id, status) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === id
              ? {
                  ...j,
                  status,
                  appliedDate: status === "applied" && !j.appliedDate ? new Date().toISOString().slice(0, 10) : j.appliedDate,
                  updatedAt: Date.now(),
                }
              : j,
          ),
        })),
      setOverride: (jobId, path, value) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? { ...j, resumeOverrides: { ...j.resumeOverrides, [path]: value }, updatedAt: Date.now() }
              : j,
          ),
        })),
      clearOverride: (jobId, path) =>
        set((s) => ({
          jobs: s.jobs.map((j) => {
            if (j.id !== jobId) return j;
            const next = { ...j.resumeOverrides };
            delete next[path];
            return { ...j, resumeOverrides: next, updatedAt: Date.now() };
          }),
        })),

      addTodo: (jobId, text) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? { ...j, todos: [...j.todos, { id: uid(), text, done: false, createdAt: Date.now() }] }
              : j,
          ),
        })),
      toggleTodo: (jobId, todoId) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId ? { ...j, todos: j.todos.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)) } : j,
          ),
        })),
      updateTodo: (jobId, todoId, patch) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId ? { ...j, todos: j.todos.map((t) => (t.id === todoId ? { ...t, ...patch } : t)) } : j,
          ),
        })),
      deleteTodo: (jobId, todoId) =>
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, todos: j.todos.filter((t) => t.id !== todoId) } : j)),
        })),

      addAttachmentMeta: (jobId, meta) =>
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, attachments: [...j.attachments, meta] } : j)),
        })),
      deleteAttachmentMeta: (jobId, attId) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId ? { ...j, attachments: j.attachments.filter((a) => a.id !== attId) } : j,
          ),
        })),

      addRound: (jobId, partial) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  rounds: [
                    ...j.rounds,
                    {
                      id: uid(),
                      kind: "recruiter",
                      interviewers: "",
                      location: "",
                      prepChecklist: [],
                      linkedStarIds: [],
                      questionsAsked: "",
                      debrief: "",
                      thankYou: "",
                      done: false,
                      ...partial,
                    },
                  ],
                }
              : j,
          ),
        })),
      updateRound: (jobId, roundId, patch) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? { ...j, rounds: j.rounds.map((r) => (r.id === roundId ? { ...r, ...patch } : r)), updatedAt: Date.now() }
              : j,
          ),
        })),
      deleteRound: (jobId, roundId) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId ? { ...j, rounds: j.rounds.filter((r) => r.id !== roundId) } : j,
          ),
        })),
      setOffer: (jobId, offer) =>
        set((s) => ({ jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, offer, updatedAt: Date.now() } : j)) })),

      addStar: (story) =>
        set((st) => ({ starStories: [{ ...story, id: uid(), createdAt: Date.now() }, ...st.starStories] })),
      updateStar: (id, patch) =>
        set((st) => ({ starStories: st.starStories.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteStar: (id) => set((st) => ({ starStories: st.starStories.filter((x) => x.id !== id) })),

      addQuestion: (q) =>
        set((st) => ({
          interviewQuestions: [{ ...q, id: uid(), createdAt: Date.now() }, ...st.interviewQuestions],
        })),
      updateQuestion: (id, patch) =>
        set((st) => ({
          interviewQuestions: st.interviewQuestions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      deleteQuestion: (id) =>
        set((st) => ({ interviewQuestions: st.interviewQuestions.filter((x) => x.id !== id) })),

      addLearning: (l) =>
        set((st) => ({ learning: [{ ...l, id: uid(), createdAt: Date.now() }, ...st.learning] })),
      updateLearning: (id, patch) =>
        set((st) => ({ learning: st.learning.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteLearning: (id) => set((st) => ({ learning: st.learning.filter((x) => x.id !== id) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      addProvider: (p) => {
        const id = uid();
        set((s) => ({
          settings: {
            ...s.settings,
            providers: [...s.settings.providers, { ...p, id }],
            activeProviderId: s.settings.activeProviderId ?? id,
          },
        }));
        return id;
      },
      updateProvider: (id, patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            providers: s.settings.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          },
        })),
      deleteProvider: (id) =>
        set((s) => ({
          settings: {
            ...s.settings,
            providers: s.settings.providers.filter((p) => p.id !== id),
            activeProviderId:
              s.settings.activeProviderId === id
                ? s.settings.providers.find((p) => p.id !== id)?.id
                : s.settings.activeProviderId,
          },
        })),
      addOutreach: (t) =>
        set((s) => ({ settings: { ...s.settings, outreach: [...s.settings.outreach, { ...t, id: uid() }] } })),
      updateOutreach: (id, patch) =>
        set((s) => ({
          settings: { ...s.settings, outreach: s.settings.outreach.map((x) => (x.id === id ? { ...x, ...patch } : x)) },
        })),
      deleteOutreach: (id) =>
        set((s) => ({ settings: { ...s.settings, outreach: s.settings.outreach.filter((x) => x.id !== id) } })),

      importState: (s) => set(() => ({ ...s, settings: { ...defaultSettings, ...s.settings } })),
    }),
    {
      name: "jobs-app-v1",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : getActiveStorage(),
      ),
      version: 2,
      migrate: (persisted: any) => {
        if (!persisted) return persisted;
        persisted.settings = { ...defaultSettings, ...(persisted.settings ?? {}) };
        if (Array.isArray(persisted.jobs)) {
          persisted.jobs = persisted.jobs.map((j: any) => ({
            keywords: [],
            rounds: [],
            coverLetter: "",
            ...j,
          }));
        }
        return persisted;
      },
    },
  ),
);

// Helpers
export function getEffectiveResume(base: ResumeData, overrides: Record<string, string>): ResumeData {
  const data: ResumeData = JSON.parse(JSON.stringify(base));
  for (const [path, value] of Object.entries(overrides)) setByPath(data, path, value);
  return data;
}

function setByPath(obj: unknown, path: string, value: string) {
  const parts = path.split(".");
  let cur: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    const next = parts[i + 1];
    if (Array.isArray(cur)) {
      const item = cur.find((x: any) => x.id === p);
      if (!item) return;
      cur = item;
    } else if (cur && typeof cur === "object") {
      if (!(p in cur)) cur[p] = /^\d+$/.test(next) ? [] : {};
      cur = cur[p];
    } else return;
  }
  const last = parts[parts.length - 1];
  if (Array.isArray(cur) && /^\d+$/.test(last)) cur[Number(last)] = value;
  else cur[last] = value;
}
