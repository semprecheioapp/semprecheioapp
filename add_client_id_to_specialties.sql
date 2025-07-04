-- Adicionar coluna client_id na tabela specialties
ALTER TABLE specialties 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- Atualizar as especialidades existentes com um client_id padrão (primeiro cliente ativo)
UPDATE specialties 
SET client_id = (
  SELECT id FROM clients 
  WHERE is_active = true 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE client_id IS NULL;

-- Verificar estrutura atualizada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'specialties' 
ORDER BY ordinal_position;
