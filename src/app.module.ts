import { Module } from '@nestjs/common'
import { ClientController } from './controllers/client.controller'
import { ClientService } from './services/client.service'

@Module({
    imports: [],
    controllers: [ClientController],
    providers: [ClientService],
})
export class AppModule {
}
