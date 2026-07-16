import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import process from 'process';
import 'dotenv/config';

// Configuración de rutas e idiomas soportados
const localesPath = path.resolve('./src/locales'); 
const supportedLangs = ['es', 'en', 'de', 'fr'];

// Obtener el idioma origen desde la consola (Por defecto es 'es')
const baseLang = process.argv[2] || 'es';

if (!supportedLangs.includes(baseLang)) {
  console.error(`❌ Idioma base '${baseLang}' no soportado. Usa uno de: ${supportedLangs.join(', ')}`);
  process.exit(1);
}

// Los idiomas destino son todos los demás menos el origen
const targetLangs = supportedLangs.filter(lang => lang !== baseLang);

const langNames = {
  'es': 'Spanish',
  'en': 'English',
  'de': 'German',
  'fr': 'French'
};

// 4. EL CEREBRO: Instrucciones estrictas de Reforestal
const getSystemPrompt = (sourceLang, targetLang) => `
You are the official expert copywriter and translator for 'Reforestal', a regenerative economic cooperative.
Translate the following text from ${langNames[sourceLang]} to ${langNames[targetLang]}.

CRITICAL BRAND GUIDELINES (Based on Reforestal Kommunikationsrichtlinien):
1. TONE: "Approachably Statesmanlike" (Nahbar, aber staatsmännisch). Warm and direct, but with the unshakeable authority and precision of a Central Bank. We do NOT beg for donations. We offer a solid participation in a new era.
2. NO CHARITY WORDS: NEVER use words like "help", "save the world", "rescue", "do good" (helfen, retten, Gutes tun). We act from a position of strength and economic reason.
3. NO TREES, ONLY m²: NEVER talk about "planting trees" (Bäume pflanzen/Setzlinge). We create and secure "square meters (m²)" of ecosystem. A tree can die; a square meter endures.
4. NO RENATURATION: We do NOT "protect the rainforest" or "renaturate" (Renaturierung/Naturschutz). We do "regenerative economy" (Regenerative Wirtschaft) and "agroforestry".
5. THE 'POINTS' RULE: Our bonus currency is strictly called "Points" (Punkte in DE, Points in EN/FR, Puntos in ES). NEVER use "Credits", "Coins", "Tokens", or "Impact-Währung".
6. LANGUAGE SPECIFICS: 
   - If translating to German (de), ALWAYS use the capitalized informal "Du" (Du, Dein, Dir, Euch).
   - If translating to French (fr), use the informal "tu/ton".
   - If translating to English (en), maintain a premium, authoritative yet welcoming tone.
   - If translating to Spanish (es), use an accessible yet highly professional tone (tú, tuyo).
7. BRAND NAMES (CRITICAL): The names "Reforestal" and "terra utopia" are registered trademarks. NEVER translate them. "terra utopia" MUST ALWAYS be written entirely in lowercase.

OUTPUT RULES & ANTI-HALLUCINATION (CRITICAL):
- Return ONLY the perfectly translated text. DO NOT add any extra information, comments, or conversational filler (e.g., no "Here is the translation:").
- DO NOT hallucinate or invent context that is not in the source text.
- If the source text is just a number, a percentage, or a short code (e.g., ">90%", "125cm", "100%"), RETURN IT EXACTLY AS IT IS. Do NOT explain it. Do NOT translate the brand guidelines.
`;

const readJson = (filePath) => {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return {};
};

// Función para pausar la ejecución (Sleep)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const autoTranslate = async () => {
  if (!process.env.MISTRAL_API_KEY) {
    console.error("\n❌ ERROR CRÍTICO: No se encontró tu MISTRAL_API_KEY en los archivos .env");
    return;
  }

  const openai = new OpenAI({
    apiKey: process.env.MISTRAL_API_KEY, 
    baseURL: 'https://api.mistral.ai/v1', 
  });

  console.log(`🌍 Iniciando Traducción (Mistral Large)`);
  console.log(`➡️ Origen: [${baseLang.toUpperCase()}]`);
  console.log(`🔄 Destinos: [${targetLangs.join(', ').toUpperCase()}]`);

  const baseData = readJson(path.join(localesPath, `${baseLang}.json`));

  for (const lang of targetLangs) {
    const targetFilePath = path.join(localesPath, `${lang}.json`);
    const targetData = readJson(targetFilePath);
    let updatedCount = 0;

    console.log(`\nRevisando idioma: [${lang}]...`);

    // FUNCIÓN RECURSIVA PARA LEER OBJETOS ANIDADOS CON REINTENTOS
    const processNode = async (baseNode, targetNode, currentPath = "") => {
      for (const key of Object.keys(baseNode)) {
        const val = baseNode[key];
        const nodePath = currentPath ? `${currentPath}.${key}` : key;

        if (typeof val === 'object' && val !== null) {
          // Si es un bloque anidado, creamos el espacio en el destino y entramos
          if (!targetNode[key]) targetNode[key] = {};
          await processNode(val, targetNode[key], nodePath);
        } else if (typeof val === 'string') {
          // Si es un texto puro y NO existe en el destino, lo traducimos
          if (targetNode[key] === undefined) {
            
            // BARRERA 1: Si el texto está vacío, lo copiamos tal cual sin llamar a la IA
            if (val.trim() === "") {
              targetNode[key] = "";
              updatedCount++;
              console.log(` ⏭️ [${nodePath}] -> "" (Saltado: texto vacío)`);
              continue; 
            }

            let success = false;
            let retries = 0;
            const maxRetries = 3;

            while (!success && retries < maxRetries) {
              try {
                const response = await openai.chat.completions.create({
                  model: "mistral-large-latest", 
                  messages: [
                    { role: "system", content: getSystemPrompt(baseLang, lang) },
                    { role: "user", content: val }
                  ],
                  temperature: 0.1, // Temperatura súper baja para que sea 100% estricto y no alucine
                });

                const translatedText = response.choices[0].message.content.trim();
                targetNode[key] = translatedText;
                updatedCount++;
                success = true;
                
                console.log(` ✅ [${nodePath}] -> "${translatedText}"`);
                
                // Pausa de 1 segundo después de cada éxito para no saturar la API
                await sleep(1000); 

              } catch (error) {
                if (error.status === 429 || error.message.includes('429')) {
                  retries++;
                  console.warn(` ⚠️ Saturación de API (429) en [${nodePath}]. Reintentando en ${retries * 2} segundos... (Intento ${retries}/${maxRetries})`);
                  await sleep(retries * 2000); // Pausa exponencial: 2s, 4s, 6s
                } else {
                  console.error(` ❌ Error en [${nodePath}]:`, error.message);
                  break; // Si es otro error distinto a 429, cancela el intento para esta frase
                }
              }
            }
          }
        }
      }
    };

    // Iniciamos la revisión profunda
    await processNode(baseData, targetData);

    if (updatedCount > 0) {
      fs.writeFileSync(targetFilePath, JSON.stringify(targetData, null, 2), 'utf8');
      console.log(`💾 Archivo ${lang}.json guardado con ${updatedCount} traducciones.`);
    } else {
      console.log(`✨ El idioma ${lang} ya está sincronizado con ${baseLang}.`);
    }
  }

  console.log('\n🎉 ¡Proceso finalizado con éxito!');
};

autoTranslate();