import type { User } from '@prisma/client';

/** Only fields that are safe to send to the client. Never include passwordHash/tokenVersion. */
export function publicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    avatarUrl: u.avatarUrl,
    isActive: u.isActive,
    bio: u.bio,
    learningGoal: u.learningGoal,
    weeklyGoalHours: u.weeklyGoalHours,
    emailNotifs: u.emailNotifs,
    theme: u.theme,
    createdAt: u.createdAt,
  };
}
