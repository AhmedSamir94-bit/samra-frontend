import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Calculator, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <p className="text-gray-600">جاري التحميل...</p>
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
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md shadow-lg border-blue-100">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Calculator className="w-7 h-7 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل بياناتك للوصول إلى نظام نقطة البيع</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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

          <div className="mt-5">
            <PwaInstallButton variant="card" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
