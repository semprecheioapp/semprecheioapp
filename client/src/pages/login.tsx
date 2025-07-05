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
import { Eye, EyeOff, Building, Mail, Lock, ArrowRight } from "lucide-react";

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
      console.log("Login - Iniciando processo de login");
      const result = await loginMutation.mutateAsync(data);
      console.log("Login - Resultado do login:", result);
      toast({
        title: "Sucesso!",
        description: result.message,
      });

      // Redirect based on user role
      let redirectPath = '/dashboard';
      if (result.user?.redirectPath) {
        redirectPath = result.user.redirectPath;
      } else if (result.user?.role === 'super_admin') {
        redirectPath = '/super-admin';
      } else if (result.user?.role === 'admin') {
        redirectPath = '/admin';
      }
      console.log("Login - Redirecionando para:", redirectPath);
      setLocation(redirectPath);
    } catch (error: any) {
      console.error("Login - Erro no processo de login:", error);
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas. Verifique seu e-mail e senha.",
        variant: "destructive",
      });
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 xs:p-6 sm:p-8 safe-area-inset">
      <div className="w-full max-w-sm xs:max-w-md sm:max-w-lg md:max-w-xl lg:max-w-md">
        <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
          <CardContent className="p-4 xs:p-6 sm:p-8 md:p-10 space-y-4 xs:space-y-6">
            {/* Logo Section */}
            <div className="text-center mb-6 xs:mb-8">
              <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                <Building className="text-white w-6 h-6 xs:w-8 xs:h-8 sm:w-10 sm:h-10" />
              </div>
              <div className="mb-3 xs:mb-4">
                <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-800 mb-1">SempreCheioApp</h2>
              </div>
              <h1 className="text-xl xs:text-2xl sm:text-3xl font-semibold text-gray-800 mb-2">Entrar</h1>
              <p className="text-gray-500 text-xs xs:text-sm sm:text-base">Acesse sua conta para continuar</p>
            </div>

            {/* Login Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 xs:space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs xs:text-sm font-medium text-gray-700">
                  E-mail
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="w-full px-3 xs:px-4 py-2.5 xs:py-3 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-400 text-sm xs:text-base"
                    {...form.register("email")}
                  />
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
                {form.formState.errors.email && (
                  <p className="text-red-500 text-xs">{form.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs xs:text-sm font-medium text-gray-700">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    className="w-full px-3 xs:px-4 py-2.5 xs:py-3 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-400 text-sm xs:text-base"
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-red-500 text-xs">{form.formState.errors.password.message}</p>
                )}
              </div>

              {/* Remember Me and Forgot Password */}
              <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between space-y-3 xs:space-y-0">
                <div className="flex items-center space-x-2 xs:space-x-3">
                  <Checkbox
                    id="rememberMe"
                    checked={form.watch("rememberMe")}
                    onCheckedChange={(checked) => form.setValue("rememberMe", !!checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="rememberMe" className="text-xs xs:text-sm text-gray-600 cursor-pointer">
                    Manter conectado
                  </Label>
                </div>

                <button
                  type="button"
                  className="text-xs xs:text-sm text-blue-500 hover:text-blue-600 transition-colors font-medium"
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
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 xs:py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:ring-4 focus:ring-blue-200 focus:outline-none text-sm xs:text-base"
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>{loginMutation.isPending ? "Entrando..." : "Entrar"}</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            </form>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-xs xs:text-sm text-gray-600">
                Não tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => window.location.href = "/cadastro"}
                  className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
                >
                  Cadastre-se aqui
                </button>
              </p>
            </div>


          </CardContent>
        </Card>

        {/* Biblical Verse */}
        <div className="text-center mt-4 xs:mt-6 px-4">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mb-3">
            <span className="text-red-500 text-lg">❤️</span>
            <p className="italic">
              "Honra ao Senhor com os teus bens e com as primícias de toda a tua renda;
              e se encherão os teus celeiros, e transbordarão de vinho os teus lagares."
            </p>
          </div>
          <p className="text-xs text-gray-500 font-medium">Provérbios 3:9-10</p>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-xs text-gray-400 px-4">
          <p>© 2025 - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
}
