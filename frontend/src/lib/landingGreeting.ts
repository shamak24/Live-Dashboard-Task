import type { User } from "@/types";

/** Greeting for marketing header / landing when user is signed in */
export function getLandingGreeting(user: User): string {
  if (user.role === "ADMIN") return "Hello, Admin";
  const first = user.name.trim().split(/\s+/)[0];
  return first ? `Hello, ${first}` : "Hello";
}

export function getDashboardLabel(role: User["role"]): string {
  switch (role) {
    case "ADMIN":
      return "Open dashboard";
    case "MECHANIC":
      return "My jobs";
    case "CUSTOMER":
      return "My portal";
    default:
      return "Go to app";
  }
}
