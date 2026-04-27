import type React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Calendar, Activity, Users, Contact, Target, FolderOpen,
    FileText, Receipt, ShoppingCart, FileSpreadsheet, UserCheck,
    CheckSquare, Settings, Cog, Car, DoorOpen, Calculator, Building
} from "lucide-react";
import { RoleType } from "@/core/types/common";
import { sessionStore } from "@/core/lib/store";
import { usePermissions } from "@/core/hooks/permission.provider";
import { useTranslation } from "@/core/contexts/language-context";


const adminLinks = ["account", "crm", "checklist", "hr", "vehicle", "door_record"]
const crmLinks = ["calendar", "activity", "lead", "contact", "opportunities", "project"]
const accountLinks = ["inet", "billing_note", "order_status", "order", "invoice", "seller"]
const checklistLinks = ["checklist", "machines", "questions"]

interface QuickLinkItem {
    id: string
    name: string
    icon: React.ReactNode
    href: string
}

export default function QuickLinks() {
    const { t } = useTranslation();
    const role = sessionStore.state.session?.role;
    const { hasModuleAccess } = usePermissions();
    
    let links: QuickLinkItem[] = [];

    const allQuickLinks: QuickLinkItem[] = [
        { id: "calendar", name: t("Calendar"), icon: <Calendar className="w-6 h-6" />, href: "/crm/calendar" },
        { id: "activity", name: t("Activities"), icon: <Activity className="w-6 h-6" />, href: "/crm/activity" },
        { id: "lead", name: t("Lead"), icon: <Target className="w-6 h-6" />, href: "/crm/leads" },
        { id: "contact", name: t("contact"), icon: <Contact className="w-6 h-6" />, href: "/crm/contacts" },
        { id: "opportunities", name: t("Opportunities"), icon: <Users className="w-6 h-6" />, href: "/crm/opportunities" },
        { id: "project", name: t("Project"), icon: <FolderOpen className="w-6 h-6" />, href: "/crm/projects" },
        { id: "inet", name: t("Inet"), icon: <FileSpreadsheet className="w-6 h-6" />, href: "/account/inet" },
        { id: "billing_note", name: t("Billing Note"), icon: <Receipt className="w-6 h-6" />, href: "/account/billing-notes" },
        { id: "order_status", name: t("Order Status"), icon: <FileText className="w-6 h-6" />, href: "/account/order-status" },
        { id: "order", name: t("Order"), icon: <ShoppingCart className="w-6 h-6" />, href: "/account/orders" },
        { id: "invoice", name: t("Invoice"), icon: <FileText className="w-6 h-6" />, href: "/account/invoices" },
        { id: "seller", name: t("Seller"), icon: <UserCheck className="w-6 h-6" />, href: "/account/sellers" },
        { id: "checklist", name: t("Checklist"), icon: <CheckSquare className="w-6 h-6" />, href: "/checklist" },
        { id: "machines", name: t("Machines"), icon: <Cog className="w-6 h-6" />, href: "/checklist/machines" },
        { id: "questions", name: t("Questions"), icon: <FileText className="w-6 h-6" />, href: "/checklist/questions" },
        { id: "account", name: t("Account"), icon: <Calculator className="w-6 h-6" />, href: "/account" },
        { id: "crm", name: t("CRM"), icon: <Users className="w-6 h-6" />, href: "/crm" },
        { id: "admin", name: t("Admin"), icon: <Settings className="w-6 h-6" />, href: "/admin" },
        { id: "hr", name: t("HR"), icon: <Building className="w-6 h-6" />, href: "/hr" },
        { id: "vehicle", name: t("Vehicle"), icon: <Car className="w-6 h-6" />, href: "/vehicles" },
        { id: "door_record", name: t("Door Record"), icon: <DoorOpen className="w-6 h-6" />, href: "/door-records" },
    ];

    if (role?.roleType === RoleType.ADMINISTRATOR) {
        links = adminLinks
            .map(id => allQuickLinks.find(item => item.id === id))
            .filter((item): item is QuickLinkItem => !!item);
    } else {
        let linkIds: string[] = [];
        if (hasModuleAccess('account')) {
            linkIds = linkIds.concat(accountLinks);
        }
        if (hasModuleAccess('crm')) {
            linkIds = linkIds.concat(crmLinks);
        }
        if (hasModuleAccess('checklist')) {
            linkIds = linkIds.concat(checklistLinks);
        }
        if (hasModuleAccess('door')) {
            linkIds = linkIds.concat(["door"]);
        }
        if (hasModuleAccess('vehicle')) {
            linkIds = linkIds.concat(["vehicle"]);
        }
        if (hasModuleAccess('hr')) {
            linkIds = linkIds.concat(["hr"]);
        }
        linkIds = linkIds.filter((id, idx) => linkIds.indexOf(id) === idx);
        links = linkIds
            .map(id => allQuickLinks.find(item => item.id === id))
            .filter((item): item is QuickLinkItem => !!item);
    }
    links = links.slice(0, 6);
    return (
        <Card className="w-full shadow-none">
            <CardHeader>
                <div className="grid gap-1.5">
                    <CardTitle>{t("Quick Links")}</CardTitle>
                    <CardDescription>{t("Access Frequently Used Applications")}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-3">
                    {links.map(({ id, href, icon }) => (
                        <a
                            key={id}
                            href={href}
                            className="group relative flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-10 transition-all duration-500 ease-in-out min-h-[98px] overflow-hidden hover:-translate-y-2">
                            {/* Morphing border effect */}
                            <div className="absolute inset-0 rounded-lg border-1 border-transparent group-hover:border-red-400 transition-all duration-500">
                                <div className="absolute inset-0 rounded-lg red-400 opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                            </div>
                            {/* Floating dots animation */}
                            <div className="absolute top-2 right-2 w-1 h-1 bg-red-400 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300 delay-100"></div>
                            <div className="absolute top-3 right-4 w-0.5 h-0.5 bg-gray-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300 delay-200"></div>
                            <div className="absolute top-4 right-3 w-0.5 h-0.5 bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300 delay-300"></div>
                            {/* Icon with rotation and glow */}
                            <div className="relative z-10 text-gray-600 group-hover:text-red-600 transition-all duration-500 mb-2 group-hover:drop-shadow-lg">
                                <div className="group-hover:animate-pulse">{icon}</div>
                            </div>
                            {/* Text with slide-up reveal */}
                            <div className="relative overflow-hidden">
                                <span className="block text-sm font-medium text-gray-700 group-hover:text-red-600 text-center leading-tight transition-all duration-500">
                                    {id}
                                </span>
                            </div>
                            {/* Ripple effect */}
                            <div className="absolute inset-0 rounded-lg bg-red-400 opacity-0 group-hover:opacity-10 transform scale-0 group-hover:scale-100 transition-all duration-700 ease-out"></div>
                            {/* Side accent bars */}
                            <div className="absolute left-0 top-1/2 w-1 h-0 bg-gradient-to-b from-red-400 to-red-600 group-hover:h-8 transition-all duration-500 transform -translate-y-1/2 rounded-r-full"></div>
                            <div className="absolute right-0 top-1/2 w-1 h-0 bg-gradient-to-b from-gray-500 to-gray-700 group-hover:h-8 transition-all duration-500 delay-100 transform -translate-y-1/2 rounded-l-full"></div>
                        </a>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
