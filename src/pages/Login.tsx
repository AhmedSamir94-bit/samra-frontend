import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Calculator, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { PwaInstallButton } from "@/components/PwaInstallButton";

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || "/";

  if (isLoading) {
    return (
      <div className="app-page flex items-center justify-center">
        <p className="app-muted">جاري التحميل...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(username.trim(), password);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "حدث خطأ أثناء تسجيل الدخول";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-page flex items-center justify-center p-4" dir="rtl">
      <div className="absolute top-4 left-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md shadow-lg border-blue-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Calculator className="w-7 h-7 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl dark:text-white">تسجيل الدخول</CardTitle>
            <CardDescription className="dark:text-white/80">
              أدخل بياناتك للوصول إلى نظام نقطة البيع
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="dark:text-white">اسم المستخدم</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                className="dark:text-white dark:placeholder:text-white/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="dark:text-white">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="dark:text-white dark:placeholder:text-white/50"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2 dark:text-red-200 dark:bg-red-950/50 dark:border-red-900">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الدخول...
                </>
              ) : (
                "دخول"
              )}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between gap-2">
            <PwaInstallButton variant="card" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
