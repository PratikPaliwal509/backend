import 'dotenv/config'
import { buildApp } from './app.js'
import { cfg } from './config.js'

async function start() {
  const app = await buildApp()
  try {
    await app.listen({ port: cfg.port, host: '0.0.0.0' })
    console.log(`\n🚀 Meeting Scheduler API running on http://localhost:${cfg.port}`)
    console.log(`📊 Health: http://localhost:${cfg.port}/health\n`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
