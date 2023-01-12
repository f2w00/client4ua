import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { Log } from '../common/log'
import { ClientService } from '../services/client.service'
import { query } from 'express'

const client = require('../common/client')

@Controller('client')
export class ClientController {
    constructor(private readonly clientService: ClientService) {
    }

    @Post('options')
    postOptions(@Body() clientOptions) {
        return this.clientService.createClient(clientOptions)
    }

    @Get('connect')
    async connect(@Query() param) {
        await this.clientService.connect(param['endpointUrl'])
    }

    @Get('endpoints')
    getEndpoints() {
        return this.clientService.getEndPoints()
    }
}