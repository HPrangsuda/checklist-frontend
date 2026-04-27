import { useTranslation } from "@/core/contexts/language-context";

export function Footer() {
    const { t } = useTranslation();
    return (
        <footer className="bg-background py-4 border border-t">
            <div className="flex flex-col items-center justify-end gap-4 md:h-4 md:flex-row">
                <p className="text-center text-sm text-muted-foreground md:text-left pr-4">
                    {t("All Rights Reserved")}
                </p>
            </div>
        </footer>
    )
}