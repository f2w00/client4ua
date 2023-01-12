import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Log } from './common/log'

async function createServer() {
    const app = await NestFactory.create(AppModule)
    await app.listen(3000)
}

createServer()
