import { supabase } from '../supabaseClient';
let cachedOffset = null;
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
const umDiaEmMs = 86400000;
const yesterday = today - umDiaEmMs;
cachedOffset = yesterday - anchorDate;
return cachedOffset;
}
return 0;
}
export function shiftDemoDate(dateString, offset) {
if (!offset || offset === 0 || !dateString) return dateString;
const originalDate = new Date(dateString).getTime();
return new Date(originalDate + offset).toISOString();
}
