import { supabase } from '../supabaseClient.js';

let cachedOffset = null;
let cachedPhotoOffset = null;

const SEVEN_DAYS_IN_MS = 604800000;
const ONE_DAY_IN_MS = 86400000;

export async function getDemoOffset(userId, isDemo) {
  if (!isDemo || !userId) return 0;
  if (cachedOffset !== null) return cachedOffset;

  const { data, error } = await supabase
    .from('historico_cargas')
    .select('data_treino')
    .eq('user_id', userId)
    .order('data_treino', { ascending: false })
    .limit(1);

  if (!error && data && data.length !== 0) {
    const anchorDate = new Date(data[0].data_treino).getTime();
    const today = new Date().getTime();
    // Alinhamento Semanal: ajuste para blocos de semanas completas
    const baseDiff = today - anchorDate;
    cachedOffset = Math.round(baseDiff / SEVEN_DAYS_IN_MS) * SEVEN_DAYS_IN_MS;
    return cachedOffset;
  }
  return 0;
}

export async function getPhotoDemoOffset(userId, isDemo) {
  if (!isDemo || !userId) return 0;
  if (cachedPhotoOffset !== null) return cachedPhotoOffset;

  const { data, error } = await supabase
    .from('fotos_progresso')
    .select('data_foto')
    .eq('user_id', userId)
    .order('data_foto', { ascending: false })
    .limit(1);

  if (!error && data && data.length > 0) {
    const anchorDate = new Date(data[0].data_foto).getTime();
    const today = new Date().getTime();
    // Alinhamento Semanal: ajuste para blocos de semanas completas
    const baseDiff = today - anchorDate;
    cachedPhotoOffset = Math.round(baseDiff / SEVEN_DAYS_IN_MS) * SEVEN_DAYS_IN_MS;
    return cachedPhotoOffset;
  }
  return 0;
}

export function shiftDemoDate(dateString, offset) {
  if (!offset || offset === 0 || !dateString) return dateString;
  const originalDate = new Date(dateString).getTime();
  let shiftedTime = originalDate + offset;
  let shiftedDate = new Date(shiftedTime);

  // Garantia de Domingos Livres: se cair em um domingo, ajusta o deslocamento em mais 1 dia (segunda-feira) ou menos 1 dia (sábado)
  if (shiftedDate.getDay() === 0) {
    shiftedTime += ONE_DAY_IN_MS; // Empurra para a segunda-feira seguinte
  }

  return new Date(shiftedTime).toISOString();
}
