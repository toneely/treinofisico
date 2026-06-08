-- =============================================================================
-- MIGRATION V4.0: CUSTOM APPEARANCE SETTINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS configuracoes_aparencia (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    bg_geral TEXT NOT NULL DEFAULT '#FFFFFF',
    bg_treino TEXT NOT NULL DEFAULT '#121212',
    color_ex_a TEXT NOT NULL DEFAULT '#fbbf24',
    color_ex_b TEXT NOT NULL DEFAULT '#94a3b8',
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
