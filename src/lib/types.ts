export type ID = string;

export interface ExperienceItem {
  id: ID;
  company: string;
  role: string;
  location: string;
  dates: string;
  bullets: string[];
}

export interface EducationItem {
  id: ID;
  institution: string;
  degree: string;
  location: string;
  dates: string;
  bullets: string[];
}

export interface CertificationItem {
  id: ID;
  year: string;
  provider: string;
  title: string;
  details: string;
}

export interface LeadershipItem {
  id: ID;
  org: string;
  role: string;
  dates: string;
  details: string;
}

export interface VolunteerItem {
  id: ID;
  year: string;
  title: string;
  details: string;
}

export interface ResumeData {
  name: string;
  title: string;
  contact: string;
  summary: string;
  skills: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  leadership: LeadershipItem[];
  volunteer: VolunteerItem[];
  personal: string;
}

export interface BaseResume {
  id: ID;
  name: string;
  createdAt: number;
  data: ResumeData;
  hasOriginal: boolean;
}

export type JobStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export const JOB_STATUSES: { key: JobStatus; label: string }[] = [
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
];

export interface Todo {
  id: ID;
  text: string;
  done: boolean;
  dueDate?: string;
  createdAt: number;
}

export interface AttachmentMeta {
  id: ID;
  name: string;
  kind: "cover_letter" | "supporting" | "other";
  mime: string;
  size: number;
  addedAt: number;
}

export interface InterviewRound {
  id: ID;
  kind: "recruiter" | "hiring_manager" | "technical" | "panel" | "final" | "other";
  scheduledAt?: string; // ISO datetime
  durationMin?: number;
  interviewers: string;
  location: string; // remote link or address
  prepChecklist: { id: ID; text: string; done: boolean }[];
  linkedStarIds: ID[];
  questionsAsked: string;
  debrief: string;
  thankYou: string;
  done: boolean;
}

export interface OfferDetail {
  base: number;
  bonus: number;
  equity: number;
  benefits: string;
  signOn: number;
  startDate: string;
  colIndex: number; // cost-of-living index (1 = baseline)
  notes: string;
}

export interface Job {
  id: ID;
  title: string;
  company: string;
  location: string;
  url: string;
  salary: string;
  source: string;
  postedDate: string;
  appliedDate: string;
  description: string;
  notes: string;
  status: JobStatus;
  priority: 1 | 2 | 3;
  baseResumeId?: ID;
  resumeOverrides: Record<string, string>;
  todos: Todo[];
  attachments: AttachmentMeta[];
  contacts: { id: ID; name: string; role: string; email: string; notes: string }[];
  events: { id: ID; at: number; kind: string; note: string }[];
  // new
  keywords: string[]; // extracted from JD
  rounds: InterviewRound[];
  coverLetter: string;
  offer?: OfferDetail;
  createdAt: number;
  updatedAt: number;
}

export interface StarStory {
  id: ID;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string;
  createdAt: number;
}

export interface InterviewQuestion {
  id: ID;
  question: string;
  answer: string;
  category: string;
  createdAt: number;
}

export interface LearningItem {
  id: ID;
  title: string;
  type: "course" | "book" | "article" | "skill" | "project";
  url: string;
  status: "todo" | "in_progress" | "done";
  notes: string;
  progress: number;
  createdAt: number;
}

export type AIProviderKind = "openai" | "anthropic" | "ollama" | "lmstudio" | "openai_compatible";

export interface AIProvider {
  id: ID;
  name: string;
  kind: AIProviderKind;
  baseUrl: string; // e.g. https://api.openai.com/v1 or http://localhost:11434
  apiKey: string; // stored locally
  model: string;
}

export interface OutreachTemplate {
  id: ID;
  name: string;
  channel: "email" | "linkedin" | "followup";
  subject: string;
  body: string;
}

export interface WeeklyGoals {
  applications: number;
  outreach: number;
}

export interface AppSettings {
  providers: AIProvider[];
  activeProviderId?: ID;
  weeklyGoals: WeeklyGoals;
  outreach: OutreachTemplate[];
  coverLetterTemplate: string;
  reminderDaysAfterApply: number[]; // e.g. [3,7,14]
}

export interface AppState {
  resumes: BaseResume[];
  activeResumeId?: ID;
  jobs: Job[];
  starStories: StarStory[];
  interviewQuestions: InterviewQuestion[];
  learning: LearningItem[];
  settings: AppSettings;
}
