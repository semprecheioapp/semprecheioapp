import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Building, Mail, Lock, User, ArrowRight, ArrowLeft, Phone, Briefcase } from "lucide-react";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../components/ui/phone-input.css';
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  serviceType: z.string().min(1, "Selecione o tipo de serviço"),
  customServiceType: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.serviceType === "outro" && (!data.customServiceType || data.customServiceType.trim().length < 2)) {
    return false;
  }
  return true;
}, {
  message: "Especifique o tipo de serviço",
  path: ["customServiceType"],
});

type RegisterRequest = z.infer<typeof registerSchema>;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const registerMutation = useMutation({
    mutationFn: async (registerData: RegisterRequest) => {
      const response = await apiRequest("/api/auth/register", "POST", registerData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Conta criada com sucesso!",
        description: "Sua conta foi criada. Você pode fazer login agora.",
      });
      // Redirect to login after successful registration
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Erro ao criar conta. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<RegisterRequest>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      serviceType: "",
      customServiceType: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterRequest) => {
    await registerMutation.mutateAsync(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="bg-white rounded-2xl shadow-xl border-0">
          <CardContent className="p-8 space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Building className="text-white w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Cadastrar Empresa</h1>
              <p className="text-gray-500 text-sm">Preencha os dados para criar sua conta</p>
            </div>

            {/* Formulário de Cadastro */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Nome da Empresa/Cliente
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ex: Clínica Beleza"
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-400"
                    {...form.register("name")}
                  />
                  <Building className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
                {form.formState.errors.name && (
                  <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  E-mail
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="contato@empresa.com"
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-400"
                    {...form.register("email")}
                  />
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
                {form.formState.errors.email && (
                  <p className="text-red-500 text-xs">{form.formState.errors.email.message}</p>
                )}
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Telefone
                </Label>
                <Controller
                  name="phone"
                  control={form.control}
                  render={({ field }) => (
                    <div className="relative">
                      <PhoneInput
                        {...field}
                        defaultCountry="BR"
                        international
                        countryCallingCodeEditable={false}
                        placeholder="(11) 99999-9999"
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-400"
                        style={{
                          '--PhoneInputCountryFlag-height': '1em',
                          '--PhoneInputCountrySelectArrow-color': '#6b7280',
                          '--PhoneInput-color--focus': '#3b82f6',
                        } as any}
                      />
                    </div>
                  )}
                />
                {form.formState.errors.phone && (
                  <p className="text-red-500 text-xs">{form.formState.errors.phone.message}</p>
                )}
              </div>

              {/* Service Type Field */}
              <div className="space-y-2">
                <Label htmlFor="serviceType" className="text-sm font-medium text-gray-700">
                  Tipo de Serviço
                </Label>
                <div className="relative">
                  <select
                    id="serviceType"
                    {...form.register("serviceType")}
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 bg-white appearance-none"
                  >
                    <option value="">Selecione o tipo de serviço</option>
                    <option value="clinica">Clínica</option>
                    <option value="salao">Salão de Beleza</option>
                    <option value="barbearia">Barbearia</option>
                    <option value="spa">Spa</option>
                    <option value="estetica">Estética</option>
                    <option value="fisioterapia">Fisioterapia</option>
                    <option value="consultorio">Consultório</option>
                    <option value="outro">Outro</option>
                  </select>
                  <Briefcase className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
                {form.formState.errors.serviceType && (
                  <p className="text-red-500 text-xs">{form.formState.errors.serviceType.message}</p>
                )}
              </div>

              {/* Custom Service Type Field - Only shows when "Outro" is selected */}
              {form.watch("serviceType") === "outro" && (
                <div className="space-y-2">
                  <Label htmlFor="customServiceType" className="text-sm font-medium text-gray-700">
                    Especifique o tipo de serviço
                  </Label>
                  <div className="relative">
                    <Input
                      id="customServiceType"
                      type="text"
                      placeholder="Ex: Academia, Pet Shop, Advocacia..."
                      className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-400"
                      {...form.register("customServiceType")}
                    />
                    <Briefcase className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  </div>
                  {form.formState.errors.customServiceType && (
                    <p className="text-red-500 text-xs">{form.formState.errors.customServiceType.message}</p>
                  )}
                </div>
              )}

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-400"
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirmar senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-400"
                    {...form.register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-red-500 text-xs">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Botão de Cadastro */}
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg"
              >
                {registerMutation.isPending ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>

            {/* Link para Login */}
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Já tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => window.location.href = "/"}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Fazer login
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
        <div className="text-center mt-4 text-xs text-gray-400">
          <p>© 2025 - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
}
