
import { Globe, ChevronDown } from 'lucide-react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/core/lib/utils";
import { sessionStore } from "@/core/lib/store";
import { storageService } from "@/core/service/storage.service";
import type { DepartmentDTO } from "@/core/types/common";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguageSwitch, useTranslation } from "@/core/contexts/language-context";
import { authService } from '@/core/service/auth.service';

const languages: { id: string; name: string; value: "en" | "th" }[] = [
  { id: "EN", name: "English", value: "en" },
  { id: "TH", name: "ไทย", value: "th" },
]

interface HeaderProps {
  activeModule: string
  pathname: string
  onNavigate?: (path: string) => void
}

export function Header({ activeModule, pathname, onNavigate }: HeaderProps) {
  const { language, setLanguage, isLoading } = useLanguageSwitch();
  const { t } = useTranslation();

  const session = sessionStore.state.session;
  const teams: DepartmentDTO[] = session?.departments || [];

  // Loading state: language or session
  if (isLoading || !session) {
    return (
      <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b bg-background px-4 w-full">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </header>
    )
  }

  // Name and email/role
  const name = session.firstName;
  const userEmail = session.roleType || "***********";
  const userInitial = name ? name.charAt(0).toUpperCase() : "?";

  // Avatar image
  const avatarUrl = session.avatarKey ? storageService.getAvatarUrl() : null;

  // Team logic
  const primaryTeam = useMemo(() =>
    Array.isArray(teams) ? (teams.find(team => team.isPrimary) || teams[0]) : null,
    [teams]
  );

  const [activeTeam, setActiveTeam] = useState<DepartmentDTO | null>(() => {
    const storedTeamId = storageService.getDepartmentId();
    if (storedTeamId && Array.isArray(teams)) {
      const storedTeam = teams.find(team => String(team.id) === String(storedTeamId));
      return storedTeam || primaryTeam || null;
    }
    return primaryTeam || null;
  });

  useEffect(() => {
    if (teams && teams.length > 0) {
      const storedTeamId = storageService.getDepartmentId();
      if (storedTeamId) {
        const storedTeam = teams.find(team => String(team.id) === String(storedTeamId));
        if (storedTeam) {
          setActiveTeam(storedTeam);
        } else if (primaryTeam) {
          setActiveTeam(primaryTeam);
          storageService.setDepartmentId(primaryTeam.id);
        }
      } else if (primaryTeam) {
        setActiveTeam(primaryTeam);
        storageService.setDepartmentId(primaryTeam.id);
      }
    }
  }, [teams, primaryTeam]);

  const handleLanguageChange = useCallback((lang: "en" | "th") => {
    setLanguage(lang)
  }, [setLanguage]);

  const handleNavigateToProfile = useCallback(() => {
    onNavigate && onNavigate("/user/dashboard")
  }, [onNavigate]);

  const handleNavigateToSettings = useCallback(() => {
    onNavigate && onNavigate("/user/setting")
  }, [onNavigate]);

  const handleLogout = useCallback(async () => {
    await authService.signOut();
    onNavigate?.("/authentication/signin");
  }, [onNavigate]);

  const getTeamColor = (team: DepartmentDTO) => {
    return "bg-gray-500";
  }

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b bg-background px-4 w-full">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="hidden sm:flex items-center text-sm gap-1">
          {activeModule}
          {pathname !== `/${activeModule}` && (
            <div className="flex items-center gap-1">
              <span className="mx-1 text-muted-foreground">&gt;</span>
              <span className="font-normal">
                {pathname.split("/").pop() ?? ""}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2 px-3 border border-border rounded-md" aria-label="Switch language">
              <Globe className="h-4 w-4" />
              <span className="text-sm font-normal">{language.toUpperCase()}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className='grid gap-1'>
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.id}
                onClick={() => handleLanguageChange(lang.value)}
                className={cn("flex items-center gap-2", language === lang.value && "bg-accent")}
                aria-label={`Switch to ${lang.name}`}
              >
                <span>{lang.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 h-8 px-3 border border-border rounded-md"
              aria-label="Switch team"
            >
              <div className="flex items-center gap-2">
                {activeTeam ? (
                  <>
                    <div className={`h-2 w-2 rounded-full ${getTeamColor(activeTeam)}`} />
                    <span className="text-sm font-normal">{activeTeam.name}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">{"No Team"}</span>
                )}
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel className='font-normal'>{t("Switch Team")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {teams && teams.length > 0 ? (
              teams.map((team) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => {
                    setActiveTeam(team);
                    storageService.setDepartmentId(team.id);
                  }}
                  className={cn("flex items-center gap-2", activeTeam?.id === team.id && "bg-accent")}
                  aria-label={`Switch to team ${team.name}`}
                >
                  <div className={`h-2 w-2 rounded-full ${getTeamColor(team)}`} />
                  <span>{team.name}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled className="text-muted-foreground">
                {t("No Team")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8" aria-label="User menu">
              <Avatar className="h-8 w-8 rounded-md">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={name} className="rounded-md" />
                ) : (
                  <AvatarFallback className="rounded-md">{userInitial}</AvatarFallback>
                )}
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-normal leading-none">{name}</p>
                <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleNavigateToProfile} aria-label="Profile">
                {t("Profile")}
                <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNavigateToSettings} aria-label="Settings">
                {t("Setting")}
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} aria-label="Logout">
              {t("Logout")}
              <DropdownMenuShortcut>⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}