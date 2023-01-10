import { EventEmitter } from 'events'

/**
 * @description Ua后台发过来的消息的队列,前端只需订阅pushed,
 * 数据库订阅full/cleared事件即可
 * 当full事件触发之后,会清空队列
 * @author hhj
 * @class
 * @example
 * UaMessageQueue.events.on('pushed',(data)=>{
 *     handleData(data)
 * })
 *
 * UaMessageQueue.events.on('full',(arrayOfMessages:any[])=>{
 *     eventHandle(arrayOfMessages)
 * })
 *
 * UaMessageQueue.events.on('cleared', () => {
 *     eventHandle()
 * })
 */
export class UaMessageQueue {
    private static queue: any[]
    private static maxLength: number
    public static events: EventEmitter

    constructor(maxLength = 200) {
        UaMessageQueue.queue = []
        UaMessageQueue.maxLength = maxLength
        UaMessageQueue.events = new EventEmitter()
    }

    /**
     * @description 将item推入队列
     * @param item
     */
    public static enqueue(item: any) {
        UaMessageQueue.queue.push(item)
        UaMessageQueue.events.emit('pushed', item)
        if (UaMessageQueue.queue.length >= UaMessageQueue.maxLength) {
            UaMessageQueue.events.emit('full', UaMessageQueue.queue.slice(0))
            UaMessageQueue.queue.length = 0
            UaMessageQueue.events.emit('cleared')
        }
    }
}