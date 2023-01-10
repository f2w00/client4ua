import {
    ClientSession,
    ClientSubscription,
    DataValue,
    EndpointDescription,
    makeBrowsePath,
    MonitoringParametersOptions,
    OPCUAClient,
    OPCUAClientOptions,
    ReadValueIdOptions,
    ReferenceDescription,
    TimestampsToReturn,
    UserIdentityInfo,
    UserTokenType,
    ClientMonitoredItemGroup,
    MessageSecurityMode,
    SecurityPolicy,
    findServersOnNetwork,
    ServerOnNetwork,
    FindServersOnNetworkRequestOptions,
    WriteValueOptions,
    StatusCode,
    OPCUACertificateManager,
    AttributeIds,
    ClientMonitoredItem,
    MonitoredItem,
    SignedSoftwareCertificate,
    CertificateManager,
} from 'node-opcua'
import { EventEmitter } from 'events'
import { Log } from './log'
import { UaMessageQueue } from './mq'

// let endPointUrl = 'opc.tcp://WIN-4D29EPFU0V6:26543'

// let user: UserIdentityInfo = {
//     type: UserTokenType.UserName,
//     userName: 'nice',
//     password: 'nice',
// }

class UaCertificate {
    constructor() {

    }
}

class UaSubscription {
    subscription!: ClientSubscription
    monitoredItemGroup!: ClientMonitoredItemGroup
    monitoredItems!: ClientMonitoredItem[]

    constructor(
        session: ClientSession,
        subOptions: Object = {
            requestedLifetimeCount: 10,
            requestedLifeTimeCount: 100,
            requestedPublishingInterval: 1000,
            publishingEnabled: true,
            maxNotificationPerPublish: 100,
            priority: 10,
        },
    ) {
        this.subscription = ClientSubscription.create(session, subOptions)
        this.subscription
            .on('started', () => {
                Log.info('installed subscription on session')
            })
            .on('keepalive', () => {
            })
            .on('terminated', () => {
            })
    }

    async terminateSubscription() {
        if (this.subscription) {
            await this.subscription.terminate()
            Log.info('terminated subscription')
        } else {
            Log.error('error')
        }
    }

    /**
     * @description 用来创建一个MonitoredItemGroup
     * @param itemsToMonitor
     * @param parameters
     * @param timeStampToReturn
     */
    createMonitoredItemGroup(
        itemsToMonitor: ReadValueIdOptions[],
        parameters: MonitoringParametersOptions = {
            samplingInterval: 100,
            discardOldest: true,
            queueSize: 10,
        },
        timeStampToReturn: TimestampsToReturn = TimestampsToReturn.Both,
    ) {
        if (this.subscription) {
            this.monitoredItemGroup = ClientMonitoredItemGroup.create(
                this.subscription,
                itemsToMonitor,
                parameters,
                timeStampToReturn,
            )
            this.monitoredItemGroup
                .on('changed', function itemGroupChangedHandler(data, data2) {
                    console.log(data2)
                })
                .on('initialized', function itemGroupInitializedHandler() {
                    console.log('init')
                })
                .on('terminated', function itemGroupTerminatedHandler() {
                    console.log('terminated')
                })
                .on('err', function itemGroupErrHandler() {
                    console.log('err')
                })
        } else {
            Log.error('error')
        }
        // let a:ReadValueIdOptions={
        //     nodeId:'nice',
        //     attributeId:AttributeIds.Value
        // }
    }

    /**
     * @description 创建一个监控节点并且加入到本类的节点数组之中,与group分开
     * @param itemToMonitor
     * @param parameters
     */
    addMonitoredItem(
        itemToMonitor: ReadValueIdOptions,
        parameters: MonitoringParametersOptions = {
            samplingInterval: 100,
            discardOldest: true,
            queueSize: 10,
        },
    ) {
        let monitoredItem = ClientMonitoredItem.create(
            this.subscription,
            itemToMonitor,
            parameters,
            TimestampsToReturn.Both,
        )
        monitoredItem
            .on('changed', function itemGroupChangedHandler(data) {
                UaMessageQueue.enqueue(data)
                // UaSubscription.commitToMessageQueue(data,global.queue)
            })
            .on('initialized', function itemGroupInitializedHandler() {
                console.log('init')
            })
            .on('terminated', function itemGroupTerminatedHandler() {
                console.log('terminated')
            })
            .on('err', function itemGroupErrHandler() {
                console.log('err')
            })
        this.monitoredItems.push(monitoredItem)
    }
}

class UaSession {
    session!: ClientSession
    uaSubscriptions!: UaSubscription//ClientSubscription[]
    userIdentity: UserIdentityInfo

    constructor(userInfo: UserIdentityInfo = { type: UserTokenType.Anonymous }) {
        this.userIdentity = userInfo
        // this.uaSubscriptions=[]
    }

    async changeIdentity(userInfo: UserIdentityInfo = { type: UserTokenType.Anonymous }) {
        await this.session.changeUser(userInfo)
    }

    async createSession(uaClient: OPCUAClient) {
        this.session = await uaClient.createSession(this.userIdentity)
    }

    async closeSession(deleteSubscription?: boolean) {
        if (this.session) {
            try {
                await this.session.close(deleteSubscription)
            } catch (e: any) {
                Log.error(e.message)
            }
        }
    }

    addSubscription(subOptions?: Object) {
        try {
            this.uaSubscriptions = new UaSubscription(this.session, subOptions)
        } catch (e: any) {
            Log.error(e.message)
        }
    }

    async readByNodeIds(nodesToRead: ReadValueIdOptions[], maxAge?: number): Promise<DataValue[]> {
        return await this.session.read(nodesToRead, maxAge)
    }

    async browseRootFolder(): Promise<ReferenceDescription[]> {
        let browseResult = await this.session.browse('RootFolder')
        let resultList: ReferenceDescription[] = []
        if (browseResult.references) {
            resultList = browseResult.references
        } else {
            Log.warn('空列表')
        }
        return resultList
    }

    async getNodeIdByBrowseName(relativePathBNF: string, rootNode: string = 'RootFolder'): Promise<string> {
        let browsePath = makeBrowsePath(rootNode, relativePathBNF)
        let result = await this.session.translateBrowsePath(browsePath)
        Log.info('Get NodeId by browseName')
        if (result.targets) return result.targets[0].targetId.toString()
        return ''
    }

    async writeToServer(nodesToWrite: WriteValueOptions[]): Promise<StatusCode[]> {
        let codes = await this.session.write(nodesToWrite)
        if (!codes) Log.error('error writing to server')
        return codes
    }

}

class UaClient {
    client: OPCUAClient
    uaConnectionAlive: boolean
    uaSession!: UaSession

    constructor(clientOptions: OPCUAClientOptions) {
        this.client = OPCUAClient.create(clientOptions)
        this.uaConnectionAlive = false
    }

    async createClientSession(userInfo?: UserIdentityInfo) {
        this.uaSession = new UaSession(userInfo)
        await this.uaSession.createSession(this.client)
    }

    async connectToServer(endpointUrl: string) {
        try {
            await this.client.connect(endpointUrl)
            Log.info('Established connection.', { Endpoint: endpointUrl })
            console.log('success')
        } catch (e) {
            Log.error('error')
        }
    }

    async disconnectFromServer(deleteSubscription?: boolean) {
        if (this.uaSession) {
            try {
                await this.uaSession.closeSession(deleteSubscription)
                Log.info('Session closed')
            } catch (e: any) {
                Log.error('Error closing UA session.', { error: e.message })
            }
        }
        await this.client.disconnect()
        Log.info('Client disconnected')
    }

    async getServersOnNetwork(options?: FindServersOnNetworkRequestOptions): Promise<ServerOnNetwork[]> {
        let servers = await this.client.findServersOnNetwork(options)
        if (!servers) Log.error('no servers')
        return servers
    }

    async getEndpoints(): Promise<EndpointDescription[]> {
        let endpoints = await this.client.getEndpoints()
        if (!endpoints) Log.warn('endpoints不存在')
        return endpoints
    }

    getPrivateKey() {
        Log.info('get private key')
        return this.client.getPrivateKey()
    }

    getCertificate() {
        Log.info('get certificate')
        return this.client.getCertificate()
    }

    // makeSubject(){
    //     OPCUACertificateManager
    // }

    // constructor(endpointMustExist = false, clientName = 'clientName', keepSessionAlive = true,
    //             applicationName = 'name', certificateFilePath = null, securityMode = MessageSecurityMode.None,
    //             securityPolicy = SecurityPolicy.None, privateKeyFile = null,
    //             connectionStrategy = {
    //                 maxRetry: 3,
    //                 maxDelay: 2000,
    //                 initialDelay: 1000,
    //             }) {
    //     this.client = OPCUA.OPCUAClient.create({
    //         applicationName: applicationName,
    //         certificateFile: certificateFilePath,
    //         endpointMustExist: endpointMustExist,
    //         clientName: clientName,
    //         connectionStrategy: connectionStrategy,
    //         keepSessionAlive: keepSessionAlive,
    //         securityMode: securityMode,
    //         securityPolicy: securityPolicy,
    //         privateKeyFile: privateKeyFile,
    //     })
    //     this.uaSession = null
    //     this.uaConnectionAlive = null
    //     this.uaSubscription = null
    // }
}

async function nice() {
    let o: OPCUAClientOptions = {
        applicationName: 'NodeOPCUA-Client',
        connectionStrategy: {
            initialDelay: 1000,
            maxRetry: 1,
        },
        securityMode: MessageSecurityMode.None,
        securityPolicy: SecurityPolicy.None,
        endpointMustExist: false,
    }
    let user2: UserIdentityInfo = {
        type: UserTokenType.UserName,
        userName: 'nice',
        password: '1234',
    }
    let c = new UaClient(o)
    await c.connectToServer('opc.tcp://WIN-4D29EPFU0V6:53530/OPCUA/SimulationServer')
    await c.createClientSession()
    let b = await c.uaSession.browseRootFolder()
    console.log(b)
    // let endpoints=await c.getEndpoints()
    // console.log(endpoints)
    // console.log(await c.getServersOnNetwork())
    // console.log(await c.getCertificate())
    // c.uaSession.addSubscription()
    // c.uaSession.uaSubscriptions[0]
    // console.log(await c.uaSession.getNodeIdByBrowseName('/Objects'))
    let node = await c.uaSession.readByNodeIds([{ nodeId: 'ns=3;i=1001', attributeId: AttributeIds.Value }])
    console.log(node[0].toString())
    c.uaSession.addSubscription()
    c.uaSession.uaSubscriptions.createMonitoredItemGroup([{ nodeId: 'ns=3;i=1003', attributeId: AttributeIds.Value }])
}

// let a = new UaMessageQueue()
let o: OPCUAClientOptions = {
    applicationName: 'Client',
    connectionStrategy: {
        initialDelay: 1000,
        maxRetry: 1,
    },
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
    endpointMustExist: false,
}
let user2: UserIdentityInfo = {
    type: UserTokenType.UserName,
    userName: 'nice',
    password: '1234',
}
let c = new UaClient(o)
c.connectToServer('opc.tcp://WIN-4D29EPFU0V6:53530/OPCUA/SimulationServer')
c.getServersOnNetwork({})
let a = new OPCUACertificateManager({
    rootFolder: 'C:\\Users\\Administrator\\Desktop\\zhenfan-master',
    automaticallyAcceptUnknownCertificate: true,
    name: 'nice',
})
let date = new Date()
a.createSelfSignedCertificate({
    outputFile: 'C:\\Users\\Administrator\\Desktop\\zhenfan-master\\nice',
    applicationUri: 'heihei',
    startDate: date,
    validity: 1,
    dns: [1, 2],
    subject: {},
})
// a.createSelfSignedCertificate()
// a.createSelfSignedCertificate()
// let x=new CertificateManager({location:'C:\\Users\\Administrator\\Desktop\\zhenfan-master'})