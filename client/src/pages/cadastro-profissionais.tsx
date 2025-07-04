import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Bot, Users, Building, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CadastroProfissionais() {
  const { toast } = useToast();
  
  // Estados para modal de profissionais
  const [isAddProfessionalOpen, setIsAddProfessionalOpen] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  
  // Estado para formulário de profissional (webhook)
  const [professionalFormData, setProfessionalFormData] = useState({
    name: '',
    email: '',
    phone: '',
    clientId: '',
    specialtyId: ''
  });

  // Queries para carregar dados necessários
  const { data: professionalsData = [] } = useQuery({
    queryKey: ['/api/professionals']
  });

  const { data: specialtiesData = [] } = useQuery({
    queryKey: ['/api/specialties']
  });

  const { data: clientsData = [] } = useQuery({
    queryKey: ['/api/clients']
  });

  // Função para enviar dados via webhook externo
  const handleSubmitProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookLoading(true);

    try {
      // URL do webhook será fornecida pelo usuário
      const webhookUrl = "PLACEHOLDER_WEBHOOK_URL";
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: professionalFormData.name,
          email: professionalFormData.email,
          phone: professionalFormData.phone,
          client_id: professionalFormData.clientId,
          specialty_id: professionalFormData.specialtyId || null
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sucesso!",
          description: "Profissional cadastrado com sucesso via webhook.",
        });
        
        // Limpar formulário e fechar modal
        setProfessionalFormData({
          name: '',
          email: '',
          phone: '',
          clientId: '',
          specialtyId: ''
        });
        setIsAddProfessionalOpen(false);
        
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      toast({
        title: "Erro no Webhook",
        description: `Falha ao enviar dados: ${error}`,
        variant: "destructive",
      });
    } finally {
      setWebhookLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Cadastro de Profissionais via Webhook
          </CardTitle>
          <CardDescription>
            Sistema integrado para cadastro de profissionais através de webhook externo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status do Sistema */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Bot className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Sistema Webhook Ativo</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Cadastro de profissionais processado via webhook externo para garantir máxima compatibilidade.
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <Badge variant="outline">{(professionalsData as any[]).length} profissionais cadastrados</Badge>
                  <Badge variant="outline">{(clientsData as any[]).length} empresas disponíveis</Badge>
                  <Badge variant="outline">{(specialtiesData as any[]).length} especialidades</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Profissionais Atuais */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Profissionais Cadastrados</Label>
            <div className="grid gap-3">
              {(professionalsData as any[])?.slice(0, 5).map((professional: any) => (
                <div key={professional.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{professional.name}</p>
                      <p className="text-sm text-muted-foreground">{professional.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {professional.specialtyName || 'Geral'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Botão para Cadastrar Novo Profissional */}
          <Dialog open={isAddProfessionalOpen} onOpenChange={setIsAddProfessionalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Novo Profissional
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Cadastrar Profissional</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo profissional. O sistema processará automaticamente via webhook.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmitProfessional} className="space-y-4">
                <div>
                  <Label htmlFor="professionalName" className="text-sm font-medium flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    Nome Completo
                  </Label>
                  <Input
                    id="professionalName"
                    type="text"
                    placeholder="Ex: Maria Silva"
                    value={professionalFormData.name}
                    onChange={(e) => setProfessionalFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="professionalEmail" className="text-sm font-medium flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    E-mail
                  </Label>
                  <Input
                    id="professionalEmail"
                    type="email"
                    placeholder="maria@exemplo.com"
                    value={professionalFormData.email}
                    onChange={(e) => setProfessionalFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="professionalPhone" className="text-sm font-medium flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    Telefone
                  </Label>
                  <Input
                    id="professionalPhone"
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={professionalFormData.phone}
                    onChange={(e) => setProfessionalFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="professionalClientId" className="text-sm font-medium flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    Empresa
                  </Label>
                  <select
                    id="professionalClientId"
                    value={professionalFormData.clientId}
                    onChange={(e) => setProfessionalFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    required
                    className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione a empresa</option>
                    {(clientsData as any[])?.map((client: any) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="professionalSpecialtyId" className="text-sm font-medium">
                    Especialidade (Opcional)
                  </Label>
                  <select
                    id="professionalSpecialtyId"
                    value={professionalFormData.specialtyId}
                    onChange={(e) => setProfessionalFormData(prev => ({ ...prev, specialtyId: e.target.value }))}
                    className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione uma especialidade</option>
                    {(specialtiesData as any[])?.map((specialty: any) => (
                      <option key={specialty.id} value={specialty.id}>
                        {specialty.name}
                      </option>
                    ))}
                  </select>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddProfessionalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={webhookLoading}>
                    {webhookLoading ? "Processando..." : "Cadastrar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}