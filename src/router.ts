import { createRouter, createWebHashHistory, type RouterHistory, type Router } from 'vue-router'
import { availableModes, loadManifest } from '@/data/loader'
import { MODES, type Mode } from '@/domain/types'
import { useAppStore } from '@/stores/app'
import MenuView from '@/views/MenuView.vue'

const OPEN_ROUTES = new Set(['settings', 'about'])

export function createAppRouter(history: RouterHistory = createWebHashHistory()): Router {
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'menu', component: MenuView },
      {
        path: '/play/:mode',
        name: 'play',
        component: () => import('@/views/PlayView.vue'),
        beforeEnter: async (to) => {
          const app = useAppStore()
          const mode = String(to.params.mode)
          if (!(MODES as readonly string[]).includes(mode) || !app.activePair)
            return { name: 'menu' }
          try {
            const manifest = await loadManifest()
            return (
              availableModes(manifest, app.activePair).includes(mode as Mode) || { name: 'menu' }
            )
          } catch {
            // Without a manifest let the play view surface the load error itself.
            return true
          }
        },
      },
      { path: '/results', name: 'results', component: () => import('@/views/ResultsView.vue') },
      { path: '/progress', name: 'progress', component: () => import('@/views/ProgressView.vue') },
      { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
      { path: '/about', name: 'about', component: () => import('@/views/AboutView.vue') },
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ],
  })
  router.beforeEach((to) => {
    const app = useAppStore()
    if (!app.state.settings.activeTarget && !OPEN_ROUTES.has(String(to.name))) {
      return { name: 'settings', query: { onboarding: '1' } }
    }
    return true
  })
  return router
}
