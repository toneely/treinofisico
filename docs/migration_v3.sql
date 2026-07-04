-- =============================================================================
-- MIGRATION V3.0: MULTI-USER & SaaS STRUCTURE
-- =============================================================================

-- 1. Ensure 'usuarios' table has email reference for Admin/Molde tracking
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email_referencia TEXT UNIQUE, -- Used to map Supabase Auth Email to Profile
    massa_corporea_atual DECIMAL(5,2) NOT NULL DEFAULT 45.00,
    data_atualizacao_peso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    foco_treino TEXT DEFAULT 'Calistenia / Força Base',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add user_id column to all functional tables
ALTER TABLE exercicios ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE blocos_treino ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE historico_cargas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE tipos_treino ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Create the "Molde" (Template) User profile
INSERT INTO usuarios (nome, email_referencia)
VALUES ('Template Molde', 'molde@treinofisico.com.br')
ON CONFLICT (email_referencia) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE exercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocos_treino ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_cargas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_treino ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies

DROP POLICY IF EXISTS "Users can manage their own exercises" ON exercicios;
CREATE POLICY "Users can manage their own exercises"
ON exercicios FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own profile" ON usuarios;
CREATE POLICY "Users can manage their own profile"
ON usuarios FOR ALL
USING (auth.uid()::text = id::text OR email_referencia = auth.jwt()->>'email');

DROP POLICY IF EXISTS "Users can manage their own blocks" ON blocos_treino;
CREATE POLICY "Users can manage their own blocks"
ON blocos_treino FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own history" ON historico_cargas;
CREATE POLICY "Users can manage their own history"
ON historico_cargas FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
