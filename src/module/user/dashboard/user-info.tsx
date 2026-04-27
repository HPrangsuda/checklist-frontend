import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/core/contexts/language-context";
import { sessionStore } from "@/core/lib/store";
import { TrendingUp } from "lucide-react";

export default function UserInfo() {
  const { t } = useTranslation();
  const gender = sessionStore.state.session?.gender;
  const firstName = sessionStore.state.session?.firstName;

  const imageSrc =
    !gender || gender === "NOT_SAY" || gender === "null" || gender === "undefined"
      ? "/target.png"
      : gender === "MALE"
      ? "/avatar-mw.png"
      : gender === "FEMALE"
      ? "/avatar-wr.png"
      : "/target.png";

  return (
    <div className="w-full">
      <Card className="rounded-xl user-info-bg shadow-none border-0 p-[30px] pb-3 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-12 gap-4">
            {/* Left Content */}
            <div className="md:col-span-7 col-span-12">
              <div className="flex gap-4 items-center mb-6">
                <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="text-gray-700 opacity-70 w-6 h-6" />
                </div>
                <h5 className="text-lg text-white font-medium">
                  {t("Welcome Back")} {firstName}
                </h5>
              </div>

              <div className="flex w-full xl:mt-12 sm:mt-12 lg:mt-6 mt-6">
                {/* KPI Value 1 */}
                <div className="border-r border-white/20 pr-4">
                  <p className="text-white opacity-75 text-sm mb-1">{t("Monthly Kpi")}</p>
                  <h2 className="text-white text-2xl font-semibold">0%</h2>
                </div>
                {/* KPI Value 2 */}
                <div className="pl-4">
                  <p className="text-white opacity-75 text-sm mb-1">{t("Overall Kpi")}</p>
                  <h2 className="text-white text-2xl font-semibold">0%</h2>
                </div>
              </div>
            </div>

            {/* Right Content - Image */}
            <div className="md:col-span-5 col-span-12 md:ml-auto ml-auto mr-auto">
              <div className="relative">
                <img
                  alt="user avatar"
                  width={298}
                  height={372}
                  className="-mb-5 rtl:scale-x-[-1] xl:max-w-[150px] lg:max-w-36 md:max-w-36 max-w-32 lg:pl-4 md:pt-0 pt-6"
                  src={imageSrc}
                  style={{ color: "transparent" }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
