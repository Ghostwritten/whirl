import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initI18n } from '@/i18n'
import { usePrefsStore } from '@/stores/prefsStore'
import '@/themes/themes.css'

async function bootstrap() {
  const lang = usePrefsStore.getState().language
  await initI18n(lang)

  const root = document.getElementById('root')
  if (!root) throw new Error('Root element not found')

  const { default: App } = await import('./App')
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap().catch(console.error)
