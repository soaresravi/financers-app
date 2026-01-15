import React, { createContext, useState, useEffect, useContext} from 'react';
import { User } from '../types/auth'; 
import { authService } from '../services/firebase';

interface AuthContextData {
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkUserSession();
    }, []);

    const checkUserSession = async () => {

        try {

            const storedUser = await authService.getCurrentUser();

            if (storedUser) {
                setUser(storedUser);
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
           
            const userData = {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
            };

            await authService.persistUserSession(userCredential.user);
            setUser(userData);

        } finally {
            setIsLoading(false);
        }
    };

    const signUp = async (email: string, password: string, name: string) => {

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
}