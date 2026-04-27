import { Derived, Store } from '@tanstack/store'
import { RoleType, type SessionDTO } from '@/core/types/common';

const SESSION_KEY = 'session';

const loadSession = (): SessionDTO | null => {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const sessionStore = new Store(
    { session: loadSession() },
    {
        onUpdate: () => {
            const session = sessionStore.state.session;
            if (session) {
                localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            } else {
                localStorage.removeItem(SESSION_KEY);
            }
        }
    }
);

export const roleType = new Derived({
    fn: () => sessionStore.state.session?.role || RoleType.MEMBER,
    deps: [sessionStore],
});
export const nameFirst = new Derived({
    fn: () => sessionStore.state.session?.firstName || '******',
    deps: [sessionStore],
});
export const nameLast = new Derived({
    fn: () => sessionStore.state.session?.lastName || '******',
    deps: [sessionStore],
});
export const departments = new Derived({
    fn: () => sessionStore.state.session?.departments || [],
    deps: [sessionStore],
});
export const permissions = new Derived({
    fn: () => sessionStore.state.session?.permissions || [],
    deps: [sessionStore],
});

roleType.mount();
nameFirst.mount();
nameLast.mount();
departments.mount();
permissions.mount();