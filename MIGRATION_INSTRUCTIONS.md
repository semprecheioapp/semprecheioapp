# Instruções para Migração - Coluna Color

Para resolver o erro na criação de especialidades, execute o seguinte SQL no painel do Supabase:

```sql
-- Adicionar coluna color na tabela specialties
ALTER TABLE specialties 
ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6';

-- Atualizar registros existentes com cor padrão
UPDATE specialties 
SET color = '#3B82F6' 
WHERE color IS NULL;
```

## Passos:
1. Acesse o painel do Supabase
2. Vá para SQL Editor
3. Execute o SQL acima
4. Teste a criação de especialidades novamente

Isso resolverá o erro: "Could not find the 'color' column of 'specialties' in the schema cache"