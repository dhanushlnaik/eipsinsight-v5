import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalize a constant (status/type/category/role) into a badge token slug. */
export function tokenize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-");
}
