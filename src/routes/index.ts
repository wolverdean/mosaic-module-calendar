import { Router }                         from 'express'
import { trace, metrics, SpanStatusCode } from '@opentelemetry/api'
import fs                                 from 'node:fs'
import path                               from 'node:path'

const tracer      = trace.getTracer('calendar')
const meter       = metrics.getMeter('calendar')
const reqCounter  = meter.createCounter('calendar.ui_requests_total', { description: 'Calendar UI requests' })
const reqDuration = meter.createHistogram('calendar.ui_request_duration_ms', { unit: 'ms' })

function track(op: string, fn: () => void): void {
  const t0 = Date.now()
  tracer.startActiveSpan(`calendar.${op}`, span => {
    try {
      fn()
      reqCounter.add(1, { op, status: 'ok' })
      span.setStatus({ code: SpanStatusCode.OK })
    } catch (err) {
      reqCounter.add(1, { op, status: 'error' })
      span.setStatus({ code: SpanStatusCode.ERROR })
      span.recordException(err as Error)
      throw err
    } finally {
      reqDuration.record(Date.now() - t0, { op })
      span.end()
    }
  })
}

export function createRouter(_ctxRef: { current: unknown }): ReturnType<typeof Router> {
  const router = Router()

  router.get('/ui.js', (_req, res) => {
    track('ui.serve', () => {
      const uiPath = path.resolve(__dirname, '../../public/ui.js')
      res.setHeader('Content-Type', 'application/javascript')
      res.setHeader('Cache-Control', 'no-cache')
      if (fs.existsSync(uiPath)) {
        res.sendFile(uiPath)
      } else {
        res.send('// calendar ui not built')
      }
    })
  })

  return router
}
