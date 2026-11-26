type Session = Awaited<ReturnType<typeof getUserSession>> & { lastAttemptAt?: number }

export default eventHandler(async (event) => {
  const body = await readBody(event) || {}
  const session: Session = await getUserSession(event)
  const adminPassword = process.env.NUXT_ADMIN_PASSWORD

  if (!adminPassword) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_ADMIN_PASSWORD is not set. Please set it first',
    })
  }

  if (session.lastAttemptAt && Date.now() - session.lastAttemptAt < 5000)
    throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' })

  if (body.password === adminPassword) {
    await setUserSession(event, {
      user: { role: 'admin' },
    })

    return { loggedIn: true }
  }

  await setUserSession(event, {
    lastAttemptAt: Date.now(),
  })

  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
})
