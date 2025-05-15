// auth.js
;(function checkAuth() {
  const token = localStorage.getItem('access_token')
  if (!token) {
    window.location.href = '../login.html'
  }
})()

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    window.location.href = '../login.html'
    return null
  }

  try {
    const response = await fetch(
      'https://portal.gradients.academy/users/token/refresh/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      }
    )

    const data = await response.json()

    if (!response.ok || !data.access) {
      throw new Error('Не удалось обновить токен')
    }

    // Сохраняем новый access_token
    localStorage.setItem('access_token', data.access)
    return data.access
  } catch (error) {
    console.error('Ошибка обновления токена:', error)
    window.location.href = '../login.html'
    return null
  }
}

async function authorizedFetch(url, options = {}, retry = true) {
  let token = localStorage.getItem('access_token')

  if (!token) {
    window.location.href = '../login.html'
    return
  }

  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  let response = await fetch(url, options)

  // Если токен истёк, пробуем обновить и повторить запрос
  if (response.status === 401 && retry) {
    const newToken = await refreshAccessToken()
    if (!newToken) return

    // Повторяем запрос с новым токеном
    options.headers.Authorization = `Bearer ${newToken}`
    response = await fetch(url, options)
  }

  return response
}
