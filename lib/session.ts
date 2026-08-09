"use client";

import { useSyncExternalStore } from "react";

export type StoredUser = { name: string } | null;

const KEY = "av_user";
const listeners = new Set<() => void>();

function readUser(): StoredUser {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function getStoredUser(): StoredUser {
  return readUser();
}

export function setStoredUser(user: StoredUser): void {
  if (user) {
    localStorage.setItem(KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEY);
  }
  listeners.forEach((notify) => notify());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function useStoredUser(): StoredUser {
  return useSyncExternalStore(subscribe, readUser, () => null);
}
