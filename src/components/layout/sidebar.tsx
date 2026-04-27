import { Lock } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ModuleSwitcher } from "./switcher";
import { sessionStore } from "@/core/lib/store";
import { usePermissions } from "@/core/hooks/permission.provider";

export interface NavItem {
  title: string
  url?: string
  icon?: React.ComponentType<{ className?: string }>
  soon?: boolean
  roleTypes?: string[]
  isActive?: boolean
  action?: "dialog" | "link"
  dialogComponent?: React.ReactNode
  requiredPermission?: {
    module: string
    action?: "add" | "edit" | "delete" | "sync" | "import" | "export"
  }
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export interface SidebarProps {
  navItems?: NavGroup[]
  footerItems?: NavItem[]
  pathname?: string
  activeModule?: string
  onNavigate?: (path: string) => void
}

export function AppSidebar({
  navItems = [],
  footerItems,
  pathname,
  activeModule,
  onNavigate,
  ...props
}: SidebarProps & React.ComponentProps<typeof Sidebar>) {
  const { hasPermission, hasActionPermission } = usePermissions()

  const showOnlyRoleType = (roleType: string[] | null | undefined): boolean => {
    if (!roleType || roleType.length === 0) return true;
    const currentRole = sessionStore.state.session?.role.roleType;
    if (!currentRole) return false;
    return roleType.includes(currentRole);
  };

  const handleNavigation = (url: string) => {
    onNavigate && onNavigate(url)
  }

  const isRouteActive = (url?: string) => {
    if (!url) return false
    return pathname === url || pathname?.startsWith(`${url}/`)
  }

  const filterItemsByPermission = (items: NavItem[]): NavItem[] => {
    return items.filter((item) => {
      if (!item.requiredPermission) return true
      const { module, action } = item.requiredPermission
      if (!action) {
        return hasPermission(module)
      }
      return hasActionPermission(module, action)
    })
  }

  const renderMenuItem = (item: NavItem) => {
    return (
      <>
        {showOnlyRoleType(item.roleTypes) && (
          <SidebarMenuButton
            asChild
            isActive={isRouteActive(item.url)}
            onClick={() => item.url && handleNavigation(item.url)}
          >
            <button disabled={item.soon}>
              {item.icon && <item.icon className="size-4" />}
              <span>{item.title}</span>
              {item.soon && <Lock className="ml-auto h-2 w-2" />}
            </button>
          </SidebarMenuButton>
        )}
      </>
    )
  }
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <ModuleSwitcher activeModule={activeModule || "dashboard"} onNavigate={(url) => handleNavigation(url)} />
      </SidebarHeader>
      <SidebarContent>
        {navItems.map((group) => {
          const filteredItems = filterItemsByPermission(group.items)
          if (filteredItems.length === 0) return null
          return (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredItems.map((item) => (
                    <SidebarMenuItem key={item.title}>{renderMenuItem(item)}</SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}