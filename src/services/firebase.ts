import { initializeApp } from "firebase/app";

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, AuthError, UserCredential, User } from 'firebase/auth'

import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "../services/firebaseConfig";

import AsyncStorage from "@react-native-async-storage/async-storage";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app)
export const db = getFirestore(app);

export const authService = { //funções de autenticação. agrupa todas as op num unico objeto

    async signUp(email: string, password: string, name: string): Promise<UserCredential> { //cadastro com email e senha

        try {

            const userCredential = await createUserWithEmailAndPassword(auth, email, password); //cria no firebase auth
            await this.saveUserData(userCredential.user.uid, email, name); //salva info adicionais no firestore
            return userCredential;

        } catch (error) {
            const authError = error as AuthError;
            throw new Error(this.getErrorMessage(authError.code));
        }
    },

    async signIn(email: string, password: string): Promise<UserCredential> {
        
        try {

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await this.persistUserSession(userCredential.user);
            return userCredential;
       
        } catch (error) {
            const authError = error as AuthError;
            throw new Error(this.getErrorMessage(authError.code));
        }
    },

    async signOut() {

        try {
           
            await signOut(auth);
            await AsyncStorage.removeItem('@user');
    
        } catch (error) {

            console.error("Erro ao fazer logout:", error);
            throw error;
            
        }
    },

    async saveUserData(uid: string, email: string, name: string) { //salva dados do usuario no firestore

        const { doc, setDoc } = await import('firebase/firestore');

        await setDoc(doc(db, 'users', uid), {
            name, email, createdAt: new Date(),
            initialSetup: false //pra saber se ja configurou renda inicial
        });
    },

    async persistUserSession(user: User) { //persistir sessao (salva dados basicos no async storage p manter e permite recuperar msm fechando o app)
        
        const userData = {
            uid: user.uid,
            email: user.email,
        };
        
        await AsyncStorage.setItem('@user', JSON.stringify(userData));
    
    },

    async getCurrentUser() { //recuperar sessao
        const userJson = await AsyncStorage.getItem('@user');
        return userJson ? JSON.parse(userJson) : null;
    },

    getErrorMessage(code: string): string {

        switch (code) {
            
            case 'auth/email-already-in-use':
                return 'Este email já está em uso';
            case 'auth/invalid-email':
                return 'Email inválido';
            case 'auth/weak-password':
                return 'Senha fraca (mínimo 6 caracteres)';
            case 'auth/user-not-found':
                return 'Usuário não encontrado';
            case 'auth/wrong-password':
                return 'Senha incorreta';
            case 'auth/network-request-failed':
                return 'Erro de conexão. Verifique sua internet.';
            default:
                return 'Erro na autenticação. Tente novamente.';
        }
    }
};