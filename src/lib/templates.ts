import type { OutreachTemplate } from "./types";
import { uid } from "./uid";

export const DEFAULT_COVER_LETTER = `Dear {{hiring_manager|Hiring Team}},

I'm excited to apply for the {{role}} role at {{company}}. With my background in {{top_skill}}, I've delivered measurable results that map directly to what your team is building.

In recent roles I've:
- {{achievement_1}}
- {{achievement_2}}
- {{achievement_3}}

What draws me to {{company}} is {{why_company}}. I'd love to discuss how I can help {{team_or_outcome}}.

Thank you for your time,
{{my_name}}
`;

export function defaultOutreach(): OutreachTemplate[] {
  return [
    {
      id: uid(),
      name: "Cold email to recruiter",
      channel: "email",
      subject: "Interested in {{role}} at {{company}}",
      body: `Hi {{first_name}},

I came across the {{role}} opening at {{company}} and it lines up well with my background in {{top_skill}}. In my last role I {{achievement_1}}.

Would you be open to a quick chat this week?

Best,
{{my_name}}
`,
    },
    {
      id: uid(),
      name: "LinkedIn DM (warm intro)",
      channel: "linkedin",
      subject: "",
      body: `Hi {{first_name}}, I'm exploring the {{role}} role at {{company}}. I've spent the last few years working on {{top_skill}} and {{achievement_1}}. Would love your perspective on the team — open to a quick chat?`,
    },
    {
      id: uid(),
      name: "Follow-up after 7 days",
      channel: "followup",
      subject: "Re: {{role}} at {{company}}",
      body: `Hi {{first_name}},

Circling back on my application for the {{role}} role. I remain very interested and happy to share more on how I'd approach {{team_or_outcome}}.

Thanks again,
{{my_name}}
`,
    },
  ];
}
