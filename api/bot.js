import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method!== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, mensaje, nombre } = req.body;
  if (!email ||!mensaje) return res.status(400).json({ error: 'Falta email o mensaje' });

  try {
    const { data: user } = await supabase.from('usuarios').select('*').eq('email', email).single();

    if (!user) return res.json({ respuesta: 'Tu cuenta no está activa. Activá tu plan en autoturnos.com.ar' });

    // CONTROL: todos los planes tienen 1000 gratis
    if (!user.conversaciones || user.conversaciones <= 0) {
      return res.json({ respuesta: 'Te quedaste sin las 1000 conversaciones incluidas. Entrá a autoturnos.com.ar para comprar un pack extra y seguir agendando.' });
    }

    const systemPrompt = `
Sos el asistente de ${user.nombre_negocio || 'este negocio'}.
Horario: ${user.horario_inicio || '09:00'} a ${user.horario_fin || '18:00'}.
Dias max para agendar: ${user.dias_calendario || 7}.
Plan: ${user.plan || 'sin plan'} - le quedan ${user.conversaciones} conversaciones.
Link de pago: ${user.link_pago || 'no pedir seña'}
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

    // SIEMPRE descuenta 1, tenga plan o no, porque son 1000 incluidas
    await supabase.from('usuarios').update({
      conversaciones: user.conversaciones - 1
    }).eq('email', email);

    return res.json({ respuesta: completion.choices[0].message.content });

  } catch (e) {
    console.log(e);
    return res.status(500).json({ respuesta: 'Estoy con demoras, ¿me repetís porfa?' });
  }
}
