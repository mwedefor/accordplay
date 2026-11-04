import React, { createContext, useContext, useState, useEffect } from 'react';
import '../services/amplifyConfig';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null, user: null, loading: true,
  login: async () => {}, logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser]   = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();
        if (idToken) {
          const current = await getCurrentUser();
          const payload = session.tokens?.idToken?.payload;
          const groups = payload?.['cognito:groups'];
          const role: 'admin' | 'user' = Array.isArray(groups) && groups.includes('admin') ? 'admin' : 'user';
          setToken(idToken);
          setUser({
            id:    current.userId,
            email: payload?.email?.toString() ?? current.signInDetails?.loginId ?? '',
            name:  payload?.name?.toString() ?? current.signInDetails?.loginId?.split('@')[0] ?? '',
            role,
          });
        }
      } catch {
        // No active session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await signIn({
      username: email,
      password,
      options: { authFlowType: 'USER_PASSWORD_AUTH' },
    });
    if (!result.isSignedIn) throw new Error('Se requiere paso adicional');
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    if (!idToken) throw new Error('No se pudo obtener el token');
    const payload = session.tokens?.idToken?.payload;
    const current = await getCurrentUser();
    const groups = payload?.['cognito:groups'];
    const role: 'admin' | 'user' = Array.isArray(groups) && groups.includes('admin') ? 'admin' : 'user';
    setToken(idToken);
    setUser({
      id:    current.userId,
      email: payload?.email?.toString() ?? email,
      name:  payload?.name?.toString() ?? email.split('@')[0],
      role,
    });
  };

  const logout = async () => {
    await signOut();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
