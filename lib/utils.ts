import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const introHeadings = [
  "Tell me about yourself",
  "Let's start with your brief introduction",
  "Please introduce yourself",
  "Can you give us a brief overview of your background?",
  "Start by telling us a bit about yourself",
  "We'd like to know more about you",
];

export function getRandomIntroHeading(): string {
  return introHeadings[Math.floor(Math.random() * introHeadings.length)];
}

