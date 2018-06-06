const mysql = require('mysql2/promise');
const collection = require('varal-collection');
const query = require('./mysqlQuery');

class Server {

    constructor(options) {
        this.options = options;
        if (options.pool === true)
            this.pool = mysql.createPool(this.options);
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
            connection = await this.pool.getConnection();
        else
            connection = await mysql.createConnection(this.options);
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
        const [res] = await this.connection.query(sqlString, values);
        if (Array.isArray(res))
            return new collection(res, model);
        return res;
    }

    table(name, model) {
        return new query(this, name, model);
    }

    beginTransaction() {
        this.connection.beginTransaction();
    }

    async commit() {
        await this.connection.commit();
        this.end();
    }

    async rollback() {
        await this.connection.rollback();
        this.end();
    }

    end() {
        if (this.pool)
            this.connection.release();
        else
            this.connection.destroy();
        delete this.connection;
    }


}

exports = module.exports = Server;