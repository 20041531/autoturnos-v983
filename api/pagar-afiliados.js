import { createClient } from '@supabase/supabase-js';
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
export default async function handler(req,res){
  const {data:usuarios}=await supabase.from('usuarios').select('email,saldo').gt('saldo',0);
  res.json({afiliados:usuarios||[]});
}