-- =============================================================================
-- 1. CRIAÇÃO DO SCHEMA E TABELAS (ESTRUTURA RELACIONAL)
-- =============================================================================

-- Tabela de Usuários (Controle Antropométrico e Perfil)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    massa_corporea_atual DECIMAL(5,2) NOT NULL DEFAULT 45.00,
    data_atualizacao_peso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    foco_treino TEXT DEFAULT 'Calistenia / Força Base'
);

-- Tabela de Exercícios (Catálogo Técnico com mapeamento de Fibras)
CREATE TABLE IF NOT EXISTS exercicios (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    alvo_principal TEXT NOT NULL,
    tipo_fibra TEXT NOT NULL, -- 'Tipo I', 'Tipo IIa', 'Tipo IIx'
    categoria TEXT NOT NULL,  -- 'Empurrar', 'Puxar', 'Perna', 'Postural'
    depende_peso_corporal BOOLEAN DEFAULT FALSE
);

-- Tabela de Blocos de Treino (Coração da lógica de Séries Alternadas / Supersets)
CREATE TABLE IF NOT EXISTS blocos_treino (
    id SERIAL PRIMARY KEY,
    letra_treino VARCHAR(2) NOT NULL,            -- 'A', 'B', 'C', 'D'
    numero_bloco INT NOT NULL,                   -- 1, 2, 3, 4, 5
    exercicio_id INT REFERENCES exercicios(id) ON DELETE CASCADE,
    ordem_execucao INT NOT NULL,                 -- 1 = Primeiro do bloco, 2 = Executado no descanso
    series_alvo INT NOT NULL DEFAULT 3,
    reps_alvo TEXT NOT NULL                      -- Ex: '7-10', '10-12', 'Falha Controlada'
);

-- Tabela de Histórico de Cargas e Evolução (Diário de Bordo)
CREATE TABLE IF NOT EXISTS historico_cargas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    exercicio_id INT REFERENCES exercicios(id) ON DELETE CASCADE,
    data_treino TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    carga_utilizada DECIMAL(5,2) NOT NULL,       -- Apenas peso de anilhas/placas em kg
    repeticoes_feitas INT NOT NULL
);

-- =============================================================================
-- 2. POVOAMENTO INICIAL (SEED) - CATÁLOGO DE EXERCÍCIOS E ESTÍMULOS
-- =============================================================================

INSERT INTO exercicios (nome, alvo_principal, tipo_fibra, categoria, depende_peso_corporal) VALUES
-- Treino A (Empurrar)
('Supino Reto', 'Peitoral Maior', 'Tipo IIx', 'Empurrar', FALSE),
('Elevação Lateral', 'Deltoide Lateral', 'Tipo IIa', 'Empurrar', FALSE),
('Supino Inclinado', 'Peitoral Superior', 'Tipo IIa', 'Empurrar', FALSE),
('Tríceps Pulley (Polia)', 'Tríceps Lateral', 'Tipo IIa', 'Empurrar', FALSE),
('Flexões de Braço (Push-ups)', 'Peitoral / Core', 'Tipo IIa', 'Empurrar', TRUE),
('Elevação Frontal', 'Deltoide Anterior', 'Tipo IIa', 'Empurrar', FALSE),
('Voador (Pec Deck)', 'Isolamento Peitoral', 'Tipo I', 'Empurrar', FALSE),
('Tríceps Francês', 'Tríceps Extensão', 'Tipo IIa', 'Empurrar', FALSE),
('Desenvolvimento c/ Halteres', 'Deltoide Anterior', 'Tipo IIx', 'Empurrar', FALSE),
('Tríceps Corda', 'Tríceps Longo', 'Tipo IIa', 'Empurrar', FALSE),

-- Treino B (Puxar)
('Barra Fixa Supinada / Graviton', 'Dorsais / Bíceps', 'Tipo IIx', 'Puxar', TRUE),
('Rosca Martelo', 'Braquiorradial', 'Tipo IIa', 'Puxar', FALSE),
('Puxador Fechado', 'Latíssimo do Dorso', 'Tipo IIa', 'Puxar', FALSE),
('Encolhimento de Ombros', 'Trapézio Superior', 'Tipo IIa', 'Puxar', FALSE),
('Remada Baixa', 'Romboides / Trapézio', 'Tipo IIa', 'Puxar', FALSE),
('Rosca Direta (Barra/Polia)', 'Bíceps Braquial', 'Tipo IIa', 'Puxar', FALSE),
('Puxador com Triângulo', 'Dorsal Central', 'Tipo IIa', 'Puxar', FALSE),
('Serrote (Remada Unilateral)', 'Grande Dorso', 'Tipo IIa', 'Puxar', FALSE),
('Remada Alta', 'Trapézio / Deltoide', 'Tipo IIa', 'Puxar', FALSE),
('Rosca Alternada / Concentrada', 'Bíceps Isolado', 'Tipo I', 'Puxar', FALSE),

-- Treino C (Pernas)
('Agachamento Livre / Sumô', 'Quadríceps / Glúteos', 'Tipo IIx', 'Perna', FALSE),
('Cadeira Flexora', 'Isquiotibiais', 'Tipo IIa', 'Perna', FALSE),
('Cadeira Adutora', 'Adutores do Quadril', 'Tipo IIa', 'Perna', FALSE),
('Abdução na Polia (Corpo Reto)', 'Glúteo Mínimo / Médio', 'Tipo IIa', 'Perna', FALSE),
('Abdução na Polia (Inclinado)', 'Glúteo Lateral', 'Tipo IIa', 'Perna', FALSE),
('Panturrilha Gêmeos', 'Sóleo / Gastrocnêmio', 'Tipo I', 'Perna', FALSE),

-- Treino D (Sábado Complementar)
('Crucifixo Invertido (Halter ou Cabo)', 'Deltoide Posterior', 'Tipo I', 'Postural', FALSE),
('Pullover (Halter ou Corda)', 'Latíssimo / Serrátil', 'Tipo I', 'Postural', FALSE),
('Extensão de Lombar (Banco Romano)', 'Eretores da Espinha', 'Tipo I', 'Postural', TRUE),
('Prancha Abdominal Estática', 'Core Integral', 'Tipo I', 'Postural', TRUE),
('Flexão Tibial (Halter entre os pés)', 'Tibial Anterior', 'Tipo I', 'Postural', FALSE),
('Manguito Rotador (Rotação Externa)', 'Estabilizadores do Ombro', 'Tipo I', 'Postural', FALSE)
ON CONFLICT (nome) DO NOTHING;

-- =============================================================================
-- 3. POVOAMENTO INICIAL (SEED) - LÓGICA DE BLOCOS DE SÉRIES ALTERNADAS
-- =============================================================================

-- Mapeamento do Treino A (Empurrar)
INSERT INTO blocos_treino (letra_treino, numero_bloco, exercicio_id, ordem_execucao, reps_alvo) VALUES
('A', 1, (SELECT id FROM exercicios WHERE nome = 'Supino Reto'), 1, '7-10'),
('A', 1, (SELECT id FROM exercicios WHERE nome = 'Elevação Lateral'), 2, '10-12'),
('A', 2, (SELECT id FROM exercicios WHERE nome = 'Supino Inclinado'), 1, '7-10'),
('A', 2, (SELECT id FROM exercicios WHERE nome = 'Tríceps Pulley (Polia)'), 2, '7-10'),
('A', 3, (SELECT id FROM exercicios WHERE nome = 'Flexões de Braço (Push-ups)'), 1, 'Falha Controlada'),
('A', 3, (SELECT id FROM exercicios WHERE nome = 'Elevação Frontal'), 2, '10-12'),
('A', 4, (SELECT id FROM exercicios WHERE nome = 'Voador (Pec Deck)'), 1, '10-12'),
('A', 4, (SELECT id FROM exercicios WHERE nome = 'Tríceps Francês'), 2, '10-12'),
('A', 5, (SELECT id FROM exercicios WHERE nome = 'Desenvolvimento c/ Halteres'), 1, '7-10'),
('A', 5, (SELECT id FROM exercicios WHERE nome = 'Tríceps Corda'), 2, '10-12');

-- Mapeamento do Treino B (Puxar)
INSERT INTO blocos_treino (letra_treino, numero_bloco, exercicio_id, ordem_execucao, reps_alvo) VALUES
('B', 1, (SELECT id FROM exercicios WHERE nome = 'Barra Fixa Supinada / Graviton'), 1, '6-10'),
('B', 1, (SELECT id FROM exercicios WHERE nome = 'Rosca Martelo'), 2, '8-10'),
('B', 2, (SELECT id FROM exercicios WHERE nome = 'Puxador Fechado'), 1, '7-10'),
('B', 2, (SELECT id FROM exercicios WHERE nome = 'Encolhimento de Ombros'), 2, '12'),
('B', 3, (SELECT id FROM exercicios WHERE nome = 'Remada Baixa'), 1, '7-10'),
('B', 3, (SELECT id FROM exercicios WHERE nome = 'Rosca Direta (Barra/Polia)'), 2, '7-10'),
('B', 4, (SELECT id FROM exercicios WHERE nome = 'Puxador com Triângulo'), 1, '7-10'),
('B', 4, (SELECT id FROM exercicios WHERE nome = 'Serrote (Remada Unilateral)'), 2, '8-10'),
('B', 5, (SELECT id FROM exercicios WHERE nome = 'Remada Alta'), 1, '10-12'),
('B', 5, (SELECT id FROM exercicios WHERE nome = 'Rosca Alternada / Concentrada'), 2, '10');

-- Mapeamento do Treino C (Pernas Coringa)
INSERT INTO blocos_treino (letra_treino, numero_bloco, exercicio_id, ordem_execucao, reps_alvo) VALUES
('C', 1, (SELECT id FROM exercicios WHERE nome = 'Agachamento Livre / Sumô'), 1, '8-10'),
('C', 1, (SELECT id FROM exercicios WHERE nome = 'Cadeira Flexora'), 2, '7-10'),
('C', 2, (SELECT id FROM exercicios WHERE nome = 'Cadeira Adutora'), 1, '10-12'),
('C', 2, (SELECT id FROM exercicios WHERE nome = 'Abdução na Polia (Corpo Reto)'), 2, '10-12'),
('C', 3, (SELECT id FROM exercicios WHERE nome = 'Abdução na Polia (Inclinado)'), 1, '12'),
('C', 3, (SELECT id FROM exercicios WHERE nome = 'Panturrilha Gêmeos'), 2, '12-15');

-- Mapeamento do Treino D (Sábado - Compensação Angola)
INSERT INTO blocos_treino (letra_treino, numero_bloco, exercicio_id, ordem_execucao, reps_alvo) VALUES
('D', 1, (SELECT id FROM exercicios WHERE nome = 'Crucifixo Invertido (Halter ou Cabo)'), 1, '12-15'),
('D', 1, (SELECT id FROM exercicios WHERE nome = 'Pullover (Halter ou Corda)'), 2, '12'),
('D', 2, (SELECT id FROM exercicios WHERE nome = 'Extensão de Lombar (Banco Romano)'), 1, '12-15'),
('D', 2, (SELECT id FROM exercicios WHERE nome = 'Prancha Abdominal Estática'), 2, '45 seg'),
('D', 3, (SELECT id FROM exercicios WHERE nome = 'Flexão Tibial (Halter entre os pés)'), 1, '15'),
('D', 3, (SELECT id FROM exercicios WHERE nome = 'Manguito Rotador (Rotação Externa)'), 2, '15');
