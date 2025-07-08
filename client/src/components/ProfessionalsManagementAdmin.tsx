import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Edit, Trash2, AlertTriangle, MessageCircle, User, Mail, Phone } from 'lucide-react';

interface Professional {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialtyId?: string;
  specialtyName?: string;
  isActive: boolean;
  clientId: string;
}

interface Specialty {
  id: string;
  name: string;
}

interface ProfessionalsManagementAdminProps {
  clientId: string;
  clientName: string;
  userEmail: string; // Email do admin logado para WhatsApp
}

interface ProfessionalForm {
  name: string;
  email: string;
  phone: string;
  specialtyId: string;
}

const ProfessionalsManagementAdmin: React.FC<ProfessionalsManagementAdminProps> = ({ 
  clientId, 
  clientName, 
  userEmail 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [requestedQuantity, setRequestedQuantity] = useState('1');
  const [formData, setFormData] = useState<ProfessionalForm>({
    name: '',
    email: '',
    phone: '',
    specialtyId: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar profissionais da empresa
  const { data: professionals = [], isLoading } = useQuery({
    queryKey: ['/api/professionals', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/professionals?client_id=${clientId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Erro ao carregar profissionais');
      return response.json();
    },
  });

  // Buscar especialidades da empresa
  const { data: specialties = [] } = useQuery({
    queryKey: ['/api/specialties', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/specialties?client_id=${clientId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Erro ao carregar especialidades');
      return response.json();
    },
  });

  // Mutation para criar profissional
  const createProfessionalMutation = useMutation({
    mutationFn: async (professionalData: any) => {
      const response = await fetch('/api/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...professionalData,
          clientId: clientId, // Garantir isolamento por client_id
        }),
      });
      if (!response.ok) throw new Error('Erro ao criar profissional');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/professionals'] });
      setShowModal(false);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Profissional criado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar profissional.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar profissional
  const updateProfessionalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/professionals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao atualizar profissional');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/professionals'] });
      setShowModal(false);
      setEditingProfessional(null);
      resetForm();
      toast({
        title: "Sucesso!",
        description: "Profissional atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar profissional.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar profissional
  const deleteProfessionalMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/professionals/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erro ao deletar profissional');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/professionals'] });
      toast({
        title: "Sucesso!",
        description: "Profissional removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover profissional.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialtyId: ''
    });
  };

  const openNewModal = () => {
    console.log('🔍 openNewModal chamado');
    console.log('🔍 professionals.length:', professionals.length);

    // Verificar limite de 3 profissionais
    if (professionals.length >= 3) {
      console.log('🔍 Limite atingido, abrindo WhatsApp modal');
      setShowWhatsAppModal(true);
      return;
    }

    console.log('🔍 Abrindo modal de novo profissional');
    setEditingProfessional(null);
    resetForm();
    setShowModal(true);
    console.log('🔍 showModal definido como true');
  };

  const handleEdit = (professional: Professional) => {
    setEditingProfessional(professional);
    setFormData({
      name: professional.name,
      email: professional.email,
      phone: professional.phone || '',
      specialtyId: professional.specialtyId || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este profissional?')) {
      deleteProfessionalMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do profissional é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Erro",
        description: "Email do profissional é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (editingProfessional) {
      updateProfessionalMutation.mutate({
        id: editingProfessional.id,
        data: formData,
      });
    } else {
      createProfessionalMutation.mutate(formData);
    }
  };

  const handleWhatsAppRequest = () => {
    const message = `Olá, gostaria de adicionar mais profissionais na minha conta.
Meu e-mail: ${userEmail}
Quantidade desejada: ${requestedQuantity}`;
    
    const whatsappUrl = `https://wa.me/5566999618890?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowWhatsAppModal(false);
  };

  const currentCount = professionals.length;
  const maxCount = 3;
  const isAtLimit = currentCount >= maxCount;

  console.log('🔍 ProfessionalsManagementAdmin render');
  console.log('🔍 showModal:', showModal);
  console.log('🔍 showWhatsAppModal:', showWhatsAppModal);
  console.log('🔍 currentCount:', currentCount);
  console.log('🔍 isAtLimit:', isAtLimit);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Profissionais - {clientName}</span>
              </CardTitle>
              <CardDescription>
                Gerencie os profissionais da sua empresa
              </CardDescription>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant={isAtLimit ? "destructive" : "secondary"}>
                  {currentCount}/{maxCount} profissionais
                </Badge>
                {isAtLimit && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    Limite atingido
                  </Badge>
                )}
              </div>
            </div>
            <Button 
              onClick={openNewModal} 
              className={isAtLimit ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isAtLimit ? "Solicitar Mais" : "Novo Profissional"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Carregando profissionais...</p>
            </div>
          ) : professionals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum profissional cadastrado</h3>
              <p className="text-gray-500 mb-4">
                Comece cadastrando o primeiro profissional da sua empresa.
              </p>
              <p className="text-sm text-blue-600 mb-4">
                Você pode cadastrar até {maxCount} profissionais no plano atual.
              </p>
              <Button onClick={openNewModal} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeiro Profissional
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {professionals.map((professional: Professional) => (
                <Card key={professional.id} className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{professional.name}</CardTitle>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(professional)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(professional.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {professional.specialtyName && (
                      <Badge variant="outline" className="w-fit">
                        {professional.specialtyName}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">{professional.email}</span>
                      </div>
                      {professional.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">{professional.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <Badge variant={professional.isActive ? "default" : "secondary"}>
                          {professional.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Aviso de limite */}
          {isAtLimit && (
            <Card className="mt-6 border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800">
                      Limite de {maxCount} profissionais atingido no plano atual
                    </p>
                    <p className="text-sm text-orange-600">
                      Solicite mais profissionais por apenas R$ 25 cada (aproximadamente $5 USD)
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowWhatsAppModal(true)}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Solicitar Mais
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição - VERSÃO SIMPLIFICADA PARA DEBUG */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                {editingProfessional ? "Editar Profissional" : "Novo Profissional"}
              </h2>
              <p className="text-sm text-gray-500">
                Debug: Modal funcionando - {editingProfessional ? 'Editando' : 'Novo'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Dr. João Silva"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="joao@exemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Especialidade</label>
                <select
                  value={formData.specialtyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialtyId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sem especialidade</option>
                  {specialties.map((specialty: Specialty) => (
                    <option key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createProfessionalMutation.isPending || updateProfessionalMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingProfessional ? "Atualizar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Solicitação WhatsApp */}
      <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              <span>Solicitar Mais Profissionais</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Plano Atual:</strong> {maxCount} profissionais inclusos
              </p>
              <p className="text-sm text-blue-600 mt-1">
                <strong>Valor adicional:</strong> R$ 25 por profissional extra
              </p>
            </div>

            <div className="space-y-2">
              <Label>Quantos profissionais adicionais você precisa?</Label>
              <Select value={requestedQuantity} onValueChange={setRequestedQuantity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 10, 15, 20].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} profissional{num > 1 ? 'is' : ''} - R$ {(num * 25).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                Ao clicar em "Enviar Solicitação", você será redirecionado para o WhatsApp 
                com uma mensagem pré-preenchida para nossa equipe de suporte.
              </p>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWhatsAppModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleWhatsAppRequest}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Enviar Solicitação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfessionalsManagementAdmin;
