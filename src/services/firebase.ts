import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, AuthError, UserCredential, User } from 'firebase/auth'
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "../services/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app)
export const db = getFirestore(app);

export const authService = {

    async signUp(email: string, password: string, name: string): Promise<UserCredential> {

        try {

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await this.saveUserData(userCredential.user.uid, email, name);
            return userCredential;

        } catch (error) {
            const authError = error as AuthError;
            throw new Error(this.getErrorMessage(authError.code));
        }
    },

    async signIn(email: string, password: string): Promise<UserCredential> {
        
        try {
            
            return await signInWithEmailAndPassword(auth, email, password);
       
        } catch (error) {
            const authError = error as AuthError;
            throw new Error(this.getErrorMessage(authError.code));
        }
    },

    async signOut() {
        await signOut(auth);
        await AsyncStorage.removeItem('@user');
    },

    async saveUserData(uid: string, email: string, name: string) {

        const { doc, setDoc } = await import('firebase/firestore');

        await setDoc(doc(db, 'users', uid), {
            name, email, createdAt: new Date(),
            initialSetup: false
        });
    },

    async persistUserSession(user: User) {
        
        const userData = {
            uid: user.uid,
            email: user.email,
        };
        
        await AsyncStorage.setItem('@user', JSON.stringify(userData));
    
    },

    async getCurrentUser() {
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