import { createContext, useContext, useEffect, useState } from "react";
import { sessionStore } from "../lib/store";
import type { SessionDTO } from "../types/common";

type AuthContextType = {
  isAuthenticated: boolean;
  role: string | null;
  memberId: number | null;
  firstName: string | null;
  lastName: string | null;
  login: (token: string) => void;
  logout: () => void;
};

function getFromStore<K extends keyof SessionDTO>(field: K): SessionDTO[K] | null {
  return sessionStore.state.session?.[field] ?? null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!sessionStore.state.session?.accessToken
  );
  const [role,      setRole]      = useState<string | null>(() => getFromStore("roleType") as string | null);
  const [memberId,  setMemberId]  = useState<number | null>(() => getFromStore("memberId") as number | null);
  const [firstName, setFirstName] = useState<string | null>(() => getFromStore("firstName") as string | null);
  const [lastName,  setLastName]  = useState<string | null>(() => getFromStore("lastName") as string | null);

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      const s = sessionStore.state.session;
      setIsAuthenticated(!!s?.accessToken);
      setRole(s?.roleType     ?? null);
      setMemberId(s?.memberId ?? null);
      setFirstName(s?.firstName ?? null);
      setLastName(s?.lastName   ?? null);
    });
    return () => unsubscribe();
  }, []);

  const logout = () => {
    sessionStorage.removeItem('announcement_shown')
    sessionStore.setState({ session: null });
    setIsAuthenticated(false);
    setRole(null);
    setMemberId(null);
    setFirstName(null);
    setLastName(null);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      role,
      memberId,
      firstName,
      lastName,
      login: () => {},
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}