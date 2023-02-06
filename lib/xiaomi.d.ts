declare type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface TrvScheduleConfigEvent {
    time: number;
    temperature: number;
}

export interface TrvScheduleConfig {
    days: Day[];
    events: TrvScheduleConfigEvent[];
}
