import Template from '@/components/layout/template'
import { useTranslation } from '@/core/contexts/language-context';
import { useAuth } from '@/core/contexts/auth-context';
import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { Home, ClipboardCheckIcon, Wrench, Drill, PencilRuler, FileQuestion, PenBox, GroupIcon, User } from "lucide-react";

export const Route = createFileRoute('/checklist')({
  component: ChecklistLayout,
})

function ChecklistLayout() {
  const { t }     = useTranslation('checklist');
  const { navigate } = useRouter();
  const pathname = useRouterState({ select: state => state.location.pathname });
  const { role } = useAuth();

  const isAdmin = role === 'ADMIN';

  const navItems = [
    {
      title: t("group_general"),
      items: [
        { title: t("nav_dashboard"),         url: "/checklist/dashboard",         icon: Home,               soon: false },
        { title: t("nav_checklist_records"), url: "/checklist/checklist-records", icon: ClipboardCheckIcon, soon: false },
        { title: t("nav_register"),          url: "/checklist/register",          icon: PenBox,             soon: false },
        { title: t("nav_machine"),           url: "/checklist/machine",           icon: Drill,              soon: false },
        { title: t("nav_maintenance"),       url: "/checklist/maintenance",       icon: Wrench,             soon: false },
        { title: t("nav_calibration"),       url: "/checklist/calibration",       icon: PencilRuler,        soon: false },
      ]
    },
    ...(isAdmin ? [{
      title: t("group_management"),
      items: [
        { title: t("nav_type"),      url: "/checklist/type",     icon: GroupIcon,    soon: false },
        { title: t("nav_questions"), url: "/checklist/question", icon: FileQuestion, soon: false },
        { title: t("nav_members"),   url: "/checklist/members",  icon: User,         soon: false },
      ]
    }] : []),
  ];

  return (
    <Template
      pathname={pathname}
      activeModule="checklist"
      navItems={navItems}
      handleNavigate={(path) => navigate({ to: path })}>
      <Outlet />
    </Template>
  );
}