export interface User { //garantem consistencia p desenvolver
    uid: string;
    email: string | null;
    name?: string;
    initialSetup?: boolean;
}

export interface SignUpData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface SignInData {
    email: string;
    password: string;
}

export interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
}