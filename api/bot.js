import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
export default async function handler(req,res){
  const {email,mensaje}=req.body;
  const {data:user}=await supabase.from('usuarios').select('*').eq('email',email).single();
  if(!user || user.conversaciones<=0) return res.json({respuesta:'Sin saldo'});
  const completion=await openai.chat.completions.create({model:'gpt-4o-mini',messages:[{role:'system',content:`Sos un asistente de turnos. Horario: ${user.horario_inicio} a ${user.horario_fin}. Dias max calendario: ${user.dias_calendario}`},{role:'user',content:mensaje}]});
  await supabase.from('usuarios').update({conversaciones:user.conversaciones-1}).eq('email',email);
  res.json({respuesta:completion.choices[0].message.content});
}