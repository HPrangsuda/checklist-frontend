import { redirect } from "@tanstack/react-router";
import { authService } from "@/core/service/auth.service";
import { sessionStore } from "@/core/lib/store";

export interface RouteGuardOptions {
  requireAuth?: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
  organizationOnly?: boolean;
}

export class RouteGuard {
  private static instance: RouteGuard;
  private isCheckingAuth = false;
  private authPromise: Promise<boolean> | null = null;

  private constructor() {}

  public static getInstance(): RouteGuard {
    if (!RouteGuard.instance) {
      RouteGuard.instance = new RouteGuard();
    }
    return RouteGuard.instance;
  }

  public async checkAuthentication(): Promise<boolean> {
    return true;
  }

  private async performAuthCheck(): Promise<boolean> {
    try {
      const isAuthenticated = await authService.isAuthenticated();
      if (!isAuthenticated) {
        sessionStore.setState({ session: null });
      }
      return isAuthenticated;
    } catch (error) {
      sessionStore.setState({ session: null });
      return false;
    }
  }

  public checkRolePermissions(allowedRoles?: string[]): boolean {
    const session = sessionStore.state.session;
    
    if (!session || !session.role) {
      return false;
    }

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }
    return allowedRoles.includes(session.role.roleType);
  }

  public checkOrganizationAccess(): boolean {
    const session = sessionStore.state.session;
    if (!session) {
      return false;
    }
    return true;
  }

  public async guard(options: RouteGuardOptions = {}): Promise<void> {
    const {
      requireAuth = true,
      redirectTo = '/authentication/signin',
      allowedRoles = [],
      organizationOnly = true
    } = options;

    if (!requireAuth) {
      return;
    }

    const isAuthenticated = await this.checkAuthentication();

    if (!isAuthenticated) {
      throw redirect({
        to: redirectTo,
        search: {
          redirect: window.location.pathname + window.location.search
        }
      });
    }

    if (organizationOnly && !this.checkOrganizationAccess()) {
      throw redirect({
        to: '/authentication/signin',
      });
    }

    if (allowedRoles.length > 0 && !this.checkRolePermissions(allowedRoles)) {
      throw redirect({
        to: '/authentication/signin',
      });
    }
  }

  public canAccessRoute(requiredPermissions?: string[]): boolean {
    const session = sessionStore.state.session;
    
    if (!session || !session.permissions) {
      return false;
    }

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    return requiredPermissions.every(permission => {
      return session.permissions.some(userPermission => 
        userPermission.module === permission
      );
    });
  }

  public getCurrentSession() {
    return sessionStore.state.session;
  }

  public isAuthenticatedSync(): boolean {
    return !!sessionStore.state.session;
  }
}

export const routeGuard = RouteGuard.getInstance();

export const requireAuth = (options?: Omit<RouteGuardOptions, 'requireAuth'>) => 
  routeGuard.guard({ requireAuth: true, ...options });

export const optionalAuth = (options?: Omit<RouteGuardOptions, 'requireAuth'>) => 
  routeGuard.guard({ requireAuth: false, ...options });

export const requireRole = (roles: string[]) => 
  routeGuard.guard({ requireAuth: true, allowedRoles: roles });

export const requirePermission = (permissions: string[]) => {
  const session = sessionStore.state.session;
  if (!session || !session.permissions) {
    throw redirect({ to: '/authentication/signin' });
  }
  
  const hasPermission = permissions.every(permission => {
    return session.permissions.some(userPermission => 
      userPermission.module === permission
    );
  });
  
  if (!hasPermission) {
    throw redirect({ 
      to: '/authentication/signin'
    });
  }
};

export const withRoleGuard = (roles: string[]) => async () => {
  await requireRole(roles);
};

export const withPermissionGuard = (permissions: string[]) => async () => {
  requirePermission(permissions);
};
