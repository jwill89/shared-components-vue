import { createApp } from 'vue'
// The cascade layers' order, named before the kit's stylesheet names `kit`, as an app does.
import './layers.css'
// The kit's stylesheet, imported once as an app imports it. The package marks only its CSS as
// having side effects, so this line, not an import of the package, is what brings the tokens.
import '@jwill89/shared-components-vue/style.css'
// The colors, which the kit leaves to the app.
import './palette.css'
import './playground.css'
import App from './App.vue'

createApp(App).mount('#app')
