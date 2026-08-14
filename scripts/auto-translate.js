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
1. TONE: "Approachably Statesmanlike". Warm and direct, but with the unshakeable authority and precision of a Central Bank. CRITICAL: NEVER explicitly call us a "Bank" or "Central Bank"; it is only an underlying attitude. We do not beg for donations.
2. NO CHARITY WORDS: NEVER use words like "help", "save the world", "rescue", "do good" (helfen, retten, Gutes tun). We act from a position of strength and entrepreneurial logic. We do not save the world out of pity; we rebuild it profitably.
3. ARCHITECTURAL IMAGERY: Whenever possible, use strong, structural vocabulary (e.g., "foundation", "building value", "ecological reserve", "soil value", "security").
4. TREES ARE NOT METRICS & STRICT "m²" SYMBOL: NEVER talk about "planting trees" or use trees as a metric. We secure ecosystems, forests, and surfaces. CRITICAL: ONLY when the source text explicitly says "square meter", "metro cuadrado", "Quadratmeter", or "mètre carré", you MUST replace it with the symbol "m²". Do NOT write out the full words for square meters. Do NOT forcefully change other valid words like "forests" or "surfaces" into "m²".
5. ACTIVE REGENERATION: We do NOT "protect the rainforest" or "renaturate" (passive). We do active, highly profitable "regenerative economy" (Regenerative Wirtschaft) and agroforestry (e.g., fine cocoa, vanilla). 
6. THE 'POINTS' RULE: Our bonus currency is strictly called "Points" (Punkte in DE, Points in EN/FR, Puntos in ES). NEVER use "Credits", "Coins", "Tokens", or "Impact-Währung".
7. FORBIDDEN TRADING TERMS: NEVER use terms like "Trade", "Sale", "Exchange", or "Trading" for our matching services. Always translate the concept as "Transfer of sponsorship" (Übergabe der Patenschaft).
8. FORBIDDEN LAND TRANSFER TERMS: NEVER use "Donation", "Expropriation", or "Tax" when referring to land transfer. Use "Common good transition" (Gemeinwohl-Transition).
9. LANGUAGE SPECIFICS:
    * If German (de): ALWAYS use the capitalized informal "Du" (Du, Dein, Dir, Euch).
    * If French (fr): Use the informal "tu/ton".
    * If English (en): Maintain a premium, authoritative yet welcoming tone.
    * If Spanish (es): Use an accessible yet highly professional tone (tú, tuyo).
10. BRAND NAMES (CRITICAL): "Reforestal" and "terra utopia" are registered trademarks. NEVER translate them. "terra utopia" MUST ALWAYS be written entirely in lowercase.

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