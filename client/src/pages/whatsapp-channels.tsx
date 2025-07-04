
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Globe, Plus, Edit, Trash2, Power, PowerOff, Key } from "lucide-react";
import { Connection } from "../shared/schema";

export default function WhatsAppChannels() {
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Connection | null>(null);
  const [formData, setFormData] = useState({
    instance: "",
    token: "",
    host: "",
    isActive: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar conexões
  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["/api/connections"],
    queryFn: async () => {
      const response = await fetch("/api/connections");
      if (!response.ok) throw new Error("Erro ao carregar conexões");
      return response.json();
    },
  });

  // Mutation para criar conexão
  const createChannelMutation = useMutation({
    mutationFn: async (data: Omit<Connection, 'id' | 'createdAt' | 'updatedAt' | 'lastSync'>) => {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar conexão");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      setShowModal(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Conexão criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conexão.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar conexão
  const updateChannelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Connection> }) => {
      const response = await fetch(`/api/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar conexão");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      setShowModal(false);
      setEditingChannel(null);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Conexão atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar conexão.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar conexão
  const deleteChannelMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/connections/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar conexão");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Sucesso!",
        description: "Conexão removida com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover conexão.",
        variant: "destructive",
      });
    },
  });

  // Mutation para toggle de status
  const toggleChannelMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Erro ao alterar status da conexão");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Sucesso!",
        description: `Conexão ${variables.isActive ? 'ativada' : 'desativada'} com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar status da conexão.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      instance: "",
      token: "",
      host: "",
      isActive: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.instance || !formData.token || !formData.host) {
      toast({
        title: "Erro",
        description: "Instância, token e host são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (editingChannel) {
      updateChannelMutation.mutate({
        id: editingChannel.id,
        data: formData,
      });
    } else {
      createChannelMutation.mutate(formData);
    }
  };

  const handleEdit = (channel: Connection) => {
    setEditingChannel(channel);
    setFormData({
      instance: channel.instance,
      token: channel.token,
      host: channel.host,
      isActive: channel.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta conexão?")) {
      deleteChannelMutation.mutate(id);
    }
  };

  const handleToggleStatus = (channel: Connection) => {
    const newStatus = !channel.isActive;
    const action = newStatus ? "ativar" : "desativar";

    if (confirm(`Tem certeza que deseja ${action} esta conexão?`)) {
      toggleChannelMutation.mutate({
        id: channel.id,
        isActive: newStatus,
      });
    }
  };

  const openNewModal = () => {
    setEditingChannel(null);
    resetForm();
    setShowModal(true);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conexões WhatsApp</h1>
        <p className="text-gray-600">
          Configure e gerencie as conexões do WhatsApp para comunicação com clientes
        </p>
      </div>

      {/* Botão de Adicionar */}
      <div className="mb-6">
        <Button onClick={openNewModal} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Conexão
        </Button>
      </div>

      {/* Lista de Canais */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando conexões...</p>
        </div>
      ) : channels.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conexão configurada</h3>
            <p className="text-gray-600 mb-4">Configure sua primeira conexão do WhatsApp para começar.</p>
            <Button onClick={openNewModal} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Conexão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {channels.map((channel: Connection) => (
            <Card key={channel.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{channel.instance}</h3>
                      <Badge variant={channel.isActive ? "default" : "destructive"}>
                        {channel.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Globe className="w-4 h-4" />
                        <span>{channel.host}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Key className="w-4 h-4" />
                        <span>Token: {channel.token.substring(0, 10)}...</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(channel)}
                      className={channel.isActive
                        ? "text-orange-600 hover:text-orange-700"
                        : "text-green-600 hover:text-green-700"
                      }
                    >
                      {channel.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(channel)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(channel.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChannel ? "Editar Conexão" : "Nova Conexão"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instance">Nome da Instância</Label>
              <Input
                id="instance"
                value={formData.instance}
                onChange={(e) => setFormData(prev => ({ ...prev, instance: e.target.value }))}
                placeholder="Ex: instancia-principal"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="host">Host da API</Label>
              <Input
                id="host"
                value={formData.host}
                onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                placeholder="Ex: https://api.whatsapp.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Token de Acesso</Label>
              <Input
                id="token"
                type="password"
                value={formData.token}
                onChange={(e) => setFormData(prev => ({ ...prev, token: e.target.value }))}
                placeholder="Token de autenticação da API"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Conexão ativa</Label>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createChannelMutation.isPending || updateChannelMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {editingChannel ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
