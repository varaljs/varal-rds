const SUPPORTED = new Map([
    ['mysql', './lib/mysql'],
    ['pg', './lib/pg']
]);

const constructor = (server, options) => {
    if (!SUPPORTED.has(server))
        throw new Error('varal-rds only support mysql & pg now');
    server = require(SUPPORTED.get(server));
    return new server(options);
};

module.exports = constructor;

module.exports.model = require('./lib/model');

module.exports.varal = (server, alias) => {
    return ctn => {
        const options = ctn.config[alias];
        return constructor(server, options);
    };
};