const {Pool, Client} = require('pg');
const collection = require('varal-collection');
const query = require('./pgQuery');

class Server {

    constructor(options) {
        this.options = options;
        if (options.pool === true)
            this.pool = new Pool(this.options);
    }

    async endPool() {
        if (this.pool !== undefined)
            await this.pool.end();
    }

    async query(sqlString, values, model) {
        const connection = await this.connect();
        const res = await connection.query(sqlString, values, model);
        connection.end();
        return res;
    }

    async connect() {
        let connection = undefined;
        let pool = !!this.pool;
        if (pool)
            connection = await this.pool.connect();
        else {
            connection = new Client(this.options);
            await connection.connect();
        }
        return new Connection(connection, pool);
    }

    table(name, model) {
        return new query(this, name, model);
    }

}

class Connection {

    constructor(connection, pool) {
        this.connection = connection;
        this.pool = pool;
    }

    async query(sqlString, values, model) {
        if (!this.connection)
            return;
        const res = await this.connection.query(sqlString, values);
        if (Array.isArray(res.rows))
            return new collection(res.rows, model);
        return res;
    }

    table(name, model) {
        return new query(this, name, model);
    }

    async beginTransaction() {
        await this.connection.query('BEGIN');
    }

    async commit() {
        await this.connection.query('COMMIT');
        this.end();
    }

    async rollback() {
        await this.connection.query('ROLLBACK');
        this.end();
    }

    end() {
        if (this.pool)
            this.connection.release();
        else
            this.connection.end();
        delete this.connection;
    }


}

exports = module.exports = Server;