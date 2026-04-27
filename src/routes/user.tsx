import Template from '@/components/layout/template';
import { useTranslation } from '@/core/contexts/language-context';
import { RoleType } from '@/core/types/common';
import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { Home, Settings2, Activity, ReceiptText } from "lucide-react";

export const Route = createFileRoute('/user')({
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
        { title: t("Dashboard"), url: "/user/dashboard", icon: Home, soon: false },
        { title: t("Invoices"), url: "/user/invoices", icon: ReceiptText, soon: false, roleTypes: [RoleType.ADMINISTRATOR, RoleType.OPERATION] },
        { title: t("Activities"), url: "/user/activities", icon: Activity, soon: false },
        { title: t("Setting"), url: "/user/setting", icon: Settings2, soon: false },
      ]
    }
  ];
  
  const handleNavigate = (path: string) => {
    navigate({ to: path });
  }
  return (
    <Template
      pathname={pathname}
      activeModule="user"
      navItems={navItems}
      handleNavigate={handleNavigate}>
      <Outlet />
    </Template>
  )
}