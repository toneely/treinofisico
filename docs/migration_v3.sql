-- =============================================================================
-- MIGRATION V3.0: MULTI-USER & SaaS STRUCTURE
-- =============================================================================

-- 1. Ensure 'usuarios' table has email reference for Admin/Molde tracking
<<<<<<< SEARCH
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    massa_corporea_atual DECIMAL(5,2) NOT NULL DEFAULT 45.00,
    data_atualizacao_peso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    foco_treino TEXT DEFAULT 'Calistenia / Força Base'
);
=======
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email_referencia TEXT UNIQUE, -- Used to map Supabase Auth Email to Profile
    massa_corporea_atual DECIMAL(5,2) NOT NULL DEFAULT 45.00,
    data_atualizacao_peso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    foco_treino TEXT DEFAULT 'Calistenia / Força Base',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
>>>>>>> REPLACE

-- 2. Add user_id column to all functional tables
ALTER TABLE exercicios ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE blocos_treino ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE historico_cargas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE tipos_treino ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Create the "Molde" (Template) User profile
-- Replace the UUID below with a fixed one or let it generate, but email_referencia is the key.
INSERT INTO usuarios (nome, email_referencia)
VALUES ('Template Molde', 'molde@treinofisico.com.br')
ON CONFLICT (email_referencia) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE exercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocos_treino ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_cargas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_treino ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies (Example for 'exercicios')
-- Repeat this pattern for other tables: blocos_treino, historico_cargas, tipos_treino, usuarios.

DROP POLICY IF EXISTS "Users can manage their own exercises" ON exercicios;
CREATE POLICY "Users can manage their own exercises"
ON exercicios FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own profile" ON usuarios;
CREATE POLICY "Users can manage their own profile"
ON usuarios FOR ALL
USING (auth.uid()::text = id::text OR email_referencia = auth.jwt()->>'email');

-- 6. Script for Admin to claim ownership of existing legacy data (Run once)
-- UPDATE exercicios SET user_id = 'YOUR_ADMIN_UUID_HERE' WHERE user_id IS NULL;
-- UPDATE blocos_treino SET user_id = 'YOUR_ADMIN_UUID_HERE' WHERE user_id IS NULL;
