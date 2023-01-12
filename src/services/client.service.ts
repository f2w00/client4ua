import { Injectable } from '@nestjs/common'
import { FindServersOnNetworkRequestOptions, OPCUAClientOptions, UserIdentityInfo } from 'node-opcua'
import { Client } from '../common/client'

@Injectable()
export class ClientService {
    createClient(options: OPCUAClientOptions): object {
        Client.constructor(options)
        return { status: 200 }
    }

    async connect(endpointUrl: string) {
        await Client.connectToServer(endpointUrl)
    }

    async disconnect(deleteSubscription?: boolean) {
        await Client.disconnectFromServer(deleteSubscription)
    }

    async createSession(userInfo?: UserIdentityInfo) {
        await Client.createClientSession(userInfo)
    }

    getEndPoints() {
        return Client.getEndpoints()
    }

    getPrivateKey() {
        return Client.getPrivateKey()
    }

    getCertificate() {
        return Client.getCertificate()
    }

    async getServers(options?: FindServersOnNetworkRequestOptions) {
        return await Client.getServersOnNetwork(options)
    }
}