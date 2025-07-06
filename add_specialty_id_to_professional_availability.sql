-- Adicionar coluna specialty_id na tabela professional_availability
ALTER TABLE professional_availability 
ADD COLUMN IF NOT EXISTS specialty_id UUID REFERENCES specialties(id);

-- Verificar estrutura atualizada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'professional_availability' 
ORDER BY ordinal_position;
