import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Coins,
  CreditCard,
  Database,
  FileSpreadsheet,
  Flag,
  FileStack,
  Gift,
  GraduationCap,
  History,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Monitor,
  Sparkles,
  ServerCog,
  Share2,
  Tags,
  Trophy,
  Upload,
  Users,
  Wand2,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Query key string for the badge count. */
  badgeKey?:
    | "flags"
    | "explanations"
    | "jobs"
    | "pmTestReview"
    | "winners"
    | "questions";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Content",
    items: [
      {
        href: "/admin/subjects",
        label: "Subjects",
        icon: BookOpen,
      },
      {
        href: "/admin/questions",
        label: "Question bank",
        icon: Database,
        badgeKey: "questions",
      },
      {
        href: "/admin/stimuli",
        label: "Shared stimuli",
        icon: FileStack,
      },
      {
        href: "/admin/explanations",
        label: "AI Explanations",
        icon: MessageSquare,
        badgeKey: "explanations",
      },
      {
        href: "/admin/explanations/import",
        label: "Import explanations",
        icon: Upload,
      },
      {
        href: "/admin/pm-test/review",
        label: "PM Test review",
        icon: ListChecks,
        badgeKey: "pmTestReview",
      },
      {
        href: "/admin/pm-test/generate",
        label: "PM Test generate",
        icon: Wand2,
      },
      {
        href: "/admin/flags",
        label: "Flag queue",
        icon: Flag,
        badgeKey: "flags",
      },
    ],
  },
  {
    label: "Users & Revenue",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/admin/payments", label: "Payments", icon: FileSpreadsheet },
      {
        href: "/admin/financial-events",
        label: "Billing log",
        icon: History,
      },
      { href: "/admin/referrals", label: "Referrals", icon: Share2 },
    ],
  },
  {
    label: "Gamification",
    items: [
      { href: "/admin/xp-economy", label: "XP Economy", icon: Coins },
      { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
      {
        href: "/admin/winners",
        label: "Winners",
        icon: Gift,
        badgeKey: "winners",
      },
    ],
  },
  {
    label: "AI & Operations",
    items: [
      { href: "/admin/ai-generation", label: "AI Generation", icon: Sparkles },
      { href: "/admin/ai/monitor", label: "AI monitor", icon: Monitor },
      {
        href: "/admin/jobs",
        label: "Job queues",
        icon: ServerCog,
        badgeKey: "jobs",
      },
    ],
  },
  {
    label: "Platform Config",
    items: [
      { href: "/admin/plans", label: "Plans", icon: Tags },
      { href: "/admin/config/ads", label: "Ads (P2)", icon: BarChart3 },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/schools", label: "Schools (P2)", icon: GraduationCap },
      { href: "/admin/audit", label: "Audit log", icon: History },
    ],
  },
];

export const TEACHER_NAV: NavItem[] = [
  { href: "/school", label: "Class overview", icon: LayoutDashboard },
  { href: "/school/students", label: "Students", icon: Users },
  { href: "/school/assignments", label: "Assignments", icon: ListChecks },
  { href: "/school/reports", label: "Reports", icon: FileSpreadsheet },
];
