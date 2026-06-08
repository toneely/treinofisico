-- =============================================================================
-- MIGRATION V4.0: CUSTOM APPEARANCE SETTINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS configuracoes_aparencia (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cor_fundo_gestao TEXT NOT NULL DEFAULT '#FFFFFF',
    cor_fundo_treino TEXT NOT NULL DEFAULT '#121212',
    cor_exercicio_a TEXT NOT NULL DEFAULT '#E67E22',
    cor_exercicio_b TEXT NOT NULL DEFAULT '#1E3A8A',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE configuracoes_aparencia ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can manage their own appearance settings" ON configuracoes_aparencia;
CREATE POLICY "Users can manage their own appearance settings"
ON configuracoes_aparencia FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
