import mercadopago from 'mercadopago';
mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).send('Method not allowed');

  // Soporta los 2 formatos: el viejo (tipo) y el nuevo (type/pack)
  const {tipo, type, cantidad, pack, precio, plan, email, moneda}=req.body;
  const tipoFinal = tipo || type; // puede venir 'pack' o 'conversaciones' o 'plan'

  if(!email){
    // si viene de conversaciones.html intenta sacar email de localStorage no hay, pide
    // por ahora lo dejamos opcional para test, en producción sacalo de supabase auth
    // return res.status(400).json({error:'Falta email'});
  }

  // PRECIOS OFICIALES - planes y packs
  const preciosPlanes = {
    basico: { ARS: 25000, USD: 25 },
    pro: { ARS: 35000, USD: 35 },
    premium: { ARS: 45000, USD: 45 }
  };
  const preciosPacks = {
    '250': 12,
    '500': 20,
    '1000': 35
  };

  try{
    // CASO 1: PACKS DE CONVERSACIONES (viene de conversaciones.html)
    if(tipoFinal==='conversaciones' || tipoFinal==='pack'){
      const cant = cantidad || pack; // 250 / 500 / 1000
      const precioPack = preciosPacks[cant] || parseFloat(precio);

      if(!precioPack) return res.status(400).json({error:'Pack invalido'});

      const pref={
        items:[{title:`Pack ${cant} conversaciones - autoturnos.com.ar`,quantity:1,currency_id:'USD',unit_price:precioPack}],
        payer:{email: email || 'cliente@autoturnos.com.ar'},
        metadata:{tipo:'pack',conversaciones:cant,email: email || 'test'},
        back_urls:{
          success:`${process.env.URL}/dashboard.html?pack=${cant}&pagado=1`,
          failure:`${process.env.URL}/dashboard.html?pagado=0`,
          pending:`${process.env.URL}/dashboard.html?pagado=0`
        },
        auto_return:'approved'
      };
      const mp=await mercadopago.preferences.create(pref);
      return res.json({url:mp.body.init_point});
    }

    // CASO 2: PLANES
    if(tipoFinal==='plan'){
      const planKey = (plan||'').toLowerCase();
      let precioFinal = parseFloat(precio);
      let monedaFinal = moneda || 'ARS';

      if(preciosPlanes[planKey]){
        if(monedaFinal === 'USD'){
          precioFinal = preciosPlanes[planKey].USD;
        } else {
          precioFinal = preciosPlanes[planKey].ARS;
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
