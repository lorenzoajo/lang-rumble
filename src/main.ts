import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createAppRouter } from './router'
import { log } from './lib/log'
import './styles/index.css'

const app = createApp(App)
app.config.errorHandler = (err, _instance, info) => log.error('unhandled vue error', err, { info })
app.use(createPinia())
app.use(createAppRouter())
app.mount('#app')
