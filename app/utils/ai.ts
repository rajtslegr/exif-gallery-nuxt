import { generateText } from 'ai'
import { z } from 'zod'
import { useAIConfig } from '../composables/useAIConfig'
import { createAIClient } from './aiProviders'

// Helper function to remove base64 prefix
function removeBase64Prefix(base64: string) {
  return base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '')
}

function base64ToUint8Array(base64: string): Uint8Array {
  const base64String = removeBase64Prefix(base64)
  const binary = atob(base64String)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// Helper function to clean up AI response text
function cleanUpAiTextResponse(text: string) {
  return text.trim().replace(/[\n\r]+/g, ' ')
}

/**
 * Create the AI client
 * Uses the config of the selected provider
 */
function initializeAIClient() {
  const { config, selectedProvider } = useAIConfig()

  if (!config.value.enabled) {
    console.error('[DEV] AI is disabled. Please enable it in the settings.')
    return null
  }

  if (!selectedProvider.value) {
    console.error('[DEV] No provider selected. Please select a provider in the settings.')
    return null
  }

  if (!selectedProvider.value.apiKey) {
    throw new Error('AI secret key is missing. Please provide it in the settings.')
  }

  return createAIClient(selectedProvider.value)
}

/**
 * Analyze an image with the AI provider
 * @param imageFile the image file
 * @param compress whether to compress the image first
 * @returns the image analysis result
 */
export async function getAiImageAnalysis(imageFile: File, compress = true) {
  const model = initializeAIClient()
  const { t } = useNuxtApp().$i18n
  const imageAnalysisSchema = z.object({
    title: z.string().max(20).describe(t('ai.title_desc')),
    caption: z.string().max(60).describe(t('ai.caption_desc')),
    tags: z.array(z.string()).max(4).describe(t('ai.tags_desc')),
    semanticDescription: z.string().describe(t('ai.semantic_desc')),
  })

  type ImageAnalysis = z.infer<typeof imageAnalysisSchema>

  const AI_IMAGE_PROMPT = `${t('ai.question')}\n`
    + `- ${t('ai.title')}\n`
    + `- ${t('ai.caption')}\n`
    + `- ${t('ai.tags')}\n`
    + `- ${t('ai.semantic')}`

  if (!model) {
    return {
      title: '',
      caption: '',
      tags: [],
      semanticDescription: '',
    }
  }

  try {
    const base64 = await getCompressedImageBase64(imageFile, compress)
    const { text } = await generateText({
      model,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${AI_IMAGE_PROMPT}\n\nReturn the result strictly in the following JSON format：{"title": "", "caption": "", "tags": [], "semanticDescription": ""}`,
          },
          {
            type: 'file',
            mediaType: 'image',
            data: base64ToUint8Array(base64),
          },
        ],
      }],
    })

    // Try to extract JSON from the text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : text

    const parsed = JSON.parse(jsonStr)

    // Validate the parsed result with the zod schema
    const validated = imageAnalysisSchema.parse(parsed)

    const result: ImageAnalysis = {
      title: cleanUpAiTextResponse(validated.title || ''),
      caption: cleanUpAiTextResponse(validated.caption || ''),
      tags: (validated.tags || []).map((tag: string) => cleanUpAiTextResponse(tag)),
      semanticDescription: cleanUpAiTextResponse(validated.semanticDescription || ''),
    }

    return result
  }
  catch (error) {
    console.error('Error generating image analysis:', error)
    throw error
  }
}
