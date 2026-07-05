-- Migração v9: Tabela de Configurações Globais do App
CREATE TABLE IF NOT EXISTS config_app (
    id SERIAL PRIMARY KEY,
    subscription_price DECIMAL(10,2) NOT NULL DEFAULT 29.90,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir valor inicial se não existir
INSERT INTO config_app (id, subscription_price)
VALUES (1, 29.90)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
ALTER TABLE config_app ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
-- Todos podem ler (SELECT)
CREATE POLICY "Leitura pública de configurações" ON config_app
FOR SELECT USING (true);

-- Apenas admins podem atualizar (ajuste o e-mail se necessário)
-- Nota: Esta política assume que você controla quem é admin via e-mail ou role.
-- Para simplificar no contexto do projeto:
CREATE POLICY "Admins podem atualizar configurações" ON config_app
FOR ALL USING (auth.jwt()->>'email' = 'tone.mendes@gmail.com');
