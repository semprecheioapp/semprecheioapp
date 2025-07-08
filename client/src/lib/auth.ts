import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import type { User, LoginRequest } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include",
        });
        if (response.status === 401) {
          return null;
        }
        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }
        return response.json();
      } catch (error) {
        return null;
      }
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loginData: LoginRequest) => {
      // Fazer requisição segura - cookies JWT serão definidos automaticamente pelo servidor
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // IMPORTANTE: incluir cookies para JWT
        body: JSON.stringify(loginData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro no login");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Fazer logout seguro - cookies JWT serão limpos pelo servidor
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Incluir cookies para autenticação
      });

      if (!response.ok) {
        throw new Error("Erro no logout");
      }

      return response.json();
    },
    onSuccess: () => {
      // Limpar dados do usuário
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      // Limpar localStorage/sessionStorage se houver
      localStorage.clear();
      sessionStorage.clear();

      // Forçar reload da página para garantir limpeza completa
      window.location.href = '/';
    },
  });
}
