import mercadopago from 'mercadopago';
mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).send('Method not allowed');
  const {tipo,cantidad,precio,plan,email,moneda}=req.body;
  if(!email) return res.status(400).json({error:'Falta email'});

  // PRECIOS OFICIALES - 25k / 35k / 45k
  const precios = {
    basico: { ARS: 25000, USD: 25 },
    pro: { ARS: 35000, USD: 35 },
    premium: { ARS: 45000, USD: 45 }
  };

  try{
    if(tipo==='pack'){
      const pref={
        items:[{title:`Pack ${cantidad} conversaciones`,quantity:1,currency_id:'USD',unit_price:parseFloat(precio)}],
        payer:{email},
        metadata:{tipo:'pack',conversaciones:cantidad,email},
        back_urls:{
          success:`${process.env.URL}/dashboard.html?pack=${cantidad}&pagado=1`,
          failure:`${process.env.URL}/dashboard.html?pagado=0`,
          pending:`${process.env.URL}/dashboard.html?pagado=0`
        },
        auto_return:'approved'
      };
      const mp=await mercadopago.preferences.create(pref);
      return res.json({url:mp.body.init_point});
    }

    if(tipo==='plan'){
      const planKey = (plan||'').toLowerCase();
      // usa precio fijo si viene plan conocido, sino usa el que manda el front
      let precioFinal = parseFloat(precio);
      let monedaFinal = moneda || 'ARS';
      
      if(precios[planKey]){
        // si moneda es USD usa USD, si no ARS
        if(monedaFinal === 'USD'){
          precioFinal = precios[planKey].USD;
        } else {
          precioFinal = precios[planKey].ARS;
        }
      }

      const pref={
        items:[{title:`Plan ${planKey.toUpperCase()} - autoturnos.com.ar`,quantity:1,currency_id:monedaFinal,unit_price:precioFinal}],
        payer:{email},
        metadata:{tipo:'plan',plan:planKey,email,moneda:monedaFinal},
        back_urls:{
          success:`${process.env.URL}/dashboard.html?plan=${planKey}&pagado=1`,
          failure:`${process.env.URL}/dashboard.html?plan=${planKey}&pagado=0`,
          pending:`${process.env.URL}/dashboard.html?plan=${planKey}&pagado=0`
        },
        auto_return:'approved'
      };
      const mp=await mercadopago.preferences.create(pref);
      return res.json({url:mp.body.init_point});
    }

    return res.status(400).json({error:'Tipo invalido'});

  }catch(e){ 
    console.log(e);
    return res.status(500).json({error:e.message}); 
  }
}
