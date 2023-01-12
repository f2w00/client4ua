import { EventEmitter } from 'events'

/**
 * @description Ua后台发过来的消息的队列,前端只需订阅pushed,
 * 数据库订阅full/cleared事件即可
 * 当full事件触发之后,会清空队列
 * @author hhj
 * @example
 * UaMessageQueue.queueEvents.on('pushed',(data)=>{
 *     handleData(data)
 * })
 * UaMessageQueue.queueEvents.on('full',(arrayOfMessages:any[])=>{
 *     eventHandle(arrayOfMessages)
 * })
 * UaMessageQueue.queueEvents.on('cleared', () => {
 *     eventHandle()
 * })
 */
export module UaMessageQueue {
    let queue: any[] = []
    let maxLength: number = 200
    let queueEvents: EventEmitter = new EventEmitter()

    /**
     * @example
     * @param item
     * @private
     */
    function enqueue(item: any) {
        queue.push(item)
        queueEvents.emit('pushed', item)
        if (queue.length >= maxLength) {
            queueEvents.emit('full', queue.slice(0))
            queue.length = 0
            queueEvents.emit('cleared')
        }
    }
}