import { createClient } from '@supabase/supabase-js';
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
export default async function handler(req,res){
  try{
    const {type,data}=req.body;
    if(type==='payment'){
      const mpRes=await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`,{headers:{Authorization:`Bearer ${process.env.MP_ACCESS_TOKEN}`}});
      const payment=await mpRes.json();
      if(payment.status==='approved'){
        const email=payment.metadata?.email||payment.payer?.email;
        const tipo=payment.metadata?.tipo;
        if(tipo==='pack'){
          const conv=parseInt(payment.metadata?.conversaciones||0);
          const {data:user}=await supabase.from('usuarios').select('conversaciones').eq('email',email).single();
          await supabase.from('usuarios').update({conversaciones:(user?.conversaciones||0)+conv}).eq('email',email);
        }
        if(tipo==='plan'){
          const plan=payment.metadata?.plan;
          await supabase.from('usuarios').update({plan,plan_activo:true}).eq('email',email);
          const {data:ref}=await supabase.from('usuarios').select('referido_por').eq('email',email).single();
          if(ref?.referido_por){
            const monto=payment.transaction_amount;
            const comision=monto*0.15;
            const {data:afi}=await supabase.from('usuarios').select('saldo').eq('codigo_afiliado',ref.referido_por).single();
            if(afi) await supabase.from('usuarios').update({saldo:(afi.saldo||0)+comision}).eq('codigo_afiliado',ref.referido_por);
          }
        }
      }
    }
    res.status(200).send('ok');
  }catch(e){ res.status(200).send('error pero ok'); }
}