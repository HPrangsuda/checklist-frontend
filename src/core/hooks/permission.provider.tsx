import type React from "react"
import { createContext, useContext } from "react"
import { RoleType } from "@/core/types/common"
import { sessionStore } from "@/core/lib/store"

interface PermissionsContextType {
  hasModuleAccess: (module: string) => boolean
  hasPermission: (module: string) => boolean
  hasActionPermission: (module: string, action: "add" | "edit" | "delete" | "sync" | "import" | "export") => boolean
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

interface PermissionsProviderProps {
  children: React.ReactNode
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const role = sessionStore.state.session?.role
  const roleType = role?.roleType
  const permissions = sessionStore.state.session?.permissions ?? []

  const hasModuleAccess = (module: string): boolean => {
    const mod = module.toLowerCase()

    // ADMIN has access to everything
    if (roleType === RoleType.ADMINISTRATOR) return true

    // MANAGEMENT can access all except "system"
    if (roleType === RoleType.MANAGEMENT) {
      if (mod === "system") return false
      return permissions.some((p) => p.module.toLowerCase() === mod)
    }

    // For other roles, check if module is listed in permissions
    return permissions.some((p) => p.module.toLowerCase() === mod)
  }

  const hasPermission = (module: string): boolean => {
    return hasModuleAccess(module)
  }

  const hasActionPermission = (
    module: string,
    action: "add" | "edit" | "delete" | "sync" | "import" | "export"
  ): boolean => {
    const mod = module.toLowerCase()

    if (!hasModuleAccess(mod)) return false

    // ADMIN and MANAGEMENT shortcut
    if (roleType === RoleType.ADMINISTRATOR) return true
    if (roleType === RoleType.MANAGEMENT && mod !== "system") return true

    const permission = permissions.find((p) => p.module.toLowerCase() === mod)
    if (!permission) return false

    // Excluded actions override all
    if (permission.exclude.includes(action)) return false

    switch (action) {
      case "add":
        return permission.canAdd
      case "edit":
        return permission.canEdit
      case "delete":
        return permission.canDelete
      case "sync":
        return permission.canSync
      case "import":
        return permission.canImport
      case "export":
        return permission.canExport
      default:
        return false
    }
  }

  return (
    <PermissionsContext.Provider value={{ hasModuleAccess, hasPermission, hasActionPermission }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error("Permissions must be used within a PermissionsProvider")
  }
  return context
}