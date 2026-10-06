import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ADMIN_EMAIL = 'dariobrugo1@gmail.com';

export default async function handler(req, res) {
  if (req.method!== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, mensaje, nombre, test_plan } = req.body;
  if (!email ||!mensaje) return res.status(400).json({ error: 'Falta email o mensaje' });

  try {
    const { data: user } = await supabase.from('usuarios').select('*').eq('email', email).single();

    if (!user) return res.json({ respuesta: 'Tu cuenta no está activa. Activá tu plan en autoturnos.com.ar' });

    // 1. CONTROL ON/OFF - Si el bot está desactivado desde admin o panel cliente
    if (user.bot_activo === false) {
      return res.json({ respuesta: '' }); // No responde nada, está pausado
    }

    // 2. PLAN ACTUAL - Si es admin y manda test_plan, lo usa para probar
    let planActual = user.plan || 'basico';
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && test_plan) {
      planActual = test_plan;
    }

    // 3. CONTROL CONVERSACIONES - Todos tienen 1000 gratis
    if (!user.conversaciones || user.conversaciones <= 0) {
      return res.json({ respuesta: 'Te quedaste sin las 1000 conversaciones incluidas. Entrá a autoturnos.com.ar para comprar un pack extra y seguir agendando.' });
    }

    // 4. PROMPT SEGÚN PACK - Esto es lo que cambia cuando vos cambias de Básico a Pro a Premium
    let extraSegunPack = '';
    if (planActual === 'basico') {
      extraSegunPack = 'Solo agenda turnos. No ofrezcas recordatorios ni cobros.';
    } else if (planActual === 'pro') {
      extraSegunPack = 'Agenda turnos y ofrece enviar recordatorio por WhatsApp 24hs antes.';
    } else if (planActual === 'premium') {
      extraSegunPack = 'Sos premium: agenda, ofrece recordatorios, y si tiene link_pago cobra seña del 20% para confirmar. Sé vendedor.';
    }

    const systemPrompt = `
Sos el asistente de ${user.nombre_negocio || 'este negocio'}.
Horario: ${user.horario_inicio || '09:00'} a ${user.horario_fin || '18:00'}.
Dias max para agendar: ${user.dias_calendario || 7}.
Plan: ${planActual} - le quedan ${user.conversaciones} conversaciones.
Link de pago: ${user.link_pago || 'no pedir seña'}
${extraSegunPack}
Sé corto, amable, cerrá el turno. No salgas del horario.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: mensaje }
      ],
      temperature: 0.4
    });

    // Descuenta 1 conversación
    await supabase.from('usuarios').update({
      conversaciones: user.conversaciones - 1
    }).eq('email', email);

    return res.json({ respuesta: completion.choices[0].message.content, plan_usado: planActual });

  } catch (e) {
    console.log(e);
    return res.status(500).json({ respuesta: 'Estoy con demoras, ¿me repetís porfa?' });
  }
}
