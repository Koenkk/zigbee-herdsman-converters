import re

regex = r"zigbeeModel: (\[.*\])"

deviceFile = open("devices.js","r").read()

matches = re.finditer(regex, deviceFile, re.MULTILINE)
device_groups = list()

for match_num, match in enumerate(matches, start=1):    
    for group_num in range(0, len(match.groups())):
        group_num = group_num + 1
        device_groups.append(match.group(group_num))

zigbee_models = list()

for x in device_groups:
    zigbee_models.append(x.replace("[", "").replace("]", "").replace("'", "").replace("\"", ""))

model_count = 0

for x in zigbee_models:
    if x.count(","):
        model_count += x.count(",") + 1
    else:
        model_count += 1

print(str(model_count) + " unique ZigBee models and " + str(len(device_groups)) + " devices supported.")
