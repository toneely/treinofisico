-- Habilitar RLS na tabela de exercícios padrão
ALTER TABLE exercicios_padrao ENABLE ROW LEVEL SECURITY;

-- Política para permitir que todos os usuários leiam os exercícios padrão
CREATE POLICY "Permitir leitura para todos os usuários autenticados"
ON exercicios_padrao
FOR SELECT
TO authenticated
USING (true);

-- Política para permitir que apenas o administrador modifique a biblioteca global
-- Assumindo que o ID do administrador seja conhecido ou baseado no email
CREATE POLICY "Permitir modificação apenas para administradores"
ON exercicios_padrao
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'tone.mendes@gmail.com');
