let onProxy = new WeakMap() // 已经代理过的对象
let onRaw = new WeakMap()
let activeEffectStacks = [] // effect缓存栈
let targetsMap = new WeakMap() // 数据更新后需要调用的方法
/**
 * @param {Object} 判断是否是一个对象
 */
function isObject(target) { 
    if (typeof target === 'object' && target !== null) {
        return true
    }
    return false
}
/**
 * @param {Object} target
 * @param {Object} key
 */
function hasOwn(target, key) {
    return target.hasOwnProperty(key)
}
/**
 * 调用创建代理对象方法
 * @param {Object | String | Array} target
 */
function reactive(target) {
    return createReactiveObject(target)
}
/**
 * 创建一个代理对象
 * @param {Object} target
 */
function createReactiveObject(target) {
    // 判断是否是对象
    if (!isObject(target)) {
        return target
    }
    // console.debug('onRaw.has(target)', onRaw.has(target))
    let proxy =  onProxy.get(target)
    if (proxy) {
        console.debug('返回代理对象')
        return proxy
    }
    if (onRaw.has(target)) {
        console.log('返回原对象')
        return target
    }
    let baseHandler = {
        get(target, key, receiver) {
            let res = Reflect.get(target, key, receiver)
            track(target, key)
            return isObject(res) ? reactive(res) : res
        },
        set(target, key, value, receiver) {
            let oldValue = target[key]
            let res = Reflect.set(target, key, value, receiver)
            if (!hasOwn(target)) {
                // 执行新建
                trigger(target, key)
            } else if (oldValue !== value){
                trigger(target, key)
            }
            return res
        },
        deleteProperty(target, key) {
            let res = Reflect.deleteProperty(target, key)
            return res
        }
    }
    let observed = new Proxy(target, baseHandler)
    onProxy.set(target, observed)
    onRaw.set(observed, target)
    return observed
}
/**
 * 将effect方法加入到方法栈中
 * @param {Object} target
 * @param {Object} key
 */
function track(target, key) {
    let effect = activeEffectStacks[activeEffectStacks.length - 1]
    if (effect) {
        let depsMap = targetsMap.get(target)
        if (!depsMap) {
            targetsMap.set(target, depsMap = new Map())
        }
        let deps = depsMap.get(key)
        if (!deps) {
            depsMap.set(key, deps = new Set())
        }
        if (!deps.has(effect)) {
            deps.add(effect)
        }
    }
}
/**
 * 根据数据键值调用方法栈中的方法
 * @param {Object} target
 * @param {Object} key
 */
function trigger(target, key) {
    let depsMap = targetsMap.get(target)
    if (depsMap) {
        let deps = depsMap.get(key)
        if (deps) {
            deps.forEach(effect => {
                effect()
            })
        }
    }
}
/**
 * @param {Function} fn
 */
function effect(fn) {
    let effect = createReactiveEffect(fn)
    effect()
    
}
/**
 * @param {Function} fn
 */
function createReactiveEffect(fn) {
    let effect = function () {
        return run(effect, fn)
    }
    return effect
}
/**
 * @param {Function} effect
 * @param {Function} fn
 */
function run(effect, fn) {
    try{
        activeEffectStacks.push(effect)
        fn()
    } finally {
        activeEffectStacks.pop()
    }
}