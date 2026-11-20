// Gemini AI Service for JH Luxury Apparel
// Powers: AI Stylist, Intelligent Fit Advisor, and Admin Copywriter

import { GoogleGenAI } from '@google/genai';
import { Product, Size } from '../types';

let genAIClient: GoogleGenAI | null = null;

function getApiKey(): string {
  // Check Vite environment variables and window globals
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string; GEMINI_API_KEY?: string } }).env;
  const apiKey = envKey?.VITE_GEMINI_API_KEY || envKey?.GEMINI_API_KEY || '';
  return apiKey.trim();
}

function getClient(): GoogleGenAI | null {
  const key = getApiKey();
  if (!key) return null;
  if (!genAIClient) {
    try {
      genAIClient = new GoogleGenAI({ apiKey: key });
    } catch (err) {
      console.warn('Failed to initialize GoogleGenAI client:', err);
    }
  }
  return genAIClient;
}

export interface StylistMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  recommendedProductIds?: string[];
  stylingTips?: string[];
  timestamp: number;
}

/**
 * AI Fashion Stylist consultation
 */
export async function askStylistAdvisor(
  prompt: string,
  currentProduct: Product,
  catalog: Product[],
  history: StylistMessage[] = []
): Promise<{ text: string; recommendedProductIds: string[]; tips: string[] }> {
  const client = getClient();

  if (client) {
    try {
      const catalogSummary = catalog
        .map((p) => `- ${p.name} (${p.category}, ${p.color}, ₹${p.priceUsd}): ${p.tagline}`)
        .join('\n');

      const systemInstruction = `You are the lead artisan stylist for Jhonty Hub (JH), a luxury contemporary studio brand known for minimalist architectural tailoring, heavy organic cottons, and refined neutral color palettes.
Current Garment viewed: "${currentProduct.name}" (${currentProduct.category}, Color: ${currentProduct.color}, Fabric: ${currentProduct.specs.fabric}).
Available Studio Catalog:
${catalogSummary}

Provide knowledgeable, elegant, concise styling advice.
Format your answer in natural luxury editorial prose, with 2-3 specific styling bullet points. Mention complementary items from our catalog by name.`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nClient inquiry: ${prompt}` }] },
        ],
      });

      const responseText = response.text || '';
      
      // Extract recommended product IDs mentioned in the response
      const matchedIds = catalog
        .filter((p) => responseText.toLowerCase().includes(p.name.toLowerCase()) && p.id !== currentProduct.id)
        .map((p) => p.id);

      return {
        text: responseText,
        recommendedProductIds: matchedIds.slice(0, 3),
        tips: [
          `Pair ${currentProduct.name} with relaxed tailored trousers in an earthy stone tone.`,
          `Layer with minimalist leather accessories or silver hardware.`,
        ],
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to curated concierge:', err);
    }
  }

  // Curated luxury stylist engine (intelligent local fallback)
  await new Promise((resolve) => setTimeout(resolve, 600));

  const lower = prompt.toLowerCase();
  const recommended = currentProduct.pairWithIds || [];

  if (lower.includes('size') || lower.includes('fit') || lower.includes('loose') || lower.includes('tight')) {
    return {
      text: `For the **${currentProduct.name}**, the silhouette is tailored with an intentional ${currentProduct.specs.fit.toLowerCase()} cut. Crafted from ${currentProduct.specs.fabric} (${currentProduct.specs.weight}), it provides a structured drape that softens naturally over time. If you prefer a relaxed Parisian boxy drop-shoulder look, we suggest sizing up one tier.`,
      recommendedProductIds: recommended,
      tips: [
        `True to size offers clean architectural lines.`,
        `Size up for a fluid, oversized streetwear silhouette.`,
        `Model wears Size M at 6'1" with broad shoulders.`,
      ],
    };
  }

  if (lower.includes('color') || lower.includes('match') || lower.includes('pants') || lower.includes('shoes')) {
    return {
      text: `The **${currentProduct.color}** tone of the ${currentProduct.name} pairs effortlessly with monochromatic neutrals and deep indigo raw denim. To achieve the signature Jhonty Hub studio aesthetic, combine this top with relaxed pleated canvas trousers and minimalist leather derbies or clean low-profile trainers.`,
      recommendedProductIds: recommended,
      tips: [
        `High contrast: pair with Chalk White or Off-Black trousers.`,
        `Low contrast: tone-on-tone monochromatic layering.`,
        `Anchor with minimalist leather footwear and a canvas tote.`,
      ],
    };
  }

  return {
    text: `The **${currentProduct.name}** is an essential piece in the current studio collection. Its ${currentProduct.specs.fabric} fabrication gives it tactile weight and elegance. For a daytime ensemble, wear it casually unbuttoned over a high-twist jersey base; as twilight settles, layer under our tailored outerwear for depth and silhouette.`,
    recommendedProductIds: recommended,
    tips: [
      `Elevate with structured outerwear from our outerwear archive.`,
      `Roll cuffs slightly to highlight wrist accessory craftsmanship.`,
      `Machine wash cold on gentle cycle, flat dry to maintain tension.`,
    ],
  };
}

/**
 * Intelligent Size & Fit Recommender
 */
export async function recommendSizeAI(
  chestInches: number,
  heightCm: number,
  preferredFit: 'Slim' | 'Regular' | 'Oversized',
  product: Product
): Promise<{ recommendedSize: Size; reasoning: string }> {
  // Compute based on measurements
  const measurements = product.measurements;
  let targetSize: Size = 'M';

  if (chestInches <= 37) targetSize = 'XS';
  else if (chestInches <= 39) targetSize = 'S';
  else if (chestInches <= 42) targetSize = 'M';
  else if (chestInches <= 45) targetSize = 'L';
  else targetSize = 'XL';

  if (preferredFit === 'Oversized' && targetSize !== 'XL') {
    const sizeOrder: Size[] = ['XS', 'S', 'M', 'L', 'XL'];
    const idx = sizeOrder.indexOf(targetSize);
    targetSize = sizeOrder[Math.min(idx + 1, sizeOrder.length - 1)];
  } else if (preferredFit === 'Slim' && targetSize !== 'XS') {
    const sizeOrder: Size[] = ['XS', 'S', 'M', 'L', 'XL'];
    const idx = sizeOrder.indexOf(targetSize);
    targetSize = sizeOrder[Math.max(idx - 1, 0)];
  }

  const spec = measurements[targetSize];
  return {
    recommendedSize: targetSize,
    reasoning: `Based on a ${chestInches}" chest and ${heightCm}cm height with a ${preferredFit.toLowerCase()} preference, Size ${targetSize} delivers a ${spec.chest}" garment chest with ${spec.length}" body length for an impeccable drape.`,
  };
}

/**
 * AI Product Copywriter for Admin Panel
 */
export async function generateProductCopyAI(
  name: string,
  category: 'Tops' | 'Outerwear',
  color: string
): Promise<{ tagline: string; description: string; fabric: string; weight: string }> {
  const client = getClient();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are a luxury fashion copywriter. Generate product copy for:
Name: ${name}
Category: ${category}
Color: ${color}

Return ONLY a JSON object with this exact structure:
{
  "tagline": "one punchy luxury tagline under 12 words",
  "description": "one refined paragraph describing garment cut, tactile finish, and drape",
  "fabric": "luxurious fabric description, e.g. 100% Belgian Long-Staple Linen",
  "weight": "GSM weight, e.g. 280 GSM"
}`,
              },
            ],
          },
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.warn('Gemini copy generation failed, using procedural fallback:', err);
    }
  }

  return {
    tagline: `Architectural ${category.toLowerCase()} silhouette tailored in refined ${color.toLowerCase()}.`,
    description: `Expertly engineered with precision paneling and relaxed proportions. Designed for effortless transitions between studio sessions and evening gallery openings. Finished with reinforced seam binding and bespoke tonal accents.`,
    fabric: category === 'Outerwear' ? 'Heavyweight Cotton Twill / Technical Nylon Blend' : '100% Combed Long-Staple Organic Jersey',
    weight: category === 'Outerwear' ? '380 GSM' : '260 GSM',
  };
}
