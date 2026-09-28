import mercadopago from 'mercadopago';
mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).send('Method not allowed');
  const {tipo,cantidad,precio,plan,email,moneda}=req.body;
  if(!email) return res.status(400).json({error:'Falta email'});
  try{
    if(tipo==='pack'){
      const pref={items:[{title:`Pack ${cantidad} conversaciones`,quantity:1,currency_id:'USD',unit_price:parseFloat(precio)}],payer:{email},metadata:{tipo:'pack',conversaciones:cantidad,email},back_urls:{success:`${process.env.URL}/?pago=ok`,failure:`${process.env.URL}/?pago=fail`},auto_return:'approved'};
      const mp=await mercadopago.preferences.create(pref);
      return res.json({url:mp.body.init_point});
    }
    if(tipo==='plan'){
      const pref={items:[{title:`Plan ${plan}`,quantity:1,currency_id:moneda,unit_price:parseFloat(precio)}],payer:{email},metadata:{tipo:'plan',plan,email,moneda},back_urls:{success:`${process.env.URL}/?pago=ok`,failure:`${process.env.URL}/?pago=fail`},auto_return:'approved'};
      const mp=await mercadopago.preferences.create(pref);
      return res.json({url:mp.body.init_point});
    }
  }catch(e){ return res.status(500).json({error:e.message}); }
}