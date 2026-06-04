import { jsPDF } from "jspdf";

export const exportHistoryToPDF = (userData, history) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cores
  const primary = "#4F46E5";
  const secondary = "#64748B";
  const light = "#F8FAFC";
  const dark = "#1E293B";
  const workoutHeaderBg = "#E0E7FF";

  // Cabeçalho
  doc.setFillColor(dark);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor("#FFFFFF");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE EVOLUÇÃO", 20, 25);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 20, 32);

  // Informações do Usuário
  doc.setTextColor(dark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO ATLETA", 20, 55);

  doc.setDrawColor(primary);
  doc.setLineWidth(0.5);
  doc.line(20, 57, 65, 57);

  doc.setFontSize(10);
  doc.setTextColor(secondary);
  doc.text(`Nome: ${userData?.nome}`, 20, 65);
  doc.text(`Massa Corpórea: ${userData?.massa_corporea_atual} kg`, 20, 70);
  doc.text(`Foco de Treino: ${userData?.foco_treino}`, 20, 75);
  doc.text(`Atividade Alt.: ${userData?.atividade_alternativa}`, 20, 80);

  // Seção de Medidas Corporais (Condicional)
  let currentY = 100;
  const hasMedidas = userData?.medidas && Object.values(userData.medidas).some(v => v > 0);

  if (hasMedidas) {
    doc.setFontSize(14);
    doc.setTextColor(dark);
    doc.setFont("helvetica", "bold");
    doc.text("MEDIDAS CORPORAIS", 20, currentY);
    doc.line(20, currentY + 2, 75, currentY + 2);

    currentY += 10;
    doc.setFontSize(9);
    doc.setTextColor(secondary);
    doc.setFont("helvetica", "normal");

    const entries = Object.entries(userData.medidas).filter(([_, v]) => v > 0);
    const midPoint = Math.ceil(entries.length / 2);

    entries.forEach(([key, val], idx) => {
        const x = idx < midPoint ? 20 : 110;
        const y = currentY + (idx < midPoint ? idx : idx - midPoint) * 6;
        doc.text(`${key.replace(/_/g, " ").toUpperCase()}: ${val} cm`, x, y);
    });

    currentY += (midPoint * 6) + 10;
  }

  // Histórico de Cargas
  doc.setFontSize(14);
  doc.setTextColor(dark);
  doc.setFont("helvetica", "bold");
  doc.text("HISTÓRICO DE CARGAS", 20, currentY);
  doc.line(20, currentY + 2, 80, currentY + 2);

  currentY += 10;

  // Agrupamento por Treino e Data
  const grouped = history.reduce((acc, curr) => {
    const date = new Date(curr.data_treino).toLocaleDateString();
    const letra = curr.letra_treino || 'X';
    const key = `${date}_${letra}`;
    if (!acc[key]) acc[key] = { date, letra, items: [] };
    acc[key].items.push(curr);
    return acc;
  }, {});

  const sortedGroups = Object.values(grouped).sort((a, b) => {
    return new Date(b.items[0].data_treino) - new Date(a.items[0].data_treino);
  });

  const drawTableHeader = (y) => {
    doc.setFillColor(light);
    doc.rect(20, y, pageWidth - 40, 8, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(dark);
    doc.text("Exercício", 25, y + 5);
    doc.text("Séries", 110, y + 5);
    doc.text("Carga (kg)", 135, y + 5);
    doc.text("Reps", 170, y + 5);
    return y + 10;
  };

  sortedGroups.forEach((group) => {
    // Verificar espaço para o cabeçalho do grupo + pelo menos um item
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
    }

    // Cabeçalho do Grupo (Treino)
    doc.setFillColor(workoutHeaderBg);
    doc.rect(20, currentY, pageWidth - 40, 10, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primary);
    doc.text(`${group.date} - TREINO ${group.letra}`, 25, currentY + 6.5);
    currentY += 12;

    currentY = drawTableHeader(currentY);

    group.items.forEach((item) => {
      if (currentY > 280) {
        doc.addPage();
        currentY = 20;
        currentY = drawTableHeader(currentY);
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(dark);

      doc.text(item.exercicios.nome, 25, currentY);
      doc.setTextColor(secondary);
      doc.text((item.series_executadas || 3).toString(), 115, currentY);
      doc.text(item.carga_utilizada.toString(), 145, currentY);
      doc.text(item.repeticoes_feitas.toString(), 175, currentY);

      doc.setDrawColor(240, 240, 240);
      doc.line(20, currentY + 2, pageWidth - 20, currentY + 2);

      currentY += 8;
    });

    currentY += 5; // Espaço entre grupos
  });

  // Rodapé com paginação
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(secondary);
    doc.text(`Página ${i} de ${pageCount} - SmartTraining System V2.0`, pageWidth / 2, 290, { align: "center" });
  }

  doc.save(`Historico_Treino_${userData?.nome?.replace(/\s+/g, "_")}.pdf`);
};
