"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "./types";
import { api } from "./apis";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; is_host: boolean }) => Promise<void>;
  demoLogin: (email: string) => Promise<User>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  updateUser: (user: User) => void;
}

const SessionContext = createContext<AuthContextType | null>(null);

export const DEMO_GUESTS = [
  { email: "rohan@example.com", label: "Rohan (Guest)" },
  { email: "ananya@example.com", label: "Ananya (Guest)" },
];

export const DEMO_HOSTS = [
  { email: "priya@example.com", label: "Priya (Host)" },
  { email: "aarav@example.com", label: "Aarav (Host)" },
];

export const DEMO_USERS = [...DEMO_GUESTS, ...DEMO_HOSTS];

function saveUserToStorage(userToSave: User) {
  localStorage.setItem("user", JSON.stringify(userToSave));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const refreshedUser = await api.me();
      saveUserToStorage(refreshedUser);
      setUser(refreshedUser);
    } catch {
      localStorage.removeItem("user");
      setUser(null);
    }
  };

  useEffect(() => {
    const storedUserData = localStorage.getItem("user");
    if (storedUserData) {
      try {
        setUser(JSON.parse(storedUserData));
        refreshSession().finally(() => setLoading(false));
        return;
      } catch {
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const authenticatedUser = await api.login(email, password);
    saveUserToStorage(authenticatedUser);
    setUser(authenticatedUser);
  };

  const register = async (data: { name: string; email: string; password: string; is_host: boolean }) => {
    const newUser = await api.register(data);
    saveUserToStorage(newUser);
    setUser(newUser);
  };

  const demoLogin = async (email: string) => {
    const demoUser = await api.demoLogin(email);
    saveUserToStorage(demoUser);
    setUser(demoUser);
    return demoUser;
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    saveUserToStorage(updatedUser);
    setUser(updatedUser);
  };

  return (
    <SessionContext.Provider
      value={{ user, loading, login, register, demoLogin, logout, refreshSession, updateUser }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useAuth() {
  const authContextValue = useContext(SessionContext);
  if (!authContextValue) throw new Error("useAuth must be used within AuthProvider");
  return authContextValue;
}