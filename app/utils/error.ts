interface ErrorWithMessage {
  data?: { message?: string }
  message?: string
}

/**
 * Narrows an unknown thrown value to a readable message.
 * $fetch errors carry the server text in `data.message`, plain errors in `message`.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string')
    return error || fallback

  if (typeof error === 'object' && error !== null) {
    const { data, message } = error as ErrorWithMessage
    return data?.message || message || fallback
  }

  return fallback
}

export function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    const { statusCode, status } = error as { statusCode?: number, status?: number }
    return statusCode || status
  }

  return undefined
}
