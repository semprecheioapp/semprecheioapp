# 🚦 GUIA DE RATE LIMITING - SEMPRECHEIOAPP

## 📋 RESUMO

Sistema de rate limiting inteligente e escalonado para proteger contra ataques de força bruta e uso excessivo da API.

## 🎯 CONFIGURAÇÕES ATUAIS

### **1. 🔐 Rate Limiting de Login (Inteligente)**

**Escalação Progressiva:**
- ✅ **1-3 tentativas:** Sem delay (uso normal)
- ⚠️ **4-6 tentativas:** 1 minuto de delay
- 🚨 **7-10 tentativas:** 5 minutos de delay
- 🔒 **11+ tentativas:** 15 minutos de bloqueio total

**Benefícios:**
- ✅ **Usuários legítimos:** Não são afetados
- ✅ **Ataques automatizados:** Bloqueados efetivamente
- ✅ **Escalação gradual:** Permite correção de erros

### **2. 🌐 Rate Limiting de API Geral**

**Configuração:**
- ✅ **Limite:** 500 requisições por 15 minutos
- ✅ **Janela:** 15 minutos
- ✅ **Reset:** Automático após janela

## 📊 COMO FUNCIONA

### **Fluxo de Login:**

```
1ª tentativa ❌ → Sem delay
2ª tentativa ❌ → Sem delay  
3ª tentativa ❌ → Sem delay
4ª tentativa ❌ → Aguardar 1 minuto
5ª tentativa ❌ → Aguardar 1 minuto
6ª tentativa ❌ → Aguardar 1 minuto
7ª tentativa ❌ → Aguardar 5 minutos
8ª tentativa ❌ → Aguardar 5 minutos
9ª tentativa ❌ → Aguardar 5 minutos
10ª tentativa ❌ → Aguardar 5 minutos
11ª tentativa ❌ → BLOQUEADO 15 minutos
```

### **Reset Automático:**
- ✅ **Login bem-sucedido:** Limpa contador imediatamente
- ✅ **15 minutos:** Reset automático do contador
- ✅ **Novo IP:** Contador independente

## 🔍 CÓDIGOS DE RESPOSTA

### **Login Rate Limiting:**

**Delay Temporário (429):**
```json
{
  "error": "Aguarde antes de tentar novamente",
  "message": "Aguarde 1 minutos antes da próxima tentativa.",
  "code": "TEMPORARY_DELAY",
  "retryAfter": 60,
  "attempt": 4,
  "maxAttempts": 10
}
```

**Limite Máximo Excedido (429):**
```json
{
  "error": "Limite máximo de tentativas excedido",
  "message": "Você excedeu o limite máximo de tentativas de login. Aguarde 15 minutos.",
  "code": "MAX_ATTEMPTS_EXCEEDED",
  "retryAfter": 900,
  "maxAttempts": 10
}
```

**IP Bloqueado (429):**
```json
{
  "error": "IP temporariamente bloqueado",
  "message": "Muitas tentativas de login falharam. Tente novamente em 12 minutos.",
  "code": "IP_BLOCKED",
  "retryAfter": 720,
  "timeLeftMinutes": 12
}
```

### **API Rate Limiting:**

**Limite de API Excedido (429):**
```json
{
  "error": "Limite de requisições excedido",
  "message": "Você fez muitas requisições em pouco tempo. Aguarde 15 minutos e tente novamente.",
  "code": "API_RATE_LIMIT_EXCEEDED",
  "retryAfter": 900,
  "maxRequests": 500,
  "windowMinutes": 15
}
```

## 🛠️ CONFIGURAÇÃO TÉCNICA

### **Variáveis de Ambiente:**

```env
# Rate Limiting
LOGIN_MAX_ATTEMPTS=10
LOGIN_WINDOW_MINUTES=15
API_MAX_REQUESTS=500
API_WINDOW_MINUTES=15

# Delays Escalonados
LOGIN_DELAY_LEVEL_1=60      # 1 minuto (tentativas 4-6)
LOGIN_DELAY_LEVEL_2=300     # 5 minutos (tentativas 7-10)
LOGIN_BLOCK_DURATION=900    # 15 minutos (tentativas 11+)
```

### **Implementação:**

**Middleware Aplicado:**
- ✅ `intelligentLoginRateLimit` → `/api/auth/login`
- ✅ `apiRateLimit` → `/api/*`
- ✅ `recordLoginAttempt` → Registra sucesso/falha

## 📈 MONITORAMENTO

### **Logs de Segurança:**

```
🔒 Login attempt #4 from IP 192.168.1.100 - DELAYED (1 min)
🚨 Login attempt #7 from IP 192.168.1.100 - DELAYED (5 min)
🔴 IP 192.168.1.100 BLOCKED for 15 minutes (11 failed attempts)
✅ IP 192.168.1.100 login successful - Counter reset
```

### **Headers de Resposta:**

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 6
X-RateLimit-Reset: 1641234567
Retry-After: 300
```

## 🎯 CASOS DE USO

### **1. Usuário Esqueceu a Senha:**
- ✅ **1-3 tentativas:** Pode tentar imediatamente
- ⚠️ **4+ tentativas:** Delays progressivos incentivam recuperação de senha

### **2. Ataque de Força Bruta:**
- 🚨 **Detecção rápida:** Após 4 tentativas
- 🔒 **Bloqueio efetivo:** 15 minutos após 11 tentativas
- 🛡️ **Proteção total:** Sistema permanece estável

### **3. Uso Normal da API:**
- ✅ **500 requests/15min:** Suficiente para uso normal
- ✅ **Reset automático:** Não afeta usuários legítimos

## 🔧 AJUSTES RECOMENDADOS

### **Para Ambientes Diferentes:**

**Desenvolvimento:**
```javascript
max: 20,           // Mais permissivo
windowMs: 5 * 60 * 1000,  // 5 minutos
```

**Produção:**
```javascript
max: 10,           // Mais restritivo
windowMs: 15 * 60 * 1000, // 15 minutos
```

**Teste:**
```javascript
max: 100,          // Sem limitação
windowMs: 1 * 60 * 1000,  // 1 minuto
```

## 🚀 BENEFÍCIOS ALCANÇADOS

### **Segurança:**
- ✅ **Proteção contra brute force**
- ✅ **Detecção de ataques automatizados**
- ✅ **Preservação de recursos do servidor**

### **Usabilidade:**
- ✅ **Usuários legítimos não afetados**
- ✅ **Mensagens claras de erro**
- ✅ **Escalação progressiva**

### **Performance:**
- ✅ **Redução de carga no servidor**
- ✅ **Proteção contra DDoS**
- ✅ **Estabilidade do sistema**

## ⚠️ IMPORTANTE

### **Whitelist de IPs:**
Para IPs confiáveis (escritório, etc.), considere implementar whitelist:

```javascript
// IPs que não sofrem rate limiting
const whitelistedIPs = [
  '192.168.1.0/24',  // Rede local
  '10.0.0.0/8',      // VPN corporativa
];
```

### **Monitoramento:**
- 📊 **Dashboards:** Acompanhar tentativas por IP
- 🚨 **Alertas:** Notificar sobre ataques
- 📈 **Métricas:** Analisar padrões de uso

---

**🚦 RATE LIMITING INTELIGENTE = SEGURANÇA + USABILIDADE** 🚦
