import { Check, ChevronsUpDown, ShieldAlert, Users, FileSpreadsheet, ClipboardList, Settings } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "@/core/contexts/language-context";
import { usePermissions } from "@/core/hooks/permission.provider"

interface SwitcherProps {
  activeModule: string
  onNavigate?: (path: string) => void
}

export interface Module {
  id: string
  name: string
  path: string
  icon: React.ElementType
  permission: string
}

export function ModuleSwitcher({ activeModule, onNavigate }: SwitcherProps) {
  const { hasPermission } = usePermissions();
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const { t } = useTranslation()
  
  const modules: Module[] = [
    {
      id: "user",
      name: t("User Module"),
      path: "/user",
      icon: Users,
      permission: "user",
    },
    {
      id: "account",
      name: t("Account Module"),
      path: "/account",
      icon: FileSpreadsheet,
      permission: "account",
    },
    {
      id: "crm",
      name: t("Crm Module"),
      path: "/crm",
      icon: Users,
      permission: "crm",
    },
    {
      id: "checklist",
      name: t("Checklist Module"),
      path: "/checklist",
      icon: ClipboardList,
      permission: "checklist",
    },
    {
      id: "admin",
      name: t("Admin Module"),
      path: "/admin",
      icon: Settings,
      permission: "admin",
    },
  ];

  const accessibleModules = useMemo(() => {
    return modules.filter((module) => {
      if (module.permission === "user") {
        return true;
      }
      return hasPermission(module.permission);
    });
  }, [hasPermission]);

  useEffect(() => {
    const active = accessibleModules.find((module) => module.id === activeModule)
    const defaultModule = active || accessibleModules.find(module => module.permission === "user") || accessibleModules[0] || null
    setSelectedModule(defaultModule);
  }, [activeModule, accessibleModules]);

  const handleModuleChange = (module: Module) => {
    if (module.permission !== "user" && !hasPermission(module.permission)) {
      return;
    }
    setSelectedModule(module);
    onNavigate && onNavigate(module.path);
  }

  if (accessibleModules.length === 0 || !selectedModule) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="text-destructive">
            <ShieldAlert className="size-4 mr-2" />
            <span>{t("No Module Access")}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg"
              className="bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {selectedModule.icon && <selectedModule.icon className="size-4" />}
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Acme International</span>
                <span className="text-sm opacity-70 h-[18px]">{selectedModule.name}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-60" align="start">
            {accessibleModules.map((module) => (
              <DropdownMenuItem key={module.id} onSelect={() => handleModuleChange(module)}>
                <div className="flex items-center gap-2 w-full">
                  <module.icon className="size-4" />
                  <span>{module.name}</span>
                  {module.id === selectedModule.id && <Check className="ml-auto" />}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}