import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { setAuthToken } from '../services/api';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    login: () => { },
    logout: () => { },
    isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false); // Can be true if loading from storage

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        setAuthToken(newToken);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setAuthToken(null);
    };

    // In a real app, load token from AsyncStorage here

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
