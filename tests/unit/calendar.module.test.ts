import { describe, it, expect, vi, beforeAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import path    from 'node:path'
import fs      from 'node:fs'

vi.mock('@opentelemetry/api', () => {
  const span = { end: vi.fn(), setAttribute: vi.fn(), setStatus: vi.fn(), recordException: vi.fn() }
  const tracer = { startActiveSpan: vi.fn().mockImplementation((_n: string, fn: (s: unknown) => unknown) => fn(span)) }
  return {
    trace:          { getTracer: () => tracer },
    metrics:        { getMeter: () => ({ createCounter: () => ({ add: vi.fn() }), createHistogram: () => ({ record: vi.fn() }) }) },
    SpanStatusCode: { ERROR: 'ERROR', OK: 'OK' },
  }
})

async function makeApp() {
  const ctxRef: { current: any } = { current: {} }
  const { createRouter } = await import('../../src/routes/index.js')
  const app = express()
  app.use('/api/calendar', createRouter(ctxRef))
  return app
}

describe('GET /api/calendar/ui.js', () => {
  it('returns 200 with javascript content-type', async () => {
    const app = await makeApp()
    const res = await request(app).get('/api/calendar/ui.js')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/javascript/)
  })
})

describe('Module manifest', () => {
  let mod: any

  beforeAll(async () => {
    mod = (await import('../../index.js')).default
  })

  it('has slug "calendar"', () => {
    expect(mod.slug).toBe('calendar')
  })

  it('has correct nav label and order', () => {
    expect(mod.nav.label).toBe('Calendar')
    expect(mod.nav.order).toBe(15)
  })

  it('has nav icon', () => {
    expect(mod.nav.icon).toBeTruthy()
  })

  it('has frontend entry pointing to /api/calendar/ui.js', () => {
    expect(mod.frontend.entry).toBe('/api/calendar/ui.js')
  })
})

describe('ui.js content', () => {
  let html: string

  beforeAll(() => {
    html = fs.readFileSync(path.resolve(__dirname, '../../public/ui.js'), 'utf-8')
  })

  it('registers with window.Mosaic', () => {
    expect(html).toContain('window.Mosaic.registerModule')
  })

  it('calls /month API endpoint', () => {
    expect(html).toContain('/month')
  })

  it('references shell navigate', () => {
    expect(html).toContain('navigateTo')
  })

  it('has onActivate and onDeactivate', () => {
    expect(html).toContain('onActivate')
    expect(html).toContain('onDeactivate')
  })
})
