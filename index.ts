import { defineModule }     from '@mosaic/sdk'
import type { ModuleContext } from '@mosaic/sdk'
import { createRouter }      from './src/routes/index.js'

const ctxRef: { current: ModuleContext | null } = { current: null }
const router = createRouter(ctxRef)

export default defineModule({
  name:    'Calendar',
  slug:    'calendar',
  version: '1.0.0',
  sdk:     '>=1.0.0',

  migrate() { /* all calendar tables are framework-owned */ },

  router,

  nav: {
    label: 'Calendar',
    icon:  'calendar',
    order: 15,
  },

  frontend: { entry: '/api/calendar/ui.js' },

  async onInit(ctx: ModuleContext) {
    ctxRef.current = ctx
    ctx.logger.info('Calendar module initialised')
  },
})
