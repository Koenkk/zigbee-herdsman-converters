export enum ZigbeeDeviceAccess {
    STATE = 1,
    SET = 2,
    STATE_SET = 3,
    STATE_GET = 5,
    ALL = 7,
}

export interface ZigbeeDeviceExposeGeneric {
    access: ZigbeeDeviceAccess
    description: string
    name: string
    property: string
    type: string
}

export interface ZigbeeDeviceExposeEnum {
    type: 'enum'
    values: string[]
}

export interface ZigbeeDeviceExposeNumeric {
    type: 'numeric'
    value_min: number
    value_max: number
}

export interface ZigbeeDeviceExposeBinary {
    type: 'binary'
    value_off: boolean
    value_on: boolean
}

export interface ZigbeeDeviceExposeText {
    type: 'text'
}

export interface ZigbeeDeviceExposeLight {
    type: 'light'
    features: ZigbeeDeviceExpose[]
}

export interface ZigbeeDeviceExposeComposite {
    type: 'composite'
    features: ZigbeeDeviceExpose[]
}

export type ZigbeeDeviceExpose = ZigbeeDeviceExposeGeneric & (ZigbeeDeviceExposeEnum | ZigbeeDeviceExposeNumeric | ZigbeeDeviceExposeBinary | ZigbeeDeviceExposeText | ZigbeeDeviceExposeLight | ZigbeeDeviceExposeComposite)

export interface ZigbeeDevice {
    date_code: string
    definition?: {
        description: string
        exposes: ZigbeeDeviceExpose[]
        model: string
        vendor: string
    }
    endpoints: Record<number, { bindings: string[], clusters: {} }>
    friendly_name: string
    ieee_address: string
    interview_completed: boolean
    interviewing: boolean
    network_address: number
    power_source: string
    supported: boolean
    type: string
}

export type devices = []
export type exposes = any
export type definitions = any
/** @deprecated use findByDevice */
export type findByZigbeeModel = Function
export type findByDevice = ({ modelId: string }) => ZigbeeDevice
export type toZigbeeConverters = Function
export type fromZigbeeConverters = Function
export type addDeviceDefinition = Function
export type onEvent = Function