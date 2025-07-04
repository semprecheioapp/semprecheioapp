import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Connection, InsertConnection } from "../../shared/schema";
import { 
  Plus, 
  Search, 
  Globe, 
  Clock, 
  WifiOff, 
  RefreshCw, 
  Settings, 
  Trash, 
  MessageSquare 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WhatsAppChannels() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [newConnection, setNewConnection] = useState<Partial<InsertConnection>>({});
  const queryClient = useQueryClient();

  // Fetch connections
  const { data: connections = [], isLoading } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
  });

  // Fetch clients for the select dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Create connection mutation
  const createConnectionMutation = useMutation({
    mutationFn: (connection: InsertConnection) => 
      apiRequest("/api/connections", "POST", connection),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      setShowAddModal(false);
      setNewConnection({});
      toast({ title: "Conexão criada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar conexão", variant: "destructive" });
    }
  });

  // Update connection mutation
  const updateConnectionMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<InsertConnection> }) =>
      apiRequest(`/api/connections/${id}`, "PATCH", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      setShowEditModal(false);
      setEditingConnection(null);
      toast({ title: "Conexão atualizada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar conexão", variant: "destructive" });
    }
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/connections/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({ title: "Conexão excluída com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir conexão", variant: "destructive" });
    }
  });

  // Validate connection mutation
  const validateConnectionMutation = useMutation({
    mutationFn: ({ host, token }: { host: string; token: string }) =>
      apiRequest("/api/connections/validate", "POST", { host, token }),
    onSuccess: (data: any) => {
      toast({ 
        title: data.success ? "Conexão válida!" : "Conexão inválida",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: () => {
      toast({ title: "Erro ao validar conexão", variant: "destructive" });
    }
  });

  // Filter connections based on search
  const filteredConnections = connections.filter(conn => 
    conn.instance?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conn.host?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conn.clientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conn.id.toString().includes(searchTerm)
  );

  const handleValidateConnection = (host: string, token: string) => {
    validateConnectionMutation.mutate({ host, token });
  };

  const handleEditConnection = (connection: Connection) => {
    setEditingConnection(connection);
    setShowEditModal(true);
  };

  const handleDeleteConnection = (id: number) => {
    if (confirm("Tem certeza de que deseja excluir esta conexão?")) {
      deleteConnectionMutation.mutate(id);
    }
  };

  const handleCreateConnection = () => {
    if (!newConnection.instance || !newConnection.token || !newConnection.host || !newConnection.clientId) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    createConnectionMutation.mutate(newConnection as InsertConnection);
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Canais WhatsApp</h1>
            <p className="text-gray-600 mt-2">Gerencie suas instâncias e conexões WhatsApp</p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 text-base"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Canal
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por instância, host, ID ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-gray-200"
            />
          </div>
        </div>

        {/* Connections Grid */}
        {filteredConnections.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-3">
              {searchTerm ? "Nenhuma conexão encontrada" : "Nenhuma conexão configurada"}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm 
                ? "Tente ajustar os termos de busca ou limpe o filtro."
                : "Comece adicionando sua primeira conexão WhatsApp para gerenciar seus canais de comunicação."
              }
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-base"
              >
                <Plus className="w-5 h-5 mr-2" />
                Adicionar Primeira Conexão
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredConnections.map((connection) => (
              <Card key={connection.id} className="bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow rounded-lg">
                <CardContent className="p-6">
                  {/* Header with Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-semibold text-sm">
                          {connection.instance?.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {connection.instance}
                        </h3>
                        <p className="text-sm text-gray-500">ID: {connection.id}</p>
                      </div>
                    </div>
                    <Badge 
                      className={`px-3 py-1 text-sm font-medium rounded-full ${
                        connection.isActive 
                          ? "bg-blue-600 text-white" 
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {connection.isActive ? "Conectado" : "Desconectado"}
                    </Badge>
                  </div>

                  {/* Connection Info */}
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <Globe className="w-4 h-4 mr-2" />
                      <span className="truncate">{connection.host}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Última sincronização: Nunca sincronizado</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateConnectionMutation.mutate({
                        id: connection.id,
                        updates: { isActive: !connection.isActive }
                      })}
                      className="h-9 text-sm border-gray-300 hover:bg-gray-50"
                    >
                      <WifiOff className="w-4 h-4 mr-1" />
                      Desconectar
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleValidateConnection(connection.host!, connection.token!)}
                      disabled={validateConnectionMutation.isPending}
                      className="h-9 text-sm border-gray-300 hover:bg-gray-50"
                    >
                      <RefreshCw className={`w-4 h-4 mr-1 ${validateConnectionMutation.isPending ? 'animate-spin' : ''}`} />
                      Sincronizar
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditConnection(connection)}
                      className="h-9 text-sm border-gray-300 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Configurar
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteConnection(connection.id)}
                      disabled={deleteConnectionMutation.isPending}
                      className="h-9 text-sm bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Conexão</DialogTitle>
              <DialogDescription>
                Configure uma nova conexão com a API do WhatsApp Business
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="instance">Instance *</Label>
                <Input
                  id="instance"
                  value={newConnection.instance || ""}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, instance: e.target.value }))}
                  placeholder="Ex: megacode-MFEV4XdMgfE"
                />
              </div>
              <div>
                <Label htmlFor="token">Token *</Label>
                <Input
                  id="token"
                  type="password"
                  value={newConnection.token || ""}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, token: e.target.value }))}
                  placeholder="Token da API"
                />
              </div>
              <div>
                <Label htmlFor="host">Host *</Label>
                <Input
                  id="host"
                  value={newConnection.host || ""}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="Ex: https://api.whatsapp.com"
                />
              </div>
              <div>
                <Label htmlFor="clientId">Empresa/Cliente *</Label>
                <Select
                  value={newConnection.clientId || ""}
                  onValueChange={(value) => setNewConnection(prev => ({ ...prev, clientId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={newConnection.isActive || false}
                  onCheckedChange={(checked) => setNewConnection(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Is Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateConnection}
                disabled={createConnectionMutation.isPending}
                className="w-full"
              >
                {createConnectionMutation.isPending ? "Criando..." : "Criar Conexão"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Conexão</DialogTitle>
              <DialogDescription>
                Atualize as informações da conexão WhatsApp
              </DialogDescription>
            </DialogHeader>
            {editingConnection && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-instance">Instance</Label>
                  <Input
                    id="edit-instance"
                    value={editingConnection.instance || ""}
                    onChange={(e) => setEditingConnection(prev => prev ? { ...prev, instance: e.target.value } : null)}
                    placeholder="Ex: megacode-MFEV4XdMgfE"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-token">Token</Label>
                  <Input
                    id="edit-token"
                    type="password"
                    value={editingConnection.token || ""}
                    onChange={(e) => setEditingConnection(prev => prev ? { ...prev, token: e.target.value } : null)}
                    placeholder="Token da API"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-host">Host</Label>
                  <Input
                    id="edit-host"
                    value={editingConnection.host || ""}
                    onChange={(e) => setEditingConnection(prev => prev ? { ...prev, host: e.target.value } : null)}
                    placeholder="Ex: https://api.whatsapp.com"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-clientId">Empresa/Cliente</Label>
                  <Select
                    value={editingConnection.clientId || ""}
                    onValueChange={(value) => setEditingConnection(prev => prev ? { ...prev, clientId: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isActive"
                    checked={editingConnection.isActive || false}
                    onCheckedChange={(checked) => setEditingConnection(prev => prev ? { ...prev, isActive: checked } : null)}
                  />
                  <Label htmlFor="edit-isActive">Is Active</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => {
                  if (editingConnection) {
                    updateConnectionMutation.mutate({
                      id: editingConnection.id,
                      updates: editingConnection
                    });
                  }
                }}
                disabled={updateConnectionMutation.isPending}
                className="w-full"
              >
                {updateConnectionMutation.isPending ? "Atualizando..." : "Atualizar Conexão"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}