import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useLogin } from "@/lib/auth";
import { loginSchema, type LoginRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Building, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { createErrorToast } from "@/lib/error-utils";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginRequest) => {
    try {
      const result = await loginMutation.mutateAsync(data);
      toast({
        title: "Sucesso!",
        description: result.message,
      });

      // Redirect based on user type
      if (result.user?.redirectPath) {
        setLocation(result.user.redirectPath);
      } else if (result.user?.userType === 'Super Admin') {
        setLocation('/super-admin');
      } else if (result.user?.userType === 'Admin da Empresa') {
        setLocation('/admin');
      } else {
        setLocation('/dashboard');
      }
    } catch (error: any) {
      const errorToast = createErrorToast(error, "Erro no login");
      toast(errorToast);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-background to-primary-100 flex items-center justify-center p-4 safe-area">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="card-modern border-0 shadow-xl overflow-hidden backdrop-blur-sm bg-card/95">
          <CardContent className="p-8 space-y-8">
            {/* Logo Section */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Building className="text-white w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">SempreCheioApp</h2>
                <h1 className="text-3xl font-bold text-foreground">Entrar</h1>
                <p className="text-muted-foreground">Acesse sua conta para continuar</p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  E-mail
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="input-modern pl-10 h-12"
                    {...form.register("email")}
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                </div>
                {form.formState.errors.email && (
                  <p className="text-destructive text-sm">{form.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="input-modern pl-10 pr-10 h-12"
                    {...form.register("password")}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-destructive text-sm">{form.formState.errors.password.message}</p>
                )}
              </div>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="rememberMe"
                    checked={form.watch("rememberMe")}
                    onCheckedChange={(checked) => form.setValue("rememberMe", !!checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">
                    Manter conectado
                  </Label>
                </div>

                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary-600 transition-colors font-medium"
                  onClick={() => {
                    toast({
                      title: "Funcionalidade em desenvolvimento",
                      description: "A recuperação de senha será implementada em breve.",
                    });
                  }}
                >
                  Esqueceu a senha?
                </button>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="btn-primary w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              >
                <span className="flex items-center justify-center space-x-2">
                  {loginMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </span>
              </Button>
            </form>

            {/* Register Link */}
            <div className="text-center pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => window.location.href = "/cadastro"}
                  className="text-primary hover:text-primary-600 font-medium transition-colors"
                >
                  Cadastre-se aqui
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Biblical Verse */}
        <div className="text-center mt-8 animate-fade-in">
          <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50 shadow-sm">
            <div className="flex items-start justify-center space-x-3 mb-3">
              <span className="text-red-500 text-xl mt-1">❤️</span>
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "Honra ao Senhor com os teus bens e com as primícias de toda a tua renda;
                e se encherão os teus celeiros, e transbordarão de vinho os teus lagares."
              </p>
            </div>
            <p className="text-xs text-muted-foreground/70 font-medium">Provérbios 3:9-10</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground/50">
          <p>© 2025 SempreCheioApp - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
}
