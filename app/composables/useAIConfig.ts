// Provider type
export type ProviderType = 'openai' | 'gemini'

// Provider config interface
export interface AIProviderConfig {
  id: string // Unique provider id
  name: string // Display name
  type: ProviderType // Provider type
  apiKey: string // API key
  baseURL?: string // Custom base URL
  model?: string // Custom model name
  enabled: boolean // Whether it is enabled
  createdAt: number // Creation timestamp
  apiFormat?: 'completions' | 'responses' // API format for OpenAI-compatible providers
}

// Legacy AI config interface (kept for backward compatibility)
interface LegacyAIConfig {
  provider: 'gemini' | 'openai'
  baseUrl: string
  secretKey: string
  enabled: boolean
}

// Current AI config interface
export interface AIConfig {
  enabled: boolean // Master switch for the AI features
  selectedProviderId: string // Id of the currently selected provider
  providers: Record<string, AIProviderConfig> // All provider configs
}

// Default provider config
const defaultProviders: Record<string, AIProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    enabled: false,
    createdAt: Date.now(),
    apiFormat: 'completions',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    type: 'gemini',
    apiKey: '',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',
    enabled: false,
    createdAt: Date.now(),
  },
}

// Migrate the legacy config to the current format
function migrateLegacyConfig(legacy: LegacyAIConfig): AIConfig {
  const providers: Record<string, AIProviderConfig> = { ...defaultProviders }

  // Update providers in the legacy config
  if (legacy.provider === 'openai') {
    providers.openai!.apiKey = legacy.secretKey
    providers.openai!.enabled = legacy.enabled
    if (legacy.baseUrl) {
      providers.openai!.baseURL = legacy.baseUrl
    }
  }
  else if (legacy.provider === 'gemini') {
    providers.gemini!.apiKey = legacy.secretKey
    providers.gemini!.enabled = legacy.enabled
    if (legacy.baseUrl) {
      providers.gemini!.baseURL = legacy.baseUrl
    }
  }

  return {
    enabled: legacy.enabled,
    selectedProviderId: legacy.provider,
    providers,
  }
}

// Default config for the current format
const defaultConfig: AIConfig = {
  enabled: false,
  selectedProviderId: 'gemini',
  providers: defaultProviders,
}

export function useAIConfig() {
  const config = useLocalStorage<AIConfig>('ai-config', defaultConfig, {
    serializer: {
      read: (value: string) => {
        try {
          const parsed = JSON.parse(value)

          // Detect the legacy config format
          if ('provider' in parsed && 'secretKey' in parsed && 'baseUrl' in parsed && 'enabled' in parsed) {
            return migrateLegacyConfig(parsed as LegacyAIConfig)
          }

          // Return the current config format
          return parsed
        }
        catch {
          return defaultConfig
        }
      },
      write: (value: AIConfig) => JSON.stringify(value),
    },
  })

  // Get the config of the selected provider
  const selectedProvider = computed(() => {
    return config.value.providers[config.value.selectedProviderId]
  })

  // Get all enabled providers
  const enabledProviders = computed(() => {
    return Object.values(config.value.providers).filter(p => p.enabled)
  })

  // Add a custom provider
  function addProvider(provider: Omit<AIProviderConfig, 'id' | 'createdAt'>) {
    const id = `custom-${Date.now()}`
    config.value.providers[id] = {
      ...provider,
      id,
      createdAt: Date.now(),
    }
    return id
  }

  // Update a provider config
  function updateProvider(id: string, updates: Partial<AIProviderConfig>) {
    if (config.value.providers[id]) {
      config.value.providers[id] = {
        ...config.value.providers[id],
        ...updates,
      }
    }
  }

  // Remove a provider
  function removeProvider(id: string) {
    // The default provider cannot be removed
    if (id !== 'openai' && id !== 'gemini') {
      delete config.value.providers[id]
      // When the selected provider is removed, switch to the first available one
      if (config.value.selectedProviderId === id) {
        const firstAvailable = Object.keys(config.value.providers)[0]
        if (firstAvailable) {
          config.value.selectedProviderId = firstAvailable
        }
      }
    }
  }

  // Switch the selected provider
  function setSelectedProvider(id: string) {
    if (config.value.providers[id]) {
      config.value.selectedProviderId = id
    }
  }

  // Get the default model of a provider
  function getDefaultModelForType(type: ProviderType): string {
    switch (type) {
      case 'openai':
        return 'gpt-4o'
      case 'gemini':
        return 'gemini-3-flash-preview'
      default:
        return ''
    }
  }

  return {
    config,
    selectedProvider,
    enabledProviders,
    addProvider,
    updateProvider,
    removeProvider,
    setSelectedProvider,
    getDefaultModelForType,
  }
}
