// Servidor de teste simples para verificar se o ambiente está funcionando
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Servir arquivos estáticos do cliente
  if (req.url === '/' || req.url === '/index.html') {
    const indexPath = path.join(__dirname, 'client', 'index.html');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>SempreCheioApp - Teste</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2563eb; }
            .status { background: #10b981; color: white; padding: 10px; border-radius: 4px; margin: 20px 0; }
            .info { background: #f3f4f6; padding: 20px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 SempreCheioApp - Sistema Funcionando!</h1>
            <div class="status">✅ Servidor rodando na porta ${PORT}</div>
            
            <div class="info">
              <h3>📋 Informações do Sistema:</h3>
              <ul>
                <li><strong>Status:</strong> Servidor de teste ativo</li>
                <li><strong>Porta:</strong> ${PORT}</li>
                <li><strong>Ambiente:</strong> Desenvolvimento</li>
                <li><strong>Timestamp:</strong> ${new Date().toLocaleString('pt-BR')}</li>
              </ul>
            </div>
            
            <div class="info">
              <h3>🎯 Próximos Passos:</h3>
              <ol>
                <li>Configurar credenciais do Supabase no arquivo .env</li>
                <li>Instalar dependências completas</li>
                <li>Executar o servidor principal com npm run dev</li>
                <li>Acessar a interface completa do SempreCheioApp</li>
              </ol>
            </div>
            
            <div class="info">
              <h3>🔧 Credenciais de Teste:</h3>
              <ul>
                <li><strong>Email:</strong> admin@semprecheioapp.com</li>
                <li><strong>Senha:</strong> 123456</li>
              </ul>
            </div>
            
            <div class="info">
              <h3>💡 Sobre o SempreCheioApp:</h3>
              <p>Sistema completo de gestão empresarial com:</p>
              <ul>
                <li>🗓️ Agenda inteligente com calendário visual</li>
                <li>👥 Gestão de clientes e profissionais</li>
                <li>📱 Integração WhatsApp</li>
                <li>🤖 Agente IA personalizado</li>
                <li>🏢 Sistema multi-tenant</li>
                <li>🔒 Segurança enterprise (Score 92/100)</li>
              </ul>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Página não encontrada');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 SempreCheioApp - Servidor de teste rodando em http://localhost:${PORT}`);
  console.log(`📅 Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🔧 Para parar o servidor: Ctrl+C`);
  console.log(`\n📋 Status: Sistema funcionando - Pronto para configuração do Supabase!`);
});
