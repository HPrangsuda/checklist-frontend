import type React from "react";
import { useState } from "react";
import { useRouter, createFileRoute, redirect } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/lib/utils";
import { toast } from "sonner";
import type { LarkResponseDTO, ResponseDTO, SessionDTO } from "@/core/types/common";
import { api } from "@/core/interceptor/api.interceptor";
import { sessionStore } from "@/core/lib/store";
import { authService } from "@/core/service/auth.service";
import { useTranslation } from "@/core/contexts/language-context";

export const Route = createFileRoute('/authentication/signin')({
    beforeLoad: async ({ search }: { search: { redirect?: string } }) => {
        const isAuthenticated = await authService.isAuthenticated();
        if (isAuthenticated) {
            const redirectTo = search.redirect || '/checklist/dashboard';
            throw redirect({ to: redirectTo });
        }
    },
    component: SigninPage,
});

function SigninPage({className,...props}: React.ComponentProps<"div">) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [isLarkLoading, setIsLarkLoading] = useState(false);
    const router = useRouter();
    const { t } = useTranslation();

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoginLoading(true);
        try {
            const payload = {
                username,
                password,
            };
            const response = await api.post<ResponseDTO<SessionDTO>>('/api/auth/sign-in', payload);
            console.log('response:', response);
            if (response.success) {
                sessionStore.setState({ session: response.data });
                toast.success(`${t("message", response.code)}`|| 'Signin successful');

                const searchParams = new URLSearchParams(window.location.search);
                const redirectTo = searchParams.get('redirect') || '/checklist/dashboard';

                router.navigate({ to: redirectTo });
            } else {
                toast.error(`${t("message", response.code)}` || 'Signin failed. Please check your credentials.');
            }
        } catch (error) {
            toast.error(t('Signin failed. Please try again'));
        } finally {
            setIsLoginLoading(false);
        }
    };

    const onLarkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLarkLoading(true);
        try {
            const response = await api.get<LarkResponseDTO>('/api/auth/lark/signin');
            if (response.success) {
                toast.success(`${t("message", response.code)}` || 'Lark signin requested');
            } else {
                toast.error(`${t("message", response.code)}` || 'Signin failed. Please check your credentials.');
            }
        } catch (error) {
            toast.error(t('Signin failed. Please try again'));
        } finally {
            setIsLarkLoading(false);
        }
    };

    return (
        <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
                <div className={cn("flex flex-col gap-6", className)} {...props}>
                    <Card className="overflow-hidden shadow-none p-0">
                        <CardContent className="grid p-0 md:grid-cols-2">
                            <form className="p-6 md:p-8" onSubmit={onSubmit}>
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col items-center text-center">
                                        <h1 className="text-2xl font-bold">
                                            {t("Welcome Back")}
                                        </h1>
                                        <p className="text-muted-foreground text-sm">
                                            {t("Signin to account")}
                                        </p>
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="username">{t("Username")}</Label>
                                        <Input
                                            id="username"
                                            type="text"
                                            value={username}
                                            placeholder={t("Enter Username")}
                                            autoComplete="username"
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                            disabled={isLoginLoading}
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <div className="flex items-center">
                                            <Label htmlFor="password">{t("Password")}</Label>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                placeholder={t("Enter Password")}
                                                autoComplete="current-password"
                                                onChange={(e) => setPassword(e.target.value)}
                                                //required
                                                disabled={isLoginLoading}
                                                className="pr-10"
                                            />
                                            <Button
                                                type="button"
                                                variant="link"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3"
                                                onClick={togglePasswordVisibility}
                                                tabIndex={-1}>
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                                <span className="sr-only">
                                                    {showPassword ? "Hide password" : "Show password"}
                                                </span>
                                            </Button>
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full border dark:text-white dark:bg-input/30 dark:border-input dark:hover:bg-input/50" disabled={isLoginLoading}>
                                        {isLoginLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {t("Signin")}
                                            </>
                                        ) : (
                                            t("Signin")
                                        )}
                                    </Button>
                                </div>
                            </form>
                            <div className="bg-muted relative border-gray-800 md:block">
                                <img
                                    src="/authentication/signin.png"
                                    alt="Image"
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}