import { createContext, useState, useEffect, useContext } from 'react';
import api, { authApi } from '../api/axios';
import { toast } from 'react-hot-toast';
import { hasPermission as hasPermissionInSet } from '../utils/permissions';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load user from local storage on init
    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                setUser(JSON.parse(userInfo));
            } catch (error) {
                localStorage.removeItem('userInfo');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const { data } = await api.post('/auth/login', { username, password });
            if (data.success) {
                setUser(data.data);
                localStorage.setItem('userInfo', JSON.stringify(data.data));
                return { success: true };
            }
        } catch (error) {
            return { success: false, message: error.message || 'Login failed' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('userInfo');
        toast.success('Logged out successfully', { id: 'auth-logout' });
    };

    const updateStoredUser = (nextUser) => {
        setUser(nextUser);
        localStorage.setItem('userInfo', JSON.stringify(nextUser));
    };

    const refreshUser = async () => {
        const { data } = await authApi.getMe();
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const nextUser = { ...userInfo, ...data.data };
        updateStoredUser(nextUser);
        return nextUser;
    };

    const updateProfile = async (username) => {
        const { data } = await authApi.updateProfile({ username });
        updateStoredUser(data.data);
        toast.success(data.message || 'Profile updated successfully', { id: 'auth-profile-success' });
        return data;
    };

    const changePassword = async (payload) => {
        const { data } = await authApi.changePassword(payload);
        toast.success(data.message || 'Password changed successfully', { id: 'auth-password-success' });
        return data;
    };

    const hasPermission = (moduleKey, action = 'view') =>
        hasPermissionInSet(user?.permissions || [], moduleKey, action);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, refreshUser, updateProfile, changePassword, hasPermission }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
