declare type OnOffToggle = 'ON' | 'OFF';
declare type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface TrvScheduleConfigEvent {
    time: number;
    temperature: number;
}

export interface TrvScheduleConfig {
    days: Day[];
    events: TrvScheduleConfigEvent[];
}

export interface ExposedTrvDaySelection {
    mon: OnOffToggle;
    tue: OnOffToggle;
    wed: OnOffToggle;
    thu: OnOffToggle;
    fri: OnOffToggle;
    sat: OnOffToggle;
    sun: OnOffToggle;
}

export interface ExposedTrvScheduleEvent {
    hour: number;
    minute: number;
    temperature: number;
}

export interface ExposedTrvSchedule {
    days: ExposedTrvDaySelection;
    event1: ExposedTrvScheduleEvent;
    event2: ExposedTrvScheduleEvent;
    event3: ExposedTrvScheduleEvent;
    event4: ExposedTrvScheduleEvent;
}
