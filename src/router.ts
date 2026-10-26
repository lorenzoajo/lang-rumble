import { createRouter, createWebHashHistory, type RouterHistory, type Router } from 'vue-router'
import { useAppStore } from '@/stores/app'
import MenuView from '@/views/MenuView.vue'

const OPEN_ROUTES = new Set(['settings', 'about'])

export function createAppRouter(history: RouterHistory = createWebHashHistory()): Router {
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'menu', component: MenuView },
      { path: '/play/:mode', name: 'play', component: () => import('@/views/PlayView.vue') },
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
