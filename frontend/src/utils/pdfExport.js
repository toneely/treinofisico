import { jsPDF } from "jspdf";

export const exportHistoryToPDF = (userData, history) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cores
  const primary = "#4F46E5";
  const secondary = "#64748B";
  const light = "#F8FAFC";
  const dark = "#1E293B";

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

  // Medidas
  if (userData?.medidas) {
    doc.setFontSize(12);
    doc.setTextColor(dark);
    doc.text("Medidas Corporais", 120, 55);
    doc.setFontSize(9);
    doc.setTextColor(secondary);
    let mY = 62;
    Object.entries(userData.medidas).forEach(([key, val]) => {
      doc.text(`${key.replace("_", " ")}: ${val} cm`, 120, mY);
      mY += 5;
    });
  }

  // Histórico de Cargas
  doc.setFontSize(14);
  doc.setTextColor(dark);
  doc.setFont("helvetica", "bold");
  doc.text("HISTÓRICO DE CARGAS", 20, 105);
  doc.line(20, 107, 75, 107);

  let currentY = 115;
  const itemsPerPage = 25;
  let count = 0;

  // Header da tabela
  doc.setFillColor(light);
  doc.rect(20, currentY, pageWidth - 40, 8, "F");
  doc.setFontSize(9);
  doc.setTextColor(dark);
  doc.text("Data", 25, currentY + 5);
  doc.text("Exercício", 55, currentY + 5);
  doc.text("Carga (kg)", 135, currentY + 5);
  doc.text("Reps", 165, currentY + 5);

  currentY += 12;

  history.forEach((item, index) => {
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;

      // Header da tabela na nova página
      doc.setFillColor(light);
      doc.rect(20, currentY, pageWidth - 40, 8, "F");
      doc.setFontSize(9);
      doc.setTextColor(dark);
      doc.text("Data", 25, currentY + 5);
      doc.text("Exercício", 55, currentY + 5);
      doc.text("Carga (kg)", 135, currentY + 5);
      doc.text("Reps", 165, currentY + 5);
      currentY += 12;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(secondary);

    const dateStr = new Date(item.data_treino).toLocaleDateString();
    doc.text(dateStr, 25, currentY);

    doc.setTextColor(dark);
    doc.setFont("helvetica", "bold");
    doc.text(item.exercicios.nome, 55, currentY);

    doc.setFont("helvetica", "normal");
    doc.text(item.carga_utilizada.toString(), 140, currentY);
    doc.text(item.repeticoes_feitas.toString(), 168, currentY);

    doc.setDrawColor(240, 240, 240);
    doc.line(20, currentY + 2, pageWidth - 20, currentY + 2);

    currentY += 8;
  });

  // Rodapé com paginação
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(secondary);
    doc.text(`Página ${i} de ${pageCount} - SmartTraining System V2.0`, pageWidth / 2, 290, { align: "center" });
  }

  doc.save(`Historico_Treino_${userData?.nome?.replace(" ", "_")}.pdf`);
};
