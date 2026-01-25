import React, { createContext, useState, useEffect, useContext} from 'react';

import { User } from '../types/auth'; 
import { authService, db } from '../services/firebase';
import { getDoc, doc} from 'firebase/firestore';

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData); //cria um contexto q centraliza tudo disponivel globalmente

export const useAuth = () => useContext(AuthContext); //hook personalizado p qualquer componente importar de forma facil

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => { //provedor do estado de autenticação

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { //roda 1 vez e ao abrir o programa
    checkUserSession();
  }, []);
  
  const checkUserSession = async () => {
   
    try {
     
      const storedUser = await authService.getCurrentUser();

      if (storedUser) {
       
        const userDoc = await getDoc(doc(db, 'users', storedUser.uid));
        const userData = userDoc.data();
        
        const userDataComplete = {
          
          uid: storedUser.uid,
          email: storedUser.email,
          name: userData?.name || "",
          initialSetup: userData?.initialSetup || false
      
        };
        
        setUser(userDataComplete);
      
      }
    
    } catch (error) {
    
      console.error('Erro ao verificar sessão:', error);
    
    } finally {
      setIsLoading(false);
    }

  };
  
  const signIn = async (email: string, password: string) => {
  
    setIsLoading(true);

    try {
   
      const userCredential = await authService.signIn(email, password);

      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();
    
      const userDataComplete = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: userData?.name || "", 
        initialSetup: userData?.initialSetup || false
      };
      
      await authService.persistUserSession(userCredential.user);
      setUser(userDataComplete); 

    } finally {
      setIsLoading(false);
    }

  };

  const signUp = async (email: string, password: string, name: string) => { //cadastro
  
    setIsLoading(true);
  
    try {

      const userCredential = await authService.signUp(email, password, name);

        const userData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name,
        };
            
        await authService.persistUserSession(userCredential.user);
        setUser(userData);
            
    } finally {
      setIsLoading(false);
    }

  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}> { children } </AuthContext.Provider>
  );
};