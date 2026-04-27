import Template from '@/components/layout/template'
import { useTranslation } from '@/core/contexts/language-context';
import { createFileRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { Home, ClipboardCheckIcon, Wrench, Drill, PencilRuler, FileQuestion, PenBox, GroupIcon, User} from "lucide-react";

export const Route = createFileRoute('/checklist')({
  component: ChecklistLayout,
})

function ChecklistLayout() {
  const { t } = useTranslation();
  const { navigate } = useRouter();
  const pathname = useRouterState({ select: state => state.location.pathname });

  const navItems = [
    {
        title: t("General"),
        items: [
          { title: t("Dashboard"), url: "/checklist/dashboard", icon: Home, soon: false },
          { title: t("Checklist Records"), url: "/checklist/checklist-records", icon: ClipboardCheckIcon, soon: false },
          { title: t("Register"), url: "/checklist/register", icon: PenBox, soon: false },
          { title: t("Machine"), url: "/checklist/machine", icon: Drill, soon: false },
          { title: t("Maintenance"), url: "/checklist/maintenance", icon: Wrench, soon: false },
          { title: t("Calibration"), url: "/checklist/calibration", icon: PencilRuler, soon: false }
        ]
    },
    {
        title: t("Management"),
        items: [
          { title: t("Type"), url: "/checklist/type", icon: GroupIcon, soon: false },
          { title: t("Questions"), url: "/checklist/question", icon: FileQuestion, soon: false },
          { title: t("Members"), url: "/checklist/members", icon: User, soon: false }
        ]
    }
  ];

  const handleNavigate = (path: string) => {
    navigate({ to: path });
  }
  return (
    <Template
      pathname={pathname}
      activeModule="checklist"
      navItems={navItems}
      handleNavigate={handleNavigate}>
      <Outlet />
    </Template>
  )
}