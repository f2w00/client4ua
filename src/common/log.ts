import { Configuration, getLogger, Logger, configure } from 'log4js'
import { EventEmitter } from 'events'
import { modifyJsonNode, getJsonNode } from '../utils/client.util'

/**
 * @description 使用log4js库作为日志
 * 参照教程https://zhuanlan.zhihu.com/p/22110802,
 * 前端只需订阅info/error/warn事件即可
 * 如果需要配置log,使用Log.configureLog()方法,具体参考log4js配置方法
 * @example
 * const Log = require('log')
 * Log.info('nice')
 *
 * Log.logEvents.on('info',(message,params)=>{
 * })
 */
export module Log {
    let log: Logger = getLogger('client')
    export let logEvents = new EventEmitter()

    export function info(message: any, params?: object) {
        log.info(message, { ...params })
        logEvents.emit('info', message, params)
    }

    export function error(message: any, params?: object) {
        log.error(message, { ...params })
        logEvents.emit('error', message, params)
    }

    export function warn(message: any, params?: object) {
        log.warn(message, { ...params })
        logEvents.emit('warn', message, params)
    }

    /**
     * @description 加载json文件中的log设置
     * @param filePath
     * @param nodeToLoad
     * @private
     */
    export function loadLogConfigure(filePath: string, nodeToLoad: string[]) {
        let node = getJsonNode(filePath, nodeToLoad)
        configure(node)
    }

    /**
     * @description 具体参考log4js配置方法
     * @param conf
     * @param filePath
     */
    export function configureLog(conf: Configuration, filePath: string) {
        const content = JSON.stringify({
            LogConfig: { ...conf },
        })
        modifyJsonNode(filePath, [], content)
        configure(conf)
    }
}
