import { createContext, useContext, useEffect, useState } from "react";
import { sessionStore } from "../lib/store";

type AuthContextType = {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const raw = localStorage.getItem("session");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const session = parsed?.session ?? parsed;
    return !!session?.accessToken;
  });

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      setIsAuthenticated(!!sessionStore.state.session?.accessToken);
    });
    return () => unsubscribe();
  }, []);

  const logout = () => {
    sessionStore.setState({ session: null });
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login: () => {}, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}