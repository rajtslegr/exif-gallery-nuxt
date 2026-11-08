import type { LanguageModel } from 'ai'
import type { AIProviderConfig } from '../composables/useAIConfig'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

// Subset of the Gemini /models response we care about
interface GeminiModelsResponse {
  models?: {
    name?: string
    baseModelId?: string
    displayName?: string
    description?: string
  }[]
}

// Subset of the OpenAI compatible /models response we care about
interface OpenAIModelsResponse {
  data?: {
    id: string
    name?: string
    description?: string
    created?: number
    owned_by?: string
  }[]
}

// Model info interface
export interface AIModel {
  id: string
  name?: string
  description?: string
  created?: number
  owned_by?: string
}

export function createAIClient(provider: AIProviderConfig): LanguageModel | null {
  if (!provider.apiKey) {
    console.error('[AI] API key is missing for provider:', provider.id)
    return null
  }

  try {
    switch (provider.type) {
      case 'openai': {
        const client = createOpenAICompatible({
          name: provider.id === 'openai' ? 'openai' : provider.id,
          baseURL: provider.baseURL || 'https://api.openai.com/v1',
          apiKey: provider.apiKey,
        })
        const modelId = provider.model || 'gpt-4o'

        return client.chatModel(modelId)
      }
      case 'gemini': {
        const client = createGoogleGenerativeAI({
          baseURL: provider.baseURL || undefined,
          apiKey: provider.apiKey,
        })
        // Use the custom model or the default one
        const modelId = provider.model || 'gemini-3.1-flash-lite'
        return client(modelId)
      }
      default:
        console.error('[AI] Unsupported provider type:', provider.type)
        return null
    }
  }
  catch (error) {
    console.error('[AI] Failed to create client for provider:', provider.id, error)
    return null
  }
}

/**
 * Fetch the model list from the provider
 * Providers expose models differently:
 * - OpenAI: /models endpoint
 * - Gemini: the models.list endpoint https://generativelanguage.googleapis.com/v1beta/models
 */
export async function fetchModels(
  provider: AIProviderConfig,
): Promise<AIModel[]> {
  if (!provider.apiKey) {
    console.error('[AI] API key is missing for provider:', provider.id)
    return []
  }

  try {
    // Gemini uses the models.list endpoint
    if (provider.type === 'gemini') {
      const url = new URL('https://generativelanguage.googleapis.com/v1beta/models')
      url.searchParams.append('key', provider.apiKey)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('[AI] Failed to fetch Gemini models:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('[AI] Error response:', errorText)
        return []
      }

      // Gemini response shape: { models: [{ name: "models/gemini-1.5-flash-001", baseModelId: "gemini-1.5-flash", ... }] }
      const data = await response.json() as GeminiModelsResponse

      if (Array.isArray(data.models)) {
        return data.models
          .map(model => ({
            id: model.baseModelId || model.name || '',
            name: model.displayName || model.baseModelId,
            description: model.description,
          }))
          .filter(model => model.id)
      }

      console.error('[AI] Unexpected Gemini response format')
      return []
    }

    // OpenAI-compatible APIs use the /models endpoint
    if (provider.type === 'openai') {
      if (!provider.baseURL) {
        console.error('[AI] Base URL is missing for provider:', provider.id)
        return []
      }

      // Ensure baseURL ends with / so URL joining works
      const normalizedBaseURL = provider.baseURL.endsWith('/') ? provider.baseURL : `${provider.baseURL}/`
      const url = new URL(`${normalizedBaseURL}models`)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('[AI] Failed to fetch OpenAI models:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('[AI] Error response:', errorText)
        return []
      }

      // OpenAI response shape: { object: "list", data: [{ id: "gpt-4o", object: "model", ... }] }
      const data = await response.json() as OpenAIModelsResponse

      if (Array.isArray(data.data)) {
        return data.data.map(model => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description,
          created: model.created,
          owned_by: model.owned_by,
        }))
      }

      console.error('[AI] Unexpected OpenAI response format')
      return []
    }

    console.error('[AI] Unsupported provider type for fetching models:', provider.type)
    return []
  }
  catch (error) {
    console.error('[AI] Error fetching models:', error)
    return []
  }
}

/**
 * Test the provider connection
 */
export async function testProviderConnection(
  provider: AIProviderConfig,
): Promise<{ success: boolean, error?: string }> {
  if (!provider.apiKey) {
    return { success: false, error: 'API key is missing' }
  }

  if (!provider.baseURL) {
    return { success: false, error: 'Base URL is missing' }
  }

  try {
    // Fetch the model list to test the connection
    await fetchModels(provider)
    return { success: true }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

/**
 * Format a model name for display
 */
export function formatModelName(modelId: string | undefined): string {
  if (!modelId)
    return ''
  return modelId
    .split('/')
    .pop() || modelId
}
