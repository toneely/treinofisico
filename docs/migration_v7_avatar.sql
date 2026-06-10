-- Adicionar coluna avatar_url na tabela usuarios para persistência global
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Criar bucket avatares se não existir (via SQL não é possível no Supabase, mas registramos aqui)
-- O usuário deve criar o bucket 'avatares' manualmente no Storage com acesso público.
