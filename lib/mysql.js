const mysql = require('mysql2/promise');
const collection = require('varal-collection');
const query = require('./mysqlQuery');
const path = require('path');
const fs = require('fs');

class Server {

    constructor(options) {
        this.models = {};
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

    loadModels(dirPath) {
        const realPath = path.join(process.cwd(), dirPath);
        if (!fs.existsSync(realPath))
            return;
        const models = fs.readdirSync(realPath);
        for (let i = 0; i < models.length; i += 1) {
            const modelPath = path.join(realPath, models[i]);
            const model = require(modelPath);
            if (model.isModel() === true) {
                model.getServer = () => this;
                this.models[model.getClassName()] = model;
            }
        }
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

    async beginTransaction() {
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