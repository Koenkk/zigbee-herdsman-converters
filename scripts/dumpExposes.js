const devices = require('../devices');

for (const definition of devices) {
    console.log(definition.model);
    for (const expose of definition.exposes) {
        if (expose.access) {
            console.log(`- ${expose.access} - ${expose.property}`);
        }
    }
}
