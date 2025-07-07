import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Plus, Edit, Trash2, DollarSign, Clock } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  category: string;
  isActive: boolean;
  clientId: string;
}

interface ServicesManagementProps {
  clientId: string;
  clientName: string;
}

interface ServiceForm {
  name: string;
  description: string;
  price: string;
  duration: string;
  category: string;
}

const ServicesManagement: React.FC<ServicesManagementProps> = ({ clientId, clientName }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceForm>({
    name: '',
    description: '',
    price: '',
    duration: '60',
    category: 'Consulta'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar serviços da empresa
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['/api/services', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/services?client_id=${clientId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Erro ao carregar serviços');
      return response.json();
    },
  });

  // Mutation para criar serviço
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: any) => {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...serviceData,
          clientId: clientId, // Garantir isolamento por client_id
          price: parseFloat(serviceData.price) * 100, // Converter para centavos
          duration: parseInt(serviceData.duration)
        }),
      });
      if (!response.ok) throw new Error('Erro ao criar serviço');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setShowModal(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Serviço criado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar serviço.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar serviço
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          price: parseFloat(data.price) * 100, // Converter para centavos
          duration: parseInt(data.duration)
        }),
      });
      if (!response.ok) throw new Error('Erro ao atualizar serviço');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setShowModal(false);
      setEditingService(null);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Serviço atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar serviço.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar serviço
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erro ao deletar serviço');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Sucesso!",
        description: "Serviço removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover serviço.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '60',
      category: 'Consulta'
    });
  };

  const openNewModal = () => {
    setEditingService(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: (service.price / 100).toFixed(2), // Converter de centavos
      duration: service.duration.toString(),
      category: service.category
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este serviço?')) {
      deleteServiceMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do serviço é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast({
        title: "Erro",
        description: "Preço deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (editingService) {
      updateServiceMutation.mutate({
        id: editingService.id,
        data: formData,
      });
    } else {
      createServiceMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>Serviços - {clientName}</span>
              </CardTitle>
              <CardDescription>
                Gerencie os serviços oferecidos pela sua empresa
              </CardDescription>
            </div>
            <Button onClick={openNewModal} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Serviço
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Carregando serviços...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum serviço cadastrado</h3>
              <p className="text-gray-500 mb-4">
                Comece cadastrando o primeiro serviço da sua empresa.
              </p>
              <Button onClick={openNewModal} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeiro Serviço
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service: Service) => (
                <Card key={service.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {service.category}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    {service.description && (
                      <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-600">
                          R$ {(service.price / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-500">
                          {service.duration} min
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Editar Serviço" : "Novo Serviço"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Serviço *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Consulta Médica"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do serviço (opcional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Duração (min) *</Label>
                <Input
                  type="number"
                  min="5"
                  step="5"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Ex: Consulta, Exame, Procedimento"
              />
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
                disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingService ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesManagement;
