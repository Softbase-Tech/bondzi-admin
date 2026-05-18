"use client";

import { useSession } from "next-auth/react";
import type { UserRole } from "@/types/api";

export interface Permissions {
  role: UserRole | null;
  isAdmin: boolean;
  isSuperadmin: boolean;
  isTeacher: boolean;
  canEditQuestions: boolean;
  canDeleteQuestions: boolean;
  canBanUsers: boolean;
  canReprocessPayments: boolean;
  canManageSchools: boolean;
  canAccessAiKillSwitch: boolean;
}

export function usePermissions(): Permissions {
  const { data } = useSession();
  const role = (data?.user?.role ?? null) as UserRole | null;
  const isSuper = role === "superadmin";
  const isAdmin = role === "admin" || isSuper;
  const isTeacher = role === "teacher";

  return {
    role,
    isAdmin,
    isSuperadmin: isSuper,
    isTeacher,
    canEditQuestions: isAdmin,
    canDeleteQuestions: isAdmin,
    canBanUsers: isAdmin,
    canReprocessPayments: isSuper,
    canManageSchools: isAdmin,
    canAccessAiKillSwitch: isSuper,
  };
}
