import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tag, Plus, Edit, Trash2, Users } from 'lucide-react';

interface Specialty {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  clientId: string;
  professionalsCount?: number;
}

interface SpecialtiesManagementProps {
  clientId: string;
  clientName: string;
}

interface SpecialtyForm {
  name: string;
  description: string;
}

const SpecialtiesManagement: React.FC<SpecialtiesManagementProps> = ({ clientId, clientName }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
  const [formData, setFormData] = useState<SpecialtyForm>({
    name: '',
    description: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar especialidades da empresa
  const { data: specialties = [], isLoading } = useQuery({
    queryKey: ['/api/specialties', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/specialties?client_id=${clientId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Erro ao carregar especialidades');
      return response.json();
    },
  });

  // Mutation para criar especialidade
  const createSpecialtyMutation = useMutation({
    mutationFn: async (specialtyData: any) => {
      const response = await fetch('/api/specialties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...specialtyData,
          clientId: clientId, // Garantir isolamento por client_id
        }),
      });
      if (!response.ok) throw new Error('Erro ao criar especialidade');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/specialties'] });
      setShowModal(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Especialidade criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar especialidade.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar especialidade
  const updateSpecialtyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/specialties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao atualizar especialidade');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/specialties'] });
      setShowModal(false);
      setEditingSpecialty(null);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Especialidade atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar especialidade.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar especialidade
  const deleteSpecialtyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/specialties/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erro ao deletar especialidade');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/specialties'] });
      toast({
        title: "Sucesso!",
        description: "Especialidade removida com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover especialidade.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
  };

  const openNewModal = () => {
    setEditingSpecialty(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (specialty: Specialty) => {
    setEditingSpecialty(specialty);
    setFormData({
      name: specialty.name,
      description: specialty.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta especialidade?')) {
      deleteSpecialtyMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da especialidade é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (editingSpecialty) {
      updateSpecialtyMutation.mutate({
        id: editingSpecialty.id,
        data: formData,
      });
    } else {
      createSpecialtyMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="h-5 w-5" />
                <span>Especialidades - {clientName}</span>
              </CardTitle>
              <CardDescription>
                Gerencie as especialidades oferecidas pela sua empresa
              </CardDescription>
            </div>
            <Button onClick={openNewModal} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Especialidade
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Carregando especialidades...</p>
            </div>
          ) : specialties.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma especialidade cadastrada</h3>
              <p className="text-gray-500 mb-4">
                Comece cadastrando a primeira especialidade da sua empresa.
              </p>
              <Button onClick={openNewModal} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeira Especialidade
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {specialties.map((specialty: Specialty) => (
                <Card key={specialty.id} className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{specialty.name}</CardTitle>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(specialty)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(specialty.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {specialty.professionalsCount !== undefined && (
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4 text-gray-500" />
                        <Badge variant="outline" className="w-fit">
                          {specialty.professionalsCount} profissional(is)
                        </Badge>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {specialty.description && (
                      <p className="text-sm text-gray-600">{specialty.description}</p>
                    )}
                    {!specialty.description && (
                      <p className="text-sm text-gray-400 italic">Sem descrição</p>
                    )}
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
              {editingSpecialty ? "Editar Especialidade" : "Nova Especialidade"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Especialidade *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Cardiologia, Dermatologia, Fisioterapia"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição da especialidade (opcional)"
                rows={3}
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
                disabled={createSpecialtyMutation.isPending || updateSpecialtyMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingSpecialty ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpecialtiesManagement;
