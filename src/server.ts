import 'dotenv/config'
import { buildApp } from './app.js'
import { cfg } from './config.js'

async function start() {
  const app = await buildApp()
  try {
    await app.listen({ port: cfg.port, host: '0.0.0.0' })
    console.log(`\n🚀 Meeting Scheduler API running on https:/backend-hwlu.onrender.com/health`)
    console.log(`📊 Health: https:/backend-hwlu.onrender.com/health\n`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
