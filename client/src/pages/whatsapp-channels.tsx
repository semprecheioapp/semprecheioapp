
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
import { MessageCircle, Phone, Plus, Edit, Trash2, Power, PowerOff, Webhook, Key } from "lucide-react";
import { WhatsAppChannel } from "../shared/schema";

export default function WhatsAppChannels() {
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<WhatsAppChannel | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    isActive: true,
    apiKey: "",
    webhookUrl: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar canais
  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["/api/whatsapp-channels"],
    queryFn: async () => {
      const response = await fetch("/api/whatsapp-channels");
      if (!response.ok) throw new Error("Erro ao carregar canais");
      return response.json();
    },
  });

  // Mutation para criar canal
  const createChannelMutation = useMutation({
    mutationFn: async (data: Omit<WhatsAppChannel, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await fetch("/api/whatsapp-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar canal");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-channels"] });
      setShowModal(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Canal criado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar canal.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar canal
  const updateChannelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WhatsAppChannel> }) => {
      const response = await fetch(`/api/whatsapp-channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar canal");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-channels"] });
      setShowModal(false);
      setEditingChannel(null);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Canal atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar canal.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar canal
  const deleteChannelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/whatsapp-channels/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar canal");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-channels"] });
      toast({
        title: "Sucesso!",
        description: "Canal removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover canal.",
        variant: "destructive",
      });
    },
  });

  // Mutation para toggle de status
  const toggleChannelMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/whatsapp-channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Erro ao alterar status do canal");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-channels"] });
      toast({
        title: "Sucesso!",
        description: `Canal ${variables.isActive ? 'ativado' : 'desativado'} com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar status do canal.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      isActive: true,
      apiKey: "",
      webhookUrl: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios.",
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

  const handleEdit = (channel: WhatsAppChannel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      phone: channel.phone,
      isActive: channel.isActive,
      apiKey: channel.apiKey || "",
      webhookUrl: channel.webhookUrl || "",
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja remover este canal?")) {
      deleteChannelMutation.mutate(id);
    }
  };

  const handleToggleStatus = (channel: WhatsAppChannel) => {
    const newStatus = !channel.isActive;
    const action = newStatus ? "ativar" : "desativar";

    if (confirm(`Tem certeza que deseja ${action} este canal?`)) {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Canais do WhatsApp</h1>
        <p className="text-gray-600">
          Configure e gerencie os canais do WhatsApp para comunicação com clientes
        </p>
      </div>

      {/* Botão de Adicionar */}
      <div className="mb-6">
        <Button onClick={openNewModal} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Canal
        </Button>
      </div>

      {/* Lista de Canais */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando canais...</p>
        </div>
      ) : channels.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum canal configurado</h3>
            <p className="text-gray-600 mb-4">Configure seu primeiro canal do WhatsApp para começar.</p>
            <Button onClick={openNewModal} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Canal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {channels.map((channel: WhatsAppChannel) => (
            <Card key={channel.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{channel.name}</h3>
                      <Badge variant={channel.isActive ? "default" : "destructive"}>
                        {channel.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Phone className="w-4 h-4" />
                        <span>{channel.phone}</span>
                      </div>
                      {channel.apiKey && (
                        <div className="flex items-center space-x-1">
                          <Key className="w-4 h-4" />
                          <span>API configurada</span>
                        </div>
                      )}
                      {channel.webhookUrl && (
                        <div className="flex items-center space-x-1">
                          <Webhook className="w-4 h-4" />
                          <span>Webhook configurado</span>
                        </div>
                      )}
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
              {editingChannel ? "Editar Canal" : "Novo Canal"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Canal</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Atendimento Principal"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Número do WhatsApp</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Ex: +5511999999999"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">Chave da API (Opcional)</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Chave da API do WhatsApp Business"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookUrl">URL do Webhook (Opcional)</Label>
              <Input
                id="webhookUrl"
                value={formData.webhookUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                placeholder="https://exemplo.com/webhook"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Canal ativo</Label>
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
