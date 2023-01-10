import { Configuration, getLogger, Logger, configure } from 'log4js'
import { EventEmitter } from 'events'
import { writeFile, readFile, appendFile, existsSync } from 'fs'
import { modifyJsonNode, getJsonNode } from '../utils/client.util'

/**
 * @description 使用log4js库作为日志
 * 参照教程https://zhuanlan.zhihu.com/p/22110802,
 * 前端只需订阅info/error/warn事件即可
 * 如果需要配置log,使用Log.configure()方法,具体参考log4js配置方法
 */
export class Log {
    private static log: Logger
    private static events: EventEmitter

    constructor() {
        Log.log = getLogger('client')
        Log.events = new EventEmitter()
    }

    public static info(message: any, params?: object) {
        Log.log.info(message, { ...params })
        Log.events.emit('info', message, params)
    }

    public static error(message: any, params?: object) {
        Log.log.error(message, { ...params })
        Log.events.emit('error', message, params)
    }

    public static warn(message: any, params?: object) {
        Log.log.warn(message, { ...params })
        Log.events.emit('warn', message, params)
    }

    public static loadConfigure(filePath: string, nodeToLoad: string[]) {
        let node = getJsonNode(filePath, nodeToLoad)
        configure(node)
    }

    /**
     * @description 具体参考log4js配置方法
     * @param conf
     * @param filePath
     */
    public static configure(conf: Configuration, filePath: string) {
        const content = JSON.stringify({
            LogConfig: { ...conf },
        })
        // writeFile('configs.json', content, 'utf-8', (err) => {
        //     Log.log.info('error')
        // })
        modifyJsonNode(filePath, [], content)
        configure(conf)
    }
}
