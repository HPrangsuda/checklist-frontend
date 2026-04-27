import Template from '@/components/layout/template';
import { useTranslation } from '@/core/contexts/language-context';
import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { Home, Landmark, KeyRound, User } from "lucide-react";

export const Route = createFileRoute('/admin')({
  component: UserLayout,
})

function UserLayout() {
  const { t } = useTranslation();
  const { navigate } = useRouter();
  const pathname = useRouterState({ select: state => state.location.pathname });

  const navItems = [
    {
      title: t("General"),
      items: [
        { title: t("Dashboard"), url: "/admin/dashboard", icon: Home, soon: false },
        { title: t("Departments"), url: "/admin/departments", icon: Landmark, soon: false },
        { title: t("Roles"), url: "/admin/roles", icon: KeyRound, soon: false },
        { title: t("Members"), url: "/admin/members", icon: User, soon: false },
      ]
    }
  ];
  
  const handleNavigate = (path: string) => {
    navigate({ to: path });
  }
  return (
    <Template
      pathname={pathname}
      activeModule="admin"
      navItems={navItems}
      handleNavigate={handleNavigate}>
      <Outlet />
    </Template>
  )
}