const encryption = require('./encryption');
const CloudAdapter = require('./cloud-adapter');
const DatabaseManager = require('./database-manager');



module.exports = {
    name: "Monty Core",
    ...encryption,
    CloudAdapter,
    DatabaseManager
};
