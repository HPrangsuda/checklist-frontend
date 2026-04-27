import type { SessionDTO } from "@/core/types/common";

export class StorageService {
    setActiveUser(user: SessionDTO): void {
        if (user.language) {
            localStorage.setItem("lang", user.language);
        }
        
        if (user.memberId) {
            try {
                localStorage.setItem("u_key", btoa(user.memberId.toString()));
            } catch (error) {
                localStorage.setItem("u_key", "");
            }
        }
        
        if (user.avatarKey) {
            try {
                localStorage.setItem("av_key", btoa(user.avatarKey));
            } catch (error) {
                localStorage.setItem("av_key", "");
            }
        }
        
        if (user.departments && user.departments.length > 0 && user.departments[0].id) {
            try {
                localStorage.setItem("d_key", btoa(user.departments[0].id.toString()));
            } catch (error) {
                localStorage.setItem("d_key", "");
            }
        }
    }

    setDepartmentId(id: any) {
        if (id) {
            try {
                localStorage.setItem("d_key", btoa(id.toString()));
            } catch (error) {
                localStorage.setItem("d_key", "");
            }
        }
    }

    getLanguage(): string | null {
        return localStorage.getItem("lang");
    }

    getMemberId(): string | null {
        const u_key = localStorage.getItem("u_key");
        if (!u_key) return null;
        try {
            return atob(u_key);
        } catch (error) {
            return null;
        }
    }

    getDepartmentId(): string | null {
        const d_key = localStorage.getItem("d_key");
        if (!d_key) return null;
        try {
            return atob(d_key);
        } catch (error) {
            return null;
        }
    }

    getAvatarUrl(): string | null {
        const av_key = localStorage.getItem("av_key");
        if (!av_key) return null;
        try {
            return atob(av_key);
        } catch (error) {
            return null;
        }
    }
}
export const storageService = new StorageService();