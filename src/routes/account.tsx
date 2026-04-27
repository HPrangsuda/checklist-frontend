import Template from '@/components/layout/template'
import { useTranslation } from '@/core/contexts/language-context';
import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { Home, BookUp, PackageCheck } from "lucide-react";

export const Route = createFileRoute('/account')({
  component: AccountLayout,
})

function AccountLayout() {
  const { t } = useTranslation();
  const { navigate } = useRouter();
  const pathname = useRouterState({ select: state => state.location.pathname });

  const navItems = [
    {
        title: t("General"),
        items: [
          { title: t("Dashboard"), url: "/account/dashboard", icon: Home, soon: false }
        ]
    },
    {
        title: t("Accounting"),
        items: [
          { title: t("Billing Note"), url: "/account/billing-notes", icon: BookUp, soon: false },
          { title: t("Order Status"), url: "/account/order-status", icon: PackageCheck, soon: false }
        ]
    },
    {
        title: t("E-Tax"),
        items: [
          { title: t("Inets"), url: "/account/inets", icon: BookUp, soon: false }
        ]
    }
  ];

  const handleNavigate = (path: string) => {
    navigate({ to: path });
  }
  return (
    <Template
      pathname={pathname}
      activeModule="account"
      navItems={navItems}
      handleNavigate={handleNavigate}>
      <Outlet />
    </Template>
  )
}