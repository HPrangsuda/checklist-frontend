import Template from '@/components/layout/template'
import { useTranslation } from '@/core/contexts/language-context';
import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { Home, BookUp, PackageCheck, CalendarDays, Contact, Factory, Handshake, SquareActivity } from "lucide-react";

export const Route = createFileRoute('/crm')({
  component: CrmLayout,
})

function CrmLayout() {
  const { t } = useTranslation();
  const { navigate } = useRouter();
  const pathname = useRouterState({ select: state => state.location.pathname });

  const navItems = [
    {
        title: t("General"),
        items: [
          { title: t("Dashboard"), url: "/crm/dashboard", icon: Home, soon: false },
          { title: t("Calender"), url: "/crm/calender", icon: CalendarDays, soon: false },
          { title: t("Contacts"), url: "/crm/contacts", icon: Contact, soon: false },
          { title: t("Leads"), url: "/crm/leads", icon: Factory, soon: false },
          { title: t("Opportunities"), url: "/crm/opportunities", icon: Handshake, soon: false },
          { title: t("Activities"), url: "/crm/activities", icon: SquareActivity, soon: false },
        ]
    },
    {
        title: t("Extra Data"),
        items: [
          { title: t("Lead Types"), url: "/crm/lead-types", icon: BookUp, soon: false },
          { title: t("Industry Types"), url: "/crm/industry-types", icon: PackageCheck, soon: false }
        ]
    }
  ];

  const handleNavigate = (path: string) => {
    navigate({ to: path });
  }
  return (
    <Template
      pathname={pathname}
      activeModule="crm"
      navItems={navItems}
      handleNavigate={handleNavigate}>
      <Outlet />
    </Template>
  )
}