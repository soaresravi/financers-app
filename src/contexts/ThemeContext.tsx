import React, { createContext, useState, useContext, useEffect } from 'react';

import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type ThemeContextData = {
    temaEscuro: boolean;
    toggleTema: (valor: boolean) => Promise<void>;
    carregandoTema: boolean;
};

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    
    const { user } = useAuth();

    const [temaEscuro, setTemaEscuro] = useState(false);
    const [carregandoTema, setCarregandoTema] = useState(true);

    useEffect(() => {

        if (user?.uid) {
            carregarTema(user.uid);
        } else {
            setTemaEscuro(false);
            setCarregandoTema(false);
        }

    }, [user?.uid]);

    const carregarTema = async (uid: string) => {

        try {

            const temaRef = doc(db, 'users', uid, 'configuracoes', 'tema');
            const temaSnap = await getDoc(temaRef);

            if (temaSnap.exists()) {
                setTemaEscuro(temaSnap.data().escuro || false);
            } else {
                setTemaEscuro(false);
            }

        } catch (error) {
            console.error('Erro ao carregar tema:', error);
            setTemaEscuro(false);
        } finally {
            setCarregandoTema(false);
        }

    };

    const toggleTema = async (valor: boolean) => {

        setTemaEscuro(valor);

        if (user?.uid) {

            try {

                const temaRef = doc(db, 'users', user.uid, 'configuracoes', 'tema');
                await setDoc(temaRef, { escuro: valor }, { merge: true });

            } catch (error) {
                console.error('Erro ao salvar tema:', error);
            }
        }

    };

    return (
        <ThemeContext.Provider value={{ temaEscuro, toggleTema, carregandoTema }}> {children} </ThemeContext.Provider>
    );

};

export const useTheme = () => useContext(ThemeContext);