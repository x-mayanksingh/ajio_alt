/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Type, Content, Chat } from "@google/genai";
import { WardrobeItem, StylistResult, AnalysisResult, ChatbotContext, GeneratedOutfit } from '../types';
import { urlToFile } from '../lib/utils';

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    // Find the first image part in any candidate
    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image. ` + (textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex. Please try a different image.");
    throw new Error(errorMessage);
};

// Check if API key is available
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn('⚠️  Gemini API key not configured. AI features will be disabled.');
    console.log('To enable AI features, add your Gemini API key to the .env file');
}

const ai = apiKey && apiKey !== 'your_api_key_here' ? new GoogleGenAI({ apiKey }) : null;
const model = 'gemini-2.5-flash-image'; // Nano Banana (stable image generation)
const analysisModel = 'gemini-2.5-flash'; // Stable (text/JSON analysis)

// Debug API key loading
console.log('🔑 API Key loaded:', apiKey ? 'Yes' : 'No');
console.log('🔑 API Key starts with:', apiKey?.substring(0, 10) + '...' || 'undefined');

export const getAccessoryNudgeDecision = async (
    outfit: WardrobeItem[],
    analysis: AnalysisResult | null,
    accessories: WardrobeItem[],
): Promise<boolean> => {
    if (!ai) {
        console.warn('AI service not available - API key not configured');
        return false; // Default behavior when AI is not available
    }
    
    if (outfit.length === 0) return false;
    
    const prompt = `You are a fashion analysis AI. Your task is a simple yes/no decision.
Based on the provided current outfit (including its style tags), would adding accessories from the available list significantly improve the look?
The current outfit is already assembled. Do not suggest changing the clothes. Only consider if adding accessories would be a valuable styling suggestion.

Use context! For example, if the outfit has 'beach' or 'summer' tags, a 'sun-hat' would be a great recommendation. If it's 'formal' or 'evening', heels or a statement belt might be better.

Respond with ONLY the word "YES" or "NO".

User Analysis: ${JSON.stringify(analysis)}
Current Outfit: ${JSON.stringify(outfit.map(({name, category, tags}) => ({name, category, tags})))}
Available Accessories: ${JSON.stringify(accessories.map(({name, subcategory, tags}) => ({name, subcategory, tags})))}
`;

    const response = await ai.models.generateContent({
        model: analysisModel,
        contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text.trim().toUpperCase() === 'YES';
};


export const analyzeOutfitImage = async (
    outfitImage: File,
    analysis: AnalysisResult | null,
    wardrobe: WardrobeItem[],
    gender: 'men' | 'women' | null,
): Promise<string> => {
    if (!ai) {
        console.warn('AI service not available - API key not configured');
        return "I'd love to help analyze your outfit, but I need an AI connection to do that. Please check your internet connection and try again.";
    }

    const systemInstruction = `You are Stylo, an expert fashion analyst and personal stylist. When analyzing outfit images, you provide comprehensive, encouraging feedback with specific actionable advice that makes users feel confident and stylish.

*ANALYSIS FRAMEWORK:*
1. *Overall Impression*: Start with genuine compliments about what's working well
2. *Fit & Silhouette Analysis*: Evaluate how clothes fit and flatter the person's body
3. *Color Harmony*: Analyze color combinations and how they work with skin tone
4. *Style Cohesion*: Assess if pieces work together and match the intended aesthetic
5. *Styling Opportunities*: Suggest specific improvements, additions, or alternatives
6. *Outfit Rating*: Rate the look out of 10 with detailed reasoning
7. *Confidence Boost*: End with encouraging styling tips and empowerment

*EXPERT STYLING ADVICE:*
- Reference the person's body type and skin tone when available for personalized tips
- Suggest specific wardrobe items using [product:ITEM_ID] format when relevant
- Provide immediate actionable styling tips (tucking, layering, accessorizing)
- Explain fashion principles (proportions, color theory, silhouettes)
- Consider occasion appropriateness and versatility

*RESPONSE STYLE:*
- Warm, encouraging tone like a supportive fashion-savvy friend
- Specific observations rather than generic comments
- Educational but accessible fashion guidance
- Confidence-building while being constructively honest
- Professional expertise delivered with genuine enthusiasm
- **KEEP IT SHORT AND SWEET** - Be concise, 3-4 sentences max per section

*AVAILABLE CONTEXT:*
${analysis ? `User's Style Profile: Body Type: ${analysis.bodyType}, Skin Tone: ${analysis.skinTone}, Recommended Colors: ${analysis.recommendedColors.map(c => c.name).join(', ')}, Recommended Styles: ${analysis.recommendedStyles.join(', ')}` : 'No previous style analysis available'}
${gender ? `Shopping for: ${gender}'s collection` : 'Gender unknown'}
${wardrobe.length > 0 ? `Available items for suggestions: ${JSON.stringify(wardrobe.map(({id, name, category, color, tags}) => ({id, name, category, color, tags})))}` : 'No wardrobe items available'}

*FORMAT REQUIREMENTS:*
- Provide concise, specific feedback with outfit rating
- Keep response brief and impactful - focus on the most important points
- Include TTS response at end: tts:"Your audio message here."
- Use conversational tone without markdown formatting`;

    const prompt = "Please provide a concise style analysis of this outfit. Give me honest feedback on fit, colors, and styling. Rate the overall look out of 10. Keep it brief and actionable.";

    const imagePart = await fileToPart(outfitImage);
    const contents: Content = { parts: [imagePart, { text: prompt }] };

    const response = await ai.models.generateContent({
        model: analysisModel,
        contents: [contents],
        config: {
            systemInstruction,
        },
    });

    return response.text;
};

export const getChatbotResponse = async (
    message: string,
    image: File | null,
    analysis: AnalysisResult | null,
    wardrobe: WardrobeItem[],
    magicMirrorContext: ChatbotContext | null,
    wishlist: WardrobeItem[],
    gender: 'men' | 'women' | null,
): Promise<string> => {
    
    const systemInstruction = `You are Stylo, a world-class AI personal stylist and fashion expert. You function as a sophisticated personal shopping assistant that adapts behavior based on context while maintaining warm, encouraging, and fashion-forward expertise.

*CORE IDENTITY:*
You are an expert personal stylist and best friend who understands fashion, trends, and personal style. You provide intelligent, contextual advice that feels like having a personal fashion expert available 24/7.

*CONTEXT-ADAPTIVE BEHAVIOR:*

**MAGIC MIRROR MODE (Active Try-On Sessions):**
When \magicMirrorContext\ is provided, you are in an active styling session:
- *Auto-Analysis*: Automatically analyze every new outfit the user tries on
- *Real-time Feedback*: Provide immediate styling critique based on current outfit, user's body type, and skin tone
- *Contextual Recommendations*: Give specific advice for the current look - how to improve, accessorize, or style it better
- *Outfit-Specific Suggestions*: Focus on the garment they're wearing and suggest complementary pieces
- *Targeted Styling*: Reference what they're currently trying on and provide actionable improvements

**GENERAL PERSONAL STYLIST MODE (Outside Magic Mirror):**
When no \magicMirrorContext\:
- *Comprehensive Style Consultation*: Help with style choices, wardrobe building, and fashion advice
- *Image Analysis*: Analyze uploaded outfit photos with detailed styling feedback and ratings
- *Shopping Assistance*: Budget-conscious recommendations, occasion styling, wardrobe gap identification
- *Educational Guidance*: Color theory, trend insights, and styling education
- *Personalized Recommendations*: Use stored analysis (body type, skin tone) for tailored suggestions

*CRITICAL BEHAVIORS:*

1. *Gender Detection*: If user gender is unknown, ask first before any recommendations
2. *Context Awareness*: Always adapt your response style based on Magic Mirror vs general mode
3. *User Analysis Integration*: When available, leverage body type, skin tone, and style preferences for highly personalized advice
4. *Product Recommendations*: Use EXACT format \[product:ITEM_ID]\ for wardrobe items
5. *Wishlist Styling*: For wishlist requests, use \[wishlist_choice:ITEM_ID]\ format
6. *Intelligent Suggestions*: Match item tags with user needs (beach, formal, casual, etc.)

*VOICE & TONE:*
- Warm, encouraging, and confidence-building
- Expert knowledge delivered in an accessible way
- Fashion-forward but practical advice
- Supportive best friend energy
- **KEEP RESPONSES SHORT AND SWEET** - Be concise and to the point

*TECHNICAL REQUIREMENTS:*
- Clean, conversational text without markdown
- Include TTS at end: \tts:"Your audio message"\ 
- Use product IDs only from provided wardrobe
- Graceful exit on gratitude expressions with [action:close_chat]
- **Keep responses brief and impactful** - 2-3 sentences max unless detailed analysis is explicitly requested

*RESPONSE ADAPTATION:*
- **Magic Mirror**: Focus on current outfit, immediate improvements, specific styling tips
- **General Mode**: Broader fashion consultation, wardrobe planning, style education
- **With Analysis**: Highly personalized based on body type and skin tone
- **Without Analysis**: Encourage style profiling while providing general advice

Your goal is to be the most intelligent, contextual, and helpful AI stylist - seamlessly adapting between active styling sessions and general fashion consultation.`;

    let contextPrompt = "Here is the context for our conversation. Use it to inform your response.\n\n";
    
    if (analysis) {
        contextPrompt += `User's Complete Style Profile:\n`;
        contextPrompt += `- Body Type: ${analysis.bodyType} (use this to recommend flattering silhouettes)\n`;
        contextPrompt += `- Skin Tone: ${analysis.skinTone} (consider this for color recommendations)\n`;
        contextPrompt += `- Gender: ${analysis.gender}\n`;
        contextPrompt += `- Proportions: Chest: ${analysis.proportions.chest}, Waist: ${analysis.proportions.waist}, Hips: ${analysis.proportions.hips}\n`;
        contextPrompt += `- Recommended Colors: ${analysis.recommendedColors.map(c => `${c.name} (${c.hex})`).join(', ')}\n`;
        contextPrompt += `- Recommended Styles: ${analysis.recommendedStyles.join(', ')}\n`;
        contextPrompt += `Use this analysis to provide highly personalized styling advice!\n\n`;
    } else if (gender) {
        contextPrompt += `User is browsing the ${gender} collection.\n\n`;
    } else {
        contextPrompt += `User gender is unknown - ask for this first before making recommendations.\n\n`;
    }

    if (wishlist.length > 0) {
        const wishlistSummary = wishlist.map(({ id, name }) => ({ id, name }));
        contextPrompt += `User's Wishlist: ${JSON.stringify(wishlistSummary)}\n`;
    }

    if (magicMirrorContext) {
        const currentItems = magicMirrorContext.outfit ? [magicMirrorContext.outfit.garment].filter(Boolean) : [];
        contextPrompt += `Magic Mirror Context: User is currently trying on: ${JSON.stringify(currentItems.map(i => i!.name))}\n`;
    }
    
    if (wardrobe.length > 0) {
        const wardrobeSummary = wardrobe.map(({ id, name, category, color, price, tags }) => ({ id, name, category, color, price, tags }));
        contextPrompt += `Available Wardrobe for Recommendations: ${JSON.stringify(wardrobeSummary)}\n`;
    }
    contextPrompt += `\nUser's message is: "${message}"`;
    
    const contents: Content = { parts: [{ text: contextPrompt }] };

    if (image) {
        const imagePart = await fileToPart(image);
        contents.parts.unshift(imagePart);
    } else if (magicMirrorContext?.latestTryOnImage) {
        const imagePart = dataUrlToPart(magicMirrorContext.latestTryOnImage);
        contents.parts.unshift(imagePart);
    }
    
    const response = await ai.models.generateContent({
        model: analysisModel,
        contents: [contents],
        config: {
            systemInstruction,
        },
    });

    return response.text;
};


export const analyzeUserProfile = async (userImage: File): Promise<AnalysisResult> => {
    // if (!ai) {
    //     console.warn('AI service not available - API key not configured');
    //     // Return a default analysis result
    //     return {
    //         bodyType: "Rectangle",
    //         skinTone: "Neutral",
    //         gender: "women" as const,
    //         proportions: {
    //             chest: "medium",
    //             waist: "medium",
    //             hips: "medium"
    //         },
    //         recommendedColors: [
    //             { name: "Emerald Green", hex: "#50C878" },
    //             { name: "Soft Pink", hex: "#FFC0CB" },
    //             { name: "Classic Navy", hex: "#000080" }
    //         ],
    //         recommendedStyles: [
    //             "A-line dresses",
    //             "High-waisted pants",
    //             "V-neck tops"
    //         ]
    //     };
    // }
    
    const systemInstruction = `You are a sophisticated fashion AI analyst. Your task is to analyze an image of a person and return a single, valid JSON object containing their fashion profile.

*CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:*
1.  *JSON ONLY:* Your entire response MUST be ONLY the JSON object, with no additional text, commentary, markdown formatting (like \\\json\), or explanations.
2.  *STRICT SCHEMA:* Adhere strictly to the provided JSON schema and the exact enumerated values for each field.
3.  *BODY SHAPE DEFINITIONS:* Use these definitions to guide your 'bodyType' selection:
    *   *Rectangle:* Shoulders, bust, and hips are roughly the same width, with little to no waist definition.
    *   *Triangle (or Pear):* Hips are wider than the bust and shoulders. Well-defined waist.
    *   *Inverted Triangle:* Shoulders and/or bust are wider than the hips.
    *   *Hourglass:* Bust and hips are roughly the same width, with a clearly defined, narrower waist.
    *   *Round (or Apple):* Waist is wider than the bust and hips. Shoulders may be narrower.
4.  *VALID COLORS:* For \recommendedColors\, ensure the friendly \name\ and the 6-digit \hex\ code correctly correspond to each other (e.g., "Emerald Green" and "#50C878").

*JSON Schema and Value Options:*
*   \gender\: (string) MUST be one of: "men", "women".
*   \bodyType\: (string) MUST be one of: "Rectangle", "Triangle (or Pear)", "Inverted Triangle", "Hourglass", "Round (or Apple)".
*   \skinTone\: (string) MUST be one of: "Warm", "Cool", "Neutral".
*   \proportions\: (object) Contains short, descriptive phrases for \chest\, \waist\, and \hips\.
*   \recommendedColors\: (array) An array of 3-4 color objects. Each object must contain a \name\ and its corresponding valid 6-digit \hex\ code.
*   \recommendedStyles\: (array) An array of 2-3 short strings describing flattering clothing styles, cuts, or silhouettes.`;

    const prompt = "Analyze the person in this image and provide their gender, body type, skin tone, proportions, and recommendations in the required JSON format.";

    const userImagePart = await fileToPart(userImage);
    const contents: Content = { parts: [userImagePart, { text: prompt }] };

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            gender: { type: Type.STRING, description: "The identified gender of the person ('men' or 'women')." },
            bodyType: { type: Type.STRING, description: "The identified body type (e.g., 'Rectangle')." },
            skinTone: { type: Type.STRING, description: "The identified skin undertone (e.g., 'Warm')." },
            proportions: {
                type: Type.OBJECT,
                description: "A descriptive analysis of the user's proportions.",
                properties: {
                    chest: { type: Type.STRING, description: "Descriptive analysis of chest proportion (e.g., 'Just right')." },
                    waist: { type: Type.STRING, description: "Descriptive analysis of waist proportion (e.g., 'Slightly loose')." },
                    hips: { type: Type.STRING, description: "Descriptive analysis of hips proportion (e.g., 'Not tight')." },
                },
                required: ["chest", "waist", "hips"]
            },
            recommendedColors: {
                type: Type.ARRAY,
                description: "An array of 3-4 color objects that would complement the user's skin tone. Each object must contain a 'name' and a 'hex' code.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "A simple, friendly name for the color (e.g., 'Emerald Green')." },
                        hex: { type: Type.STRING, description: "The 6-digit hex code for the color (e.g., '#50C878')." }
                    },
                    required: ["name", "hex"]
                }
            },
            recommendedStyles: {
                type: Type.ARRAY,
                description: "An array of 2-3 clothing styles or cuts that would flatter the user's body type.",
                items: { type: Type.STRING }
            }
        },
        required: ["gender", "bodyType", "skinTone", "proportions", "recommendedColors", "recommendedStyles"]
    };

    const response = await ai.models.generateContent({
        model: analysisModel,
        contents: [contents],
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
        },
    });

    try {
        const result = JSON.parse(response.text.trim());
        // Basic validation
        if (result.gender && result.bodyType && result.skinTone && result.proportions && Array.isArray(result.recommendedColors) && Array.isArray(result.recommendedStyles)) {
            return result as AnalysisResult;
        } else {
            throw new Error("Invalid JSON structure received from analysis AI.");
        }
    } catch (e) {
        console.error("Failed to parse AI JSON response for analysis:", response.text, e);
        throw new Error("The AI returned an unexpected response during analysis. Please try again.");
    }
};


export const getStylistRecommendations = async (prompt: string, wardrobe: WardrobeItem[], genderContext: 'men' | 'women', userImage?: File, analysis?: AnalysisResult | null): Promise<StylistResult> => {
    if (!ai) {
        console.warn('AI service not available - API key not configured');
        return {
            stylistResponse: "AI styling service is currently unavailable. Please configure your Gemini API key to enable personalized recommendations.",
            recommendedProductIds: []
        };
    }
    
    const wardrobeForPrompt = wardrobe.map(item => ({ id: item.id, name: item.name, category: item.category }));
    
    const finalGender = analysis?.gender || genderContext;

    let stylistSystemInstruction = `You are "Stylo", an AI personal stylist. Your task is to provide fashion recommendations based on user input and return a single, valid JSON object.

*CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:*
1.  *JSON ONLY:* Your entire response MUST be ONLY the JSON object, with no additional text, commentary, or markdown formatting.
2.  *GENDER CONTEXT:* You MUST only recommend items suitable for the specified '${finalGender}' collection. All product IDs in your response must come from the provided wardrobe list, which is pre-filtered for this gender. Do not, under any circumstances, suggest items for a different gender.
3.  *USE PROVIDED WARDROBE:* Select product IDs only from the list of available wardrobe items provided in the prompt. Do not invent IDs.
4.  *VARIED RECOMMENDATION STRATEGY:* When selecting products, provide a diverse mix. Do not only pick items that match both body type and color analysis. Your selection should include:
    *   A few items that are a perfect match for *both* the user's recommended styles and color palette.
    *   Some items that are excellent for the user's *body type*, even if the color is different from the recommendations.
    *   Some items that are a great match for the user's *color palette*, even if the style isn't specifically mentioned.
    *   A few essential, versatile basics in *neutral colors* (like black, white, grey, denim) that form the foundation of a good wardrobe.
5.  *CONCISE RESPONSE:* The \stylistResponse\ text must be short, helpful, and conversational (2-4 sentences).

You will be given:
1. A user's text prompt.
2. A list of available wardrobe items for the '${finalGender}' collection.
3. (Optional) A user image.
4. (Optional) An AI analysis of the user's profile.

Your task is to synthesize all inputs (prioritizing the AI analysis if available) to select the best items from the wardrobe list and formulate your response, returned in the required JSON format.`;

    let fullPrompt = `User prompt: "${prompt}"\n`;
    if (analysis) {
        fullPrompt += `User Analysis (use this as the primary guide):\n- Gender: ${analysis.gender}\n- Body Type: ${analysis.bodyType}\n- Skin Tone: ${analysis.skinTone}\n\n`;
    } else {
         fullPrompt += `Current Collection: ${finalGender}\n\n`;
    }
    fullPrompt += `Available wardrobe: ${JSON.stringify(wardrobeForPrompt)}\n\nPlease provide your stylist analysis and recommendations in the required JSON format.`;

    const contents: Content[] = [];
    if (userImage) {
        const userImagePart = await fileToPart(userImage);
        contents.push({ parts: [userImagePart, { text: fullPrompt }] });
    } else {
        contents.push({ parts: [{ text: fullPrompt }] });
    }
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            stylistResponse: { type: Type.STRING, description: "Your conversational response to the user, explaining your recommendations." },
            recommendedProductIds: {
                type: Type.ARRAY,
                description: "An array of product IDs from the provided list that you recommend.",
                items: { type: Type.STRING }
            }
        },
        required: ["stylistResponse", "recommendedProductIds"]
    };

    const response = await ai.models.generateContent({
        model: analysisModel,
        contents: contents,
        config: {
            systemInstruction: stylistSystemInstruction,
            responseMimeType: "application/json",
            responseSchema,
        },
    });

    try {
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        if (result.stylistResponse && Array.isArray(result.recommendedProductIds)) {
            return result as StylistResult;
        } else {
            throw new Error("Invalid JSON structure received from AI.");
        }
    } catch (e) {
        console.error("Failed to parse AI JSON response:", response.text, e);
        throw new Error("The AI returned an unexpected response. Please try again.");
    }
};

export const generateGroupPhoto = async (vibe: string, memberImages: string[]): Promise<string> => {
    if (!ai) throw new Error("AI service not available - API key not configured");
    const textPart = { text: `You are an expert AI fashion photographer. Create a single, photorealistic group photoshoot image based on a "vibe" and individual images of the models.

*Vibe:* "${vibe}"

*Instructions:*
1.  Create a cohesive scene and background that perfectly matches the vibe.
2.  Place all the people from the provided images into this new scene.
3.  Ensure each person wears the exact same outfit they have on in their individual image.
4.  Preserve each person's identity, features, and body type.
5.  Arrange them in natural, interacting group poses that fit the scene.
6.  The final image must be a single, complete, and sharp photorealistic image. The entire scene and all subjects must be fully rendered, well-composed, and free of any blur, artifacts, or missing parts.
7.  Return ONLY the final image.` };

    const imageParts = memberImages.map(dataUrl => dataUrlToPart(dataUrl));

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [textPart, ...imageParts] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response);
};

export const generateModelImage = async (userImage: File): Promise<string> => {
    if (!ai) throw new Error("AI service not available - API key not configured");
    const userImagePart = await fileToPart(userImage);
    const prompt = `You are an expert AI photo editor. Your ONLY task is to extract the main subject from the provided photo and place them on a clean, light-gray studio backdrop.

*CRITICAL INSTRUCTIONS:*
1. *SUBJECT MUST REMAIN 100% UNTOUCHED:* Do not alter, enhance, smooth, or redraw the person in any way. Their exact face, expression, skin tone, hair, and clothing must remain pixel-for-pixel identical to the original image.
2. *BACKGROUND REPLACEMENT:* Segment the person perfectly and replace the entirely of the original background with a flat, neutral light-gray studio backdrop.
3. *LIGHTING:* Add very subtle, natural contact shadows on the floor/backdrop to ground the person.
4. *OUTPUT:* Return ONLY the final composite image. No text or artifacts.`;
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentImage: File, garmentInfo: WardrobeItem): Promise<string> => {
    if (!ai) throw new Error("AI service not available - API key not configured");
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    
    const isAccessory = garmentInfo.category === 'accessories' && garmentInfo.accessoryMeta?.vtoSupported;
    const anchor = garmentInfo.accessoryMeta?.anchor;

    let prompt = `You are a virtual try-on AI. Your goal is to return ONE photorealistic image of the person from the 'modelImage' wearing the garment from the 'garmentImage' correctly.

*INPUTS:*
1.  *modelImage:* A person's studio photo. They may already be wearing clothes. This image shows the person, pose, and background to preserve.
2.  *garmentImage:* The exact item to wear. This is the SOURCE OF TRUTH for the garment's appearance.

*HARD RULES (IMAGE-FIRST FIDELITY):*
- *Subject Preservation:* The person's identity, explicit facial features, hair, skin tone, and body shape from the 'modelImage' must remain 100% physically identical. Do strictly composite the clothes ONTO the model. DO NOT redraw the face or morph the model in any capacity.
- *Garment Fidelity:* The garment's look (color, print, material, design, length) MUST match the 'garmentImage' perfectly.
- *Fit & Realism:* The clothing must fit naturally around the person's existing pose, simulating realistic drapes and folds.
- *Clean Environment:* The original background must remain completely untouched. Output only a single sharp, complete image.
`;

    if (isAccessory) {
        prompt += `
*ACCESSORY-SPECIFIC LOGIC:*
- This is an accessory. You MUST add/overlay it on the model. DO NOT replace the person's main clothing (tops, bottoms, dresses).
- *Placement (CRITICAL):* Place the accessory exactly ON the person. IT MUST NOT BE FLOATING OR HANGING IN THE AIR. It must realistically connect to the body at the anchor point: ${anchor}.
- *Interaction:*
`;
        if (garmentInfo.subcategory === 'belts') {
            prompt += `  - *BELT CINCHING:* This is a belt. It must realistically cinch the clothing underneath (like a dress or shirt). You MUST alter the underlying garment to show this interaction. Create natural fabric gathering, folds, and wrinkles around the belt to show the tightening effect. The silhouette of the clothing should be visibly cinched at the waist.
`;
        } else {
            prompt += `  - Ensure flawless, grounded physical contact. E.g., sunglasses MUST bridge the nose and hook perfectly behind the ears. A necklace must rest flat against the skin/chest, obeying gravity.
`;
        }
        prompt += `- **Replacement:** If another accessory is already worn at the SAME anchor point, REPLACE the old accessory with this new one.`;

    } else {
        prompt += `
*CLOTHING SLOT & LAYERING LOGIC:*

*GOLDEN RULE FOR ONE-PIECE GARMENTS (DRESSES, JUMPSUITS, ETC.):*
- *TOP PRIORITY:* If the 'garmentImage' is a one-piece item (like a dress, jumpsuit, saree, etc.), this rule OVERRIDES ALL OTHERS.
- *ACTION:* You MUST *ERASE AND REMOVE 100%* of any clothing the person is wearing in the 'modelImage'. This includes T-shirts, shirts, pants, skirts, jackets, and any previous outfit layers.
- *FINAL RESULT:* The output image must show the person wearing *ONLY* the new one-piece garment against the original background. There must be absolutely *ZERO* trace of the previous clothing. No collars peeking out, no sleeves, no pant legs.
- *CLARIFICATION:* The 'modelImage' is a reference for the person's body, pose, and the background ONLY. For one-piece garments, you must IGNORE the clothing in the 'modelImage'.

- *top:* For tops, replace any existing top garment. If the person is wearing a one-piece, replace the entire one-piece with this new top. Keep any separate bottom garment.
- *bottom:* For bottoms, replace any existing bottom garment. If the person is wearing a one-piece, replace the entire one-piece with this new bottom. Keep any separate top garment.
- *outerwear:* Layer NATURALLY OVER the current outfit; do not erase or replace the inner layers.
`;
    }

    prompt += `
*Conflict Priority:*
1. Image fidelity (garment looks exactly like 'garmentImage').
2. Slot compliance (layering/accessory rules).
3. Keep background and pose consistent.

Your output MUST be ONLY the single, final image. NO TEXT.`;
    
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [modelImagePart, garmentImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const applyFullOutfitFromImage = async (modelImageUrl: string, outfitMannequinUrl: string): Promise<string> => {
    if (!ai) throw new Error("AI service not available - API key not configured");
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const outfitImagePart = dataUrlToPart(outfitMannequinUrl);
    
    const prompt = `You are an expert virtual try-on AI. Your task is to apply a complete outfit from a mannequin image onto a person's model image.

**INPUTS:**
1.  **modelImage:** A photo of the person. This is the source of truth for their identity, pose, and background.
2.  **outfitImage:** An image of a complete outfit styled on a mannequin. This is the source of truth for what the final clothes should look like.

**CRITICAL RULES:**
1.  **Transfer Outfit:** Realistically transfer the entire outfit from the 'outfitImage' onto the person in the 'modelImage'.
2.  **Preserve Person & Scene:** You MUST preserve the person's identity (face, body shape, skin tone), their pose, and the background from the 'modelImage'. Do NOT use the mannequin's pose or background.
3.  **Realistic Fit:** The outfit must fit the person's body and pose naturally. Simulate realistic fabric drapes, folds, and wrinkles. The outfit should not look flat or pasted on.
4.  **Complete Replacement:** Erase any clothing the person is currently wearing in the 'modelImage' and replace it with the new outfit.
5.  **Quality & Completeness:** The output must be a single, complete, and sharp photorealistic image, free of artifacts, blur, or missing parts.
6.  **Output Contract:** Your response MUST contain ONLY the generated image. Do NOT include any text, commentary, or other content parts.`;
    
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [modelImagePart, outfitImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    if (!ai) throw new Error("AI service not available - API key not configured");
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const prompt = `You are an expert AI fashion photographer. Your task is to regenerate the provided image from a new camera perspective, adhering to strict consistency rules.

*New Perspective:* "${poseInstruction}"

*CRITICAL RULES:*
1.  *STRICT CONSISTENCY:* The person's identity, their entire outfit, hairstyle, and the background scene MUST remain absolutely identical to the original image.
2.  *CAMERA ANGLE ONLY:* The ONLY change is the camera angle as specified in the new perspective. The resulting pose must be natural and physically plausible. Do not re-pose limbs in an unnatural way.
3.  *CONSISTENT LIGHTING & FRAMING:* You MUST maintain the same lighting, aspect ratio (~2:3), and framing (no cropping head or feet) as the original image.
4.  *Quality & Completeness:* The output must be a single, complete, and sharp photorealistic image. The entire person and background must be fully rendered. The image must be free of any blur, artifacts, missing parts, or text.
5.  *OUTPUT CONTRACT:* Return ONLY the single, final, photorealistic image.`;
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [tryOnImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const generateBackgroundChange = async (baseImageUrl: string, backgroundPrompt: string): Promise<string> => {
    if (!ai) throw new Error("AI service not available - API key not configured");
    const baseImagePart = dataUrlToPart(baseImageUrl);
    const prompt = `You are an expert AI photo editor. Your task is to seamlessly replace the background of the provided image with a new one described in the prompt, following strict rules.

*New Background Prompt:* "${backgroundPrompt}"

*CRITICAL RULES:*
1.  *PRESERVE SUBJECT:* The person's pose, and their entire outfit (clothing, accessories) MUST remain completely unchanged.
2.  *REPLACE BACKGROUND ONLY:* Create a new, photorealistic background that perfectly matches the prompt.
3.  *INTEGRATION:* Subtly adjust the global lighting on the person to match the new scene's lighting. Ensure edges around the person, especially around hair and garment hems, are perfectly clean and seamlessly blended.
4.  *Quality & Completeness:* The resulting image must be a single, complete, and sharp photorealistic image. The subject and the new background must be fully rendered, with no blur, artifacts, or missing parts.
5.  *OUTPUT CONTRACT:* Return ONLY the single, final, edited image. Do not include any text or other parts.`;

    const response = await ai.models.generateContent({
        model, // 'gemini-2.5-flash-image'
        contents: { parts: [baseImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
}

// --- New Feature: Event Stylist ---

type OutfitComposition = Omit<GeneratedOutfit, 'id' | 'items' | 'previewUrl' | 'generatingPreview'> & { itemIds: string[] };

export const generateOutfitsForEvent = async (
    eventTheme: string,
    budget: number,
    analysis: AnalysisResult,
    wardrobe: WardrobeItem[],
    userPreferences: string
): Promise<OutfitComposition[]> => {
    const wardrobeForPrompt = wardrobe
        .filter(item => item.gender === analysis.gender)
        .map(({ id, name, category, subcategory, price, color, tags }) => ({ id, name, category, subcategory, price, color, tags }));

    const systemInstruction = `You are an expert fashion stylist for Ajio. Your task is to create 3-4 complete outfits from a given list of products for a specific event and budget, tailored to a user's personal style profile. Your entire response MUST be a single, valid JSON object that adheres to the provided schema. Crucially, if the user provides specific requests, you MUST follow them strictly (e.g., if they say "no hats", do not include any hats in the generated outfits).`;

    const prompt = `
        Event Theme: "${eventTheme}"
        Budget: "Under ₹${budget.toLocaleString('en-IN')}"
        User's Style Profile: ${JSON.stringify(analysis)}
        User's Specific Requests: "${userPreferences}"
        Available Products (with IDs, name, category, price, tags): ${JSON.stringify(wardrobeForPrompt)}
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            outfits: {
                type: Type.ARRAY,
                description: "An array of 3-4 complete outfit objects.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        outfitName: { type: Type.STRING, description: "A creative name for the outfit (e.g., 'Sunset Beach Walk')." },
                        itemIds: {
                            type: Type.ARRAY,
                            description: "An array of product IDs for the items in this outfit. MUST include a top, a bottom (or a dress), and shoes. Add accessories where appropriate.",
                            items: { type: Type.STRING }
                        },
                        totalCost: { type: Type.NUMBER, description: "The calculated total cost of all items in the outfit. Must be under the budget." },
                        stylistNotes: { type: Type.STRING, description: "A short, encouraging note about why this outfit works for the user and event." },
                        isHighlyRecommended: { type: Type.BOOLEAN, description: "Set to true if this is an exceptionally good match for the user." },
                    },
                    required: ["outfitName", "itemIds", "totalCost", "stylistNotes", "isHighlyRecommended"]
                }
            }
        },
        required: ["outfits"]
    };

    const response = await ai.models.generateContent({
        model: analysisModel,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
        }
    });

    try {
        const jsonResponse = JSON.parse(response.text.trim());
        if (jsonResponse.outfits && Array.isArray(jsonResponse.outfits)) {
            return jsonResponse.outfits as OutfitComposition[];
        }
        throw new Error("Invalid JSON structure: 'outfits' array not found.");
    } catch (e) {
        console.error("Failed to parse Event Stylist JSON response:", response.text, e);
        throw new Error("The AI returned an unexpected response while creating outfits. Please try again.");
    }
};

export const generateOutfitImage = async (outfitItems: WardrobeItem[]): Promise<string> => {
    if (!ai) throw new Error("AI service not available - API key not configured");
    const itemsList = outfitItems.map(item => `${item.name} (${item.category})`).join(', ');
    
    const prompt = `CRITICAL INSTRUCTIONS - You MUST follow these rules EXACTLY:

1. Generate a MANNEQUIN ONLY - NEVER a real person, model, or human
2. The mannequin must be FEATURELESS, GENDER-NEUTRAL, and HEADLESS (torso form only)
3. Display ALL ${outfitItems.length} clothing items on the mannequin: ${itemsList}
4. EVERY item must be VISIBLE and properly layered (e.g., jacket over shirt, accessories included)
5. Use a plain LIGHT GRAY studio background
6. Create a photorealistic, professional product display image
7. NO text, NO labels, NO watermarks on the image

The complete outfit includes: ${itemsList}

Display this as a complete, styled outfit on a professional fashion mannequin/dress form. Ensure EVERY SINGLE ITEM is clearly visible in the final image.`;

    const itemParts = await Promise.all(
        outfitItems.map(async (item) => {
            const file = await urlToFile(item.url, item.id);
            return fileToPart(file);
        })
    );

    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [textPart, ...itemParts] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return handleApiResponse(response);
};