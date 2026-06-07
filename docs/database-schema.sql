-- =============================================================================
-- 1. CRIAÇÃO DO SCHEMA E TABELAS (ESTRUTURA RELACIONAL)
-- =============================================================================

-- Tabela de Usuários (Controle Antropométrico e Perfil)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email_referencia TEXT UNIQUE,
    massa_corporea_atual DECIMAL(5,2) NOT NULL DEFAULT 45.00,
    data_atualizacao_peso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    foco_treino TEXT DEFAULT 'Calistenia / Força Base',
    atividade_alternativa TEXT DEFAULT 'Capoeira',
    medidas JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Biblioteca Global de Exercícios (Somente Leitura para usuários comuns)
CREATE TABLE IF NOT EXISTS exercicios_padrao (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    alvo_principal TEXT NOT NULL,
    tipo_fibra TEXT NOT NULL,
    categoria TEXT NOT NULL, -- Ex: 'Empurrar', 'Puxar', 'Perna', 'Postural'
    modalidade TEXT NOT NULL, -- Ex: 'Musculação', 'CrossFit', 'Pilates', 'Calistenia'
    depende_peso_corporal BOOLEAN DEFAULT FALSE,
    descanso_passivo_segundos INT DEFAULT 60
);

-- Tabela de Exercícios Pessoais (Copy-on-Write)
CREATE TABLE IF NOT EXISTS exercicios (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    alvo_principal TEXT NOT NULL,
    tipo_fibra TEXT NOT NULL,
    categoria TEXT NOT NULL,
    modalidade TEXT NOT NULL,
    depende_peso_corporal BOOLEAN DEFAULT FALSE,
    descanso_passivo_segundos INT DEFAULT 60,
    UNIQUE(user_id, nome)
);

-- Tabela de Blocos de Treino
CREATE TABLE IF NOT EXISTS blocos_treino (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    letra_treino VARCHAR(2) NOT NULL,
    numero_bloco INT NOT NULL,
    exercicio_id INT REFERENCES exercicios(id) ON DELETE CASCADE,
    ordem_execucao INT NOT NULL,
    series_alvo INT NOT NULL DEFAULT 3,
    reps_alvo TEXT NOT NULL,
    is_coringa BOOLEAN DEFAULT FALSE
);

-- Histórico de Cargas
CREATE TABLE IF NOT EXISTS historico_cargas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exercicio_id INT REFERENCES exercicios(id) ON DELETE CASCADE,
    data_treino TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    carga NUMERIC[],
    repeticoes INTEGER[],
    series_executadas INT,
    tempo_total_segundos INT,
    tempo_execucao_segundos INTEGER[],
    tempo_descanso_segundos INTEGER[],
    letra_treino VARCHAR(2)
);
