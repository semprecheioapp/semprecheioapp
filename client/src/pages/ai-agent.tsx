import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bot, Settings, Sparkles, Search, AlertCircle, CheckCircle } from "lucide-react";

interface AIAgentConfig {
  agentName: string;
  model: string;
  description: string;
  promptIa: string;
}

interface ClientLookupResult {
  clientId: string;
  clientName: string;
  hasExistingPrompt: boolean;
  currentPrompt?: string;
  agentName?: string;
}

export default function AIAgent() {
  const [tokenOrInstance, setTokenOrInstance] = useState("");
  const [config, setConfig] = useState<AIAgentConfig>({
    agentName: '',
    model: 'gpt-3.5-turbo',
    description: '',
    promptIa: '',
  });
  
  const [clientData, setClientData] = useState<ClientLookupResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lookupMessage, setLookupMessage] = useState('');

  const { toast } = useToast();

  // Mutation para buscar cliente por token/instância
  const lookupClientMutation = useMutation({
    mutationFn: async (tokenOrInstance: string): Promise<ClientLookupResult> => {
      const response = await fetch('/api/ai-agent/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenOrInstance })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      return await response.json();
    },
    onSuccess: (data: ClientLookupResult) => {
      setClientData(data);
      setLookupStatus('success');
      setLookupMessage(`Cliente encontrado: ${data.clientName}`);
      
      // Preencher formulário com dados existentes se houver
      if (data.hasExistingPrompt && data.currentPrompt) {
        setConfig(prev => ({
          ...prev,
          agentName: data.agentName || '',
          promptIa: data.currentPrompt || ''
        }));
      }
      
      toast({
        title: "Cliente encontrado",
        description: `${data.clientName} - ${data.hasExistingPrompt ? 'Prompt existente encontrado' : 'Nenhum prompt configurado'}`,
      });
    },
    onError: (error: any) => {
      setClientData(null);
      setLookupStatus('error');
      setLookupMessage(error.message || 'Erro ao buscar cliente');
      toast({
        title: "Cliente não encontrado",
        description: "Verifique a instância/token e tente novamente.",
        variant: "destructive"
      });
    },
  });

  // Mutation para salvar prompt
  const savePromptMutation = useMutation({
    mutationFn: async (data: { clientId: string; prompt: string; agentName?: string }) => {
      const response = await fetch('/api/ai-agent/save-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Prompt salvo com sucesso",
        description: "O prompt do agente IA foi atualizado no cliente.",
      });
      setShowConfirmDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar prompt",
        description: error.message || "Ocorreu um erro ao salvar o prompt.",
        variant: "destructive",
      });
    },
  });

  const handleLookupClient = () => {
    if (!tokenOrInstance.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o token ou instância do cliente.",
        variant: "destructive"
      });
      return;
    }
    
    setLookupStatus('loading');
    lookupClientMutation.mutate(tokenOrInstance.trim());
  };

  const handleSavePrompt = () => {
    if (!clientData) {
      toast({
        title: "Cliente não encontrado",
        description: "Primeiro busque um cliente válido.",
        variant: "destructive"
      });
      return;
    }

    if (!config.promptIa.trim()) {
      toast({
        title: "Prompt obrigatório",
        description: "Por favor, informe o prompt do sistema.",
        variant: "destructive"
      });
      return;
    }

    // Se já existe prompt, confirmar sobrescrita
    if (clientData.hasExistingPrompt) {
      setShowConfirmDialog(true);
    } else {
      // Salvar direto se não tem prompt
      savePromptMutation.mutate({
        clientId: clientData.clientId,
        prompt: config.promptIa,
        agentName: config.agentName || undefined
      });
    }
  };

  const handleConfirmSave = () => {
    if (clientData) {
      savePromptMutation.mutate({
        clientId: clientData.clientId,
        prompt: config.promptIa,
        agentName: config.agentName || undefined
      });
    }
  };

  const handleClearForm = () => {
    setConfig({
      agentName: '',
      model: 'gpt-3.5-turbo',
      description: '',
      promptIa: '',
    });
    setTokenOrInstance('');
    setClientData(null);
    setLookupStatus('idle');
    setLookupMessage('');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Agente IA</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie prompts de IA dos clientes de forma centralizada
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Status</p>
                <p className="font-semibold text-green-600">Ativo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Modelo</p>
                <p className="font-semibold">{config.model}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Cliente</p>
                <p className="font-semibold">{clientData ? clientData.clientName : 'Nenhum'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Busca de Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tokenOrInstance">Token ou Instância do Cliente</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="tokenOrInstance"
                  placeholder="Ex: abc123... ou https://instance.com"
                  value={tokenOrInstance}
                  onChange={(e) => setTokenOrInstance(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleLookupClient}
                  disabled={lookupClientMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {lookupClientMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Status da busca */}
            {lookupStatus !== 'idle' && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                lookupStatus === 'success' ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' :
                lookupStatus === 'error' ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300' :
                'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
              }`}>
                {lookupStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                {lookupStatus === 'success' && <CheckCircle className="h-4 w-4" />}
                {lookupStatus === 'error' && <AlertCircle className="h-4 w-4" />}
                <span className="text-sm">{lookupMessage}</span>
              </div>
            )}

            {clientData && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-medium">{clientData.clientName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {clientData.hasExistingPrompt ? 'Prompt existente encontrado' : 'Nenhum prompt configurado'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuração do Agente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Configuração do Agente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="agentName">Nome do Agente (Opcional)</Label>
              <Input
                id="agentName"
                placeholder="Ex: Assistente Virtual"
                value={config.agentName}
                onChange={(e) => setConfig(prev => ({ ...prev, agentName: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="model">Modelo de IA</Label>
              <Select
                value={config.model}
                onValueChange={(value) => setConfig(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Input
                id="description"
                placeholder="Breve descrição do agente"
                value={config.description}
                onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prompt do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="promptIa">Prompt do Sistema (Obrigatório)</Label>
            <Textarea
              id="promptIa"
              placeholder="Defina o comportamento do seu agente IA..."
              value={config.promptIa}
              onChange={(e) => setConfig(prev => ({ ...prev, promptIa: e.target.value }))}
              className="mt-1 min-h-[120px]"
            />
          </div>

          {/* Preview do prompt */}
          {config.promptIa && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview:</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {config.promptIa.substring(0, 200)}
                {config.promptIa.length > 200 && '...'}
              </p>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSavePrompt}
              disabled={savePromptMutation.isPending || !clientData || !config.promptIa.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {savePromptMutation.isPending ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </div>
              ) : (
                'Salvar Prompt'
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleClearForm}
            >
              Limpar Formulário
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Substituição</DialogTitle>
            <DialogDescription>
              Já existe um prompt cadastrado para este cliente. Deseja substituir o prompt atual?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmSave}
              disabled={savePromptMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {savePromptMutation.isPending ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </div>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}