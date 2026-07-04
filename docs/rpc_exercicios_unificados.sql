-- =============================================================================
-- SUPABASE RPCs: BUSCA UNIFICADA E CÓPIA SEGURA DE EXERCÍCIOS
-- =============================================================================

-- 1. Busca Unificada de Exercícios (Merge entre Pessoal e Padrão)
-- Esta função faz o merge das tabelas no servidor, priorizando o que já está na
-- biblioteca pessoal do usuário para evitar duplicatas na lista de resultados.
CREATE OR REPLACE FUNCTION buscar_exercicios_unificados(
  p_termo_busca TEXT,
  p_modalidade TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  id_original TEXT,
  nome TEXT,
  alvo_principal TEXT,
  fonte TEXT,
  id_pessoal INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH pessoal AS (
    -- Busca na biblioteca pessoal do usuário
    SELECT
      e.id::TEXT as id_original,
      e.nome,
      e.alvo_principal,
      'pessoal'::TEXT as fonte,
      e.id as id_pessoal
    FROM exercicios e
    WHERE e.user_id = p_user_id
      AND e.modalidade = p_modalidade
      AND (p_termo_busca = '' OR e.nome ILIKE '%' || p_termo_busca || '%')
    LIMIT 20
  ),
  padrao AS (
    -- Busca na biblioteca global (apenas se não houver correspondente por nome na pessoal)
    SELECT
      ep.id::TEXT as id_original,
      ep.nome,
      ep.alvo_principal,
      'padrao'::TEXT as fonte,
      NULL::INT as id_pessoal
    FROM exercicios_padrao ep
    WHERE ep.modalidade = p_modalidade
      AND (p_termo_busca = '' OR ep.nome ILIKE '%' || p_termo_busca || '%')
      AND NOT EXISTS (SELECT 1 FROM pessoal p WHERE p.nome = ep.nome)
    LIMIT 20
  )
  SELECT * FROM pessoal
  UNION ALL
  SELECT * FROM padrao
  ORDER BY fonte DESC, nome ASC;
END;
$$;

-- 2. Cópia Atômica e Segura (Copy-on-Write UUID -> INT)
-- Esta função gerencia a transação de cópia. Ela verifica se o exercício já existe
-- (pelo nome) antes de inserir, evitando erros de chave duplicada e garantindo
-- que o blocos_treino receba um ID inteiro válido.
CREATE OR REPLACE FUNCTION copiar_exercicio_padrao(
  p_exercicio_padrao_id UUID,
  p_user_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exercicio_id INT;
  v_nome TEXT;
BEGIN
  -- 1. Obtém o nome do exercício padrão para verificar existência na pessoal
  SELECT nome INTO v_nome FROM exercicios_padrao WHERE id = p_exercicio_padrao_id;

  -- 2. Tenta encontrar na tabela pessoal por nome (para respeitar a UNIQUE constraint)
  SELECT id INTO v_exercicio_id FROM exercicios
  WHERE user_id = p_user_id AND nome = v_nome;

  -- 3. Se não existe na biblioteca pessoal, realiza a cópia
  IF v_exercicio_id IS NULL THEN
    INSERT INTO exercicios (
      user_id, nome, alvo_principal, tipo_fibra, categoria,
      modalidade, depende_peso_corporal, descanso_passivo_segundos
    )
    SELECT
      p_user_id, nome, alvo_principal, tipo_fibra, categoria,
      modalidade, depende_peso_corporal, descanso_passivo_segundos
    FROM exercicios_padrao
    WHERE id = p_exercicio_padrao_id
    RETURNING id INTO v_exercicio_id;
  END IF;

  RETURN v_exercicio_id;
END;
$$;

-- 3. Função de Apoio ao Histórico (Performance)
-- Para o BlockConfigurator.jsx funcionar de forma ultra-rápida ao herdar dados.
CREATE OR REPLACE FUNCTION get_ultima_performance(
  p_exercicio_id INT,
  p_user_id UUID
)
RETURNS TABLE (
  repeticoes INTEGER[],
  data_treino TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT h.repeticoes, h.data_treino
  FROM historico_cargas h
  WHERE h.exercicio_id = p_exercicio_id
    AND h.user_id = p_user_id
  ORDER BY h.data_treino DESC
  LIMIT 1;
END;
$$;
