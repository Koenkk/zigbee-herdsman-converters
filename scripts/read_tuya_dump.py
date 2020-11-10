#!/usr/bin/env python3
import datetime
import sys


def parse_raw(length: int, data: bytearray):
    result = "["
    for num in data:
        result += " {:3d}".format(num)
    result += " ]"
    return result


def parse_bool(length: int, data: bytearray):
    if length != 1:
        print("WARN: Invalid bool length")
    return "True" if data[0] else "False"


def parse_value(length: int, data: bytearray):
    if length != 4:
        print("WARN: Invalid value length")
    return str(int.from_bytes(data, byteorder="big"))


def parse_temp(length: int, data: bytearray):
    if length != 4:
        print("WARN: Invalid value length")
    return str(int.from_bytes(data, byteorder="big") / 10) + "°C"


def parse_string(length: int, data: bytearray):
    return data.decode("utf-8")


def parse_enum(length: int, data: bytearray):
    if length != 1:
        print("WARN: Invalid enum length")
    return str(data[0])


def parse_bitmap(length: int, data: bytearray):
    if length != 1 and length != 2 and length != 4:
        print("WARN: Invalid bitmap length")
    first = True
    result = ""
    for num in data:
        if first:
            first = False
        else:
            result += " "
        result += "{:08b}".format(num)
    return result


def parse_saswell_schedule(length: int, data: bytearray):
    value = PROGRAM_MODES[data[0]] + " "
    for i in range(0, 4):
        time_bytes = data[i * 4 + 1:i * 4 + 3]
        time = int.from_bytes(time_bytes, byteorder="big")
        hour = int(time / 60)
        minute = time % 60
        temp_bytes = data[i * 4 + 3:i * 4 + 5]
        temp = int.from_bytes(temp_bytes, byteorder="big")
        value += "{}°C @ {:02d}:{:02d}   ".format(temp / 10, hour, minute)
    return value


SASWELL_DATA_POINT_NAMES = {
    8: "wndow detect",
    10: "frost detect",
    27: "temp calibr ",
    40: "child lock  ",
    101: "thermostat  ",
    102: "current temp",
    103: "set temp    ",
    104: "valve pos   ",
    105: "battery low ",
    106: "away mode   ",
    107: "sched mode  ",
    108: "sched enable",
    109: "sched set",
    110: "set hst day ",
    111: "time sync",
    112: "set hst week",
    113: "set hst mon ",
    114: "set hst year",
    115: "cur hst day ",
    116: "cur hst week",
    117: "cur hst mon ",
    118: "cur hst year",
    119: "cur mot day ",
    120: "cur mot week",
    121: "cur mot mon ",
    122: "cur mot year",
    123: "sched day 1 ",
    124: "sched day 2 ",
    125: "sched day 3 ",
    126: "sched day 4 ",
    127: "sched day 5 ",
    128: "sched day 6 ",
    129: "sched day 7 ",
    130: "anti scaling",
}
SASWELL_PARSERS = {
    102: parse_temp,
    103: parse_temp,
    123: parse_saswell_schedule,
    124: parse_saswell_schedule,
    125: parse_saswell_schedule,
    126: parse_saswell_schedule,
    127: parse_saswell_schedule,
    128: parse_saswell_schedule,
    129: parse_saswell_schedule,
}
PROGRAM_MODES = {
    1: "single",
    2: "week_weekend",
    3: "week_sat_sun",
    4: "full",
}

DATA_POINT_NAMES = SASWELL_DATA_POINT_NAMES
DATA_TYPE_PARSERS = [parse_raw, parse_bool, parse_value, parse_string, parse_enum, parse_bitmap]
EXTRA_PARSERS = SASWELL_PARSERS


def get_values(numbers):
    data = bytearray()
    dp = int(numbers[0], 16)
    dtype = int(numbers[1], 16)
    fn = int(numbers[2], 16)
    for number in numbers[3:]:
        data += bytes([int(number, 16)])

    if dp in DATA_POINT_NAMES.keys():
        name = DATA_POINT_NAMES[dp]
    else:
        name = "unknown     "
    length = len(data)

    value = "{:d} ".format(fn)
    if dp in EXTRA_PARSERS.keys():
        value += EXTRA_PARSERS[dp](length, data)
    else:
        value += DATA_TYPE_PARSERS[dtype](length, data)
    return (name, value)


def main():
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        line = line[:-1]
        if len(line) == 0:
            continue
        tokens = line.split(" ")
        time = datetime.datetime.fromtimestamp(int(int(tokens[0]) / 1000))
        address = tokens[1]
        status = int(tokens[2], 16)
        transid = int(tokens[3], 16)

        (name, value) = get_values(tokens[4:])
        print(
            "{} {} (tid: {:3d}, s: {}) [{}] => {}".format(
                time.isoformat(), address, transid, status, name, value
            )
        )


if __name__ == "__main__":
    main()
