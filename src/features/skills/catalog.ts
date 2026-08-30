import { COMPARE_1V_ALL_SKILL_MD } from "@/features/skills/compare-1v-all-skill";
import { COMPARE_1V1_SKILL_MD } from "@/features/skills/compare-1v1-skill";
import { FRIENDS_PROGRESS_SKILL_MD } from "@/features/skills/friends-progress-skill";
import { PERFORMANCE_REPORT_SKILL_MD } from "@/features/skills/performance-report-skill";
import { TRAINER_SKILL_MD } from "@/features/skills/trainer-skill";

export const INSTALLABLE_SKILLS = [
  {
    id: "performance",
    title: "Performance summary",
    description:
      "Recaps yesterday’s training with volume, PRs, and session notes, plus how this week compares to last week.",
    markdown: PERFORMANCE_REPORT_SKILL_MD,
  },
  {
    id: "compare-1v1",
    title: "1v1 comparison",
    description:
      "Head-to-head recap of two athletes from one compare_performance_metrics call.",
    markdown: COMPARE_1V1_SKILL_MD,
  },
  {
    id: "compare-1v-all",
    title: "1v all comparison",
    description:
      "Ranks you (or one named athlete) against everyone you follow from two MCP calls.",
    markdown: COMPARE_1V_ALL_SKILL_MD,
  },
  {
    id: "friends-progress",
    title: "Friends progress report",
    description:
      "Circle recap for everyone you follow from one following_performance_metrics call.",
    markdown: FRIENDS_PROGRESS_SKILL_MD,
  },
  {
    id: "trainer",
    title: "Trainer report",
    description:
      "Roster recap for everyone who assigned you as trainer from one athletes_performance_metrics call.",
    markdown: TRAINER_SKILL_MD,
  },
] as const;
