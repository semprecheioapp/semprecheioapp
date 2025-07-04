-- Adicionar coluna color na tabela specialties
ALTER TABLE specialties 
ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6';

-- Atualizar registros existentes com cor padrão
UPDATE specialties 
SET color = '#3B82F6' 
WHERE color IS NULL;
