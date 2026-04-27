import axios from 'axios';
import type { SessionDTO, ResponseDTO } from "@/core/types/common";
import { sessionStore } from "@/core/lib/store";
import { storageService } from './storage.service';

class AuthService {
    async isAuthenticated(): Promise<boolean> {
        const session = sessionStore.state.session;

        // ถ้าไม่มี token ไม่ต้องยิง backend
        if (!session?.accessToken) {
            return false;
        }

        try {
            const response = await axios.get<ResponseDTO<SessionDTO>>(
                '/api/auth/me',
                {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                }
            );

            const data = response.data;

            if (data.success && data.data) {
                sessionStore.setState({ session: data.data });
                storageService.setActiveUser(data.data);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Authentication check failed:', error);
            return false;
        }
    }

    async refreshToken(): Promise<boolean> {
        try {
            const response = await axios.post<ResponseDTO<SessionDTO>>('/api/auth/refresh', {}, {
                headers: {
                    'Content-Type': 'application/json',
                },
                withCredentials: true, // Important for HTTP-only cookies
            });
            
            const data = response.data;
            if (data.success && data.data) {
                sessionStore.setState({ session: data.data });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }
    async signOut(): Promise<void> {
        try {
            await axios.post('/api/auth/sign-out', {}, {
                withCredentials: true,
            });
        } catch (error) {
            console.error('Sign out failed:', error);
        } finally {
            sessionStore.setState({ session: null });
        }
    }

    hasValidTokens(): boolean {
        const session = sessionStore.state.session;
        return !!(session?.accessToken || session?.refreshToken);
    }

    getCurrentSession(): SessionDTO | null {
        return sessionStore.state.session;
    }

    isOrganizationMember(): boolean {
        const session = sessionStore.state.session;
        return !!(session?.memberId && session?.departments?.length > 0);
    }
}

export const authService = new AuthService();