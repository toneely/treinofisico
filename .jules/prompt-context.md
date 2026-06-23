# Contexto do Projeto e Regras de Negócio - App Treino Físico

## 1. Escopo do Aplicativo
Este é um aplicativo personalizado de gestão de treino focado em força base, proteção articular e transição progressiva para a Calistenia (peso corporal). O sistema deve gerir as rotinas semanais, calcular a evolução da força relativa e automatizar o tempo sob tensão baseado em blocos de séries alternadas (músculos opostos/antagonistas).

---

## 2. Perfil do Utilizador (Dados Base)
- **Nome/Id:** Tone
- **Idade:** 45 anos (Atenção redobrada à saúde dos tendões e tecidos conjuntivos)
- **Massa Corpórea Inicial:** 45.0 kg (Utilizado como variável crítica para cálculo de força relativa)
- **Objetivo Principal:** Transição total da musculação para calistenia, desenvolvimento de força máxima intencional e preservação da mobilidade.
- **Atividades Cruzadas:** Deslocamento diário de bike (2.5 km com sprints em ladeira) e Capoeira Angola (quartas e sextas-feiras à noite).

---

## 3. Arquitetura de Dados & Consistência (Fibras Musculares)
O plano é baseado em 3 estímulos fisiológicos que o backend deve respeitar:
1. **Fibras Tipo IIx (Contração Rápida Pura):** Exercícios multiarticulares pesados, executados estritamente na faixa de **3 séries de 7 a 10 repetições com carga máxima intencional**. Exige descanso longo (recuperação do sistema ATP-CP).
2. **Fibras Tipo IIa (Contração Rápida Intermediária):** Exercícios com carga moderada/alta na faixa de 10-12 repetições para hipertrofia miofibrilar.
3. **Fibras Tipo I (Contração Lenta):** Exercícios isoladores e posturais com maior volume (12-15 repetições) para resistência, vascularização e recuperação articular.

---

## 4. Lógica de Execução (Séries Alternadas / Supersets)
O aplicativo **NÃO** deve listar os exercícios de forma linear tradicional. A interface e a lógica de treino devem ser estruturadas por **Blocos Intercalados**:
- Cada bloco possui dois exercícios (Exercício 1 e Exercício 2).
- **Fluxo no ecrã:** O utilizador executa 1 série do Exercício 1 -> O app dispara o cronómetro de descanso -> Durante o descanso passivo do primeiro músculo, o utilizador executa 1 série do Exercício 2 -> Novo descanso -> Repete até completar **3 séries** de ambos antes de libertar o próximo Bloco.
- **Benefício Fisiológico:** Otimização do tempo e regeneração completa do ATP das Fibras Tipo IIx sem prolongar a permanência na academia.

---

## 5. Regras de Automatização e Inteligência (Filtros do Dashboard)

### Regra Coringa (Filtro da Capoeira Angola)
A Capoeira Angola exige alta demanda articular de joelhos, tornozelos e core. Para evitar overtraining:
- Ao abrir o app de manhã, o sistema deve perguntar: *"Vais à Capoeira hoje à noite?"*.
- Se o utilizador responder **SIM**, o sistema deve ocultar ou bloquear o **Treino C (Pernas Coringa)** para proteger a cadeia inferior, sugerindo descanso ativo.
- Se responder **NÃO**, o Treino C fica totalmente elegível para execução.

### Inteligência da Força Relativa (Massa Corpórea vs Carga)
Para os exercícios calisténicos identificados no catálogo (`depende_peso_corporal = true`, como Flexões e Barra Fixa):
- O aplicativo deve calcular a métrica de evolução somando o peso real do utilizador (`massa_corporea_atual`) com a `carga_utilizada` (se houver sobrecarga).
- Se a massa corpórea do utilizador subir (ex: de 45 kg para 47 kg) e ele mantiver o número de repetições na barra fixa, o sistema deve reportar **ganho real de força absoluta**.

### Limitação de Amplitude Controlada (Mecânica da Polia)
- Para o exercício de Abdução na Polia, o sistema deve apresentar um alerta visual ou nota técnica instruindo o utilizador a **não ultrapassar os 45º de amplitude lateral**, mantendo o vetor de força focado puramente nos glúteos médio e mínimo (estabilizadores dos chutes e da bike).

---

## 6. Divisão das Rotinas (Estrutura Alvo para Leitura)
O Jules AI deve ler o ficheiro `docs/treino-revisado.md` e mapear os blocos exatamente da seguinte forma:
- **Treino A (Empurrar):** Peitoral, Ombros e Tríceps. (5 blocos alternados, 3 séries).
- **Treino B (Puxar):** Costas, Bíceps e Trapézio. (5 blocos alternados, 3 séries).
- **Treino C (Pernas Coringa):** Quadríceps, Isquiotibiais (Cadeira Flexora), Adutores e Abdutores (Polia baixa). (3 blocos alternados, 3 séries).
- **Treino D (Sábado - Compensação Angola):** Postural e corretivo. Ombros posteriores, manguito rotador, extensão lombar, prancha estática e flexão tibial (sem falha concêntrica, foco em Fibras Tipo I).