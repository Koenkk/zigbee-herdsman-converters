import re

regex = r"zigbeeModel: (\[.*\])"
vendor_regex = r"vendor: \'(.*)\'"

deviceFile = open("devices.js","r").read()

vendor_matches = re.finditer(vendor_regex, deviceFile, re.MULTILINE)
matches = re.finditer(regex, deviceFile, re.MULTILINE)

unique_vendors = list()

for match in vendor_matches:
    if match.groups()[0] not in unique_vendors:
        unique_vendors.append(match.groups()[0])

vendor_count = len(unique_vendors)


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

print("{} unique ZigBee models and {} devices supported from {} vendors.".format(model_count, str(len(device_groups)), vendor_count))
