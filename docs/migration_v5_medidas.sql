-- Tipos de Medida (ex: Peso, Bíceps, Cintura)
CREATE TABLE IF NOT EXISTS tipos_medida (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    icone TEXT DEFAULT 'Ruler',
    unidade TEXT DEFAULT 'cm',
    objetivo_diminuir BOOLEAN DEFAULT FALSE,
    ordem INT DEFAULT 0
);

-- Histórico de Medidas do Usuário
CREATE TABLE IF NOT EXISTS historico_medidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo_medida_id INT REFERENCES tipos_medida(id) ON DELETE CASCADE,
    valor DECIMAL(10,2) NOT NULL,
    data_medida TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir tipos padrão
INSERT INTO tipos_medida (nome, icone, unidade, objetivo_diminuir, ordem) VALUES
('Peso Corporal', 'Scale', 'kg', TRUE, 1),
('Gordura Corporal', 'Zap', '%', TRUE, 2),
('Pescoço', 'Ruler', 'cm', FALSE, 3),
('Tórax', 'Ruler', 'cm', FALSE, 4),
('Ombros', 'Ruler', 'cm', FALSE, 5),
('Braço Direito', 'Dumbbell', 'cm', FALSE, 6),
('Braço Esquerdo', 'Dumbbell', 'cm', FALSE, 7),
('Antebraço Direito', 'Dumbbell', 'cm', FALSE, 8),
('Antebraço Esquerdo', 'Dumbbell', 'cm', FALSE, 9),
('Cintura', 'Ruler', 'cm', TRUE, 10),
('Abdomen', 'Ruler', 'cm', TRUE, 11),
('Quadril', 'Ruler', 'cm', TRUE, 12),
('Coxa Direita', 'Dumbbell', 'cm', FALSE, 13),
('Coxa Esquerda', 'Dumbbell', 'cm', FALSE, 14),
('Panturrilha Direita', 'Dumbbell', 'cm', FALSE, 15),
('Panturrilha Esquerda', 'Dumbbell', 'cm', FALSE, 16)
ON CONFLICT (nome) DO NOTHING;

-- RLS para historico_medidas
ALTER TABLE historico_medidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own measurements"
    ON historico_medidas FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- tipos_medida é leitura global
ALTER TABLE tipos_medida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read measurement types"
    ON tipos_medida FOR SELECT
    TO authenticated
    USING (TRUE);
