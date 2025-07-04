-- Adicionar coluna client_id na tabela professionals
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- Atualizar os profissionais existentes com um client_id padrão (primeiro cliente ativo)
UPDATE professionals 
SET client_id = (
  SELECT id FROM clients 
  WHERE is_active = true 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE client_id IS NULL;

-- Tornar a coluna obrigatória após atualizar dados existentes
ALTER TABLE professionals 
ALTER COLUMN client_id SET NOT NULL;

-- Verificar estrutura atualizada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'professionals' 
ORDER BY ordinal_position;