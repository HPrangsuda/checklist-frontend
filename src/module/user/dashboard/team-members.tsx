import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "@/core/contexts/language-context";

interface TeamMember {
    name: string;
    role: string;
    avatar: string;
    status: "online" | "away" | "offline";
}

export default function TeamMembers() {
    const { t } = useTranslation();
    
    const teamMembers: TeamMember[] = [
        { name: "Sarah Chen", role: "Product Manager", avatar: "/professional-woman-diverse.png", status: "online" },
        { name: "Mike Johnson", role: "Developer", avatar: "/professional-man.png", status: "away" },
        { name: "Emily Davis", role: "Designer", avatar: "/professional-woman-designer.png", status: "online" },
        { name: "Alex Rodriguez", role: "QA Engineer", avatar: "/professional-engineer.png", status: "offline" },
        { name: "Alex Rodriguez", role: "QA Engineer", avatar: "/professional-engineer.png", status: "offline" }
    ];
    return (
        <Card className="w-full shadow-none">
            <CardHeader>
                <div className="grid gap-1.5">
                    <CardTitle>{t("Team Members")}</CardTitle>
                    <CardDescription>{t("Summary of Key Platform Activities")}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {teamMembers.map((member, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <div className="relative">
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                                    <AvatarFallback>
                                        {member.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                    </AvatarFallback>
                                </Avatar>
                                <div
                                    className={`absolute -bottom-0 -right-0 w-3 h-3 rounded-full border-2 border-white ${member.status === "online"
                                            ? "bg-green-500"
                                            : member.status === "away"
                                                ? "bg-yellow-500"
                                                : "bg-gray-400"
                                        }`}
                                />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{member.name}</p>
                                <p className="text-xs text-gray-500">{member.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
