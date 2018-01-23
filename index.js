const SUPPORTED = new Map([
    ['mysql', './lib/mysql'],
    ['pg', './lib/pg']
]);

module.exports = (server, options) => {
    if (!SUPPORTED.has(server))
        throw new Error('varal-rds only support mysql & pg now');
    server = require(SUPPORTED.get(server));
    return new server(options);
};