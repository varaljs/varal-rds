const CollectionObj = require('varal-collection').CollectionObj;

class Model extends CollectionObj {

    static isModel() {
        return true;
    }

    static getClassName() {
        return this.name;
    }

    static getServer() {
        return null;
    }

    static getTable() {
        return null;
    }

    static getPK() {
        return 'id';
    }

    static query() {
        return this.getServer().table(this.getTable(), this);
    }

    static async all() {
        return await this.query().get();
    }

    static async find(value) {
        return await this.query().where(this.getPK(), value).first();
    }

    static async create(data) {
        return await this.query().insert(data);
    }

    $getClassName() {
        return this.constructor.name;
    }

    $getClass() {
        return this.constructor;
    }

    $isModel() {
        return this.$getClass().isModel();
    }

    $getServer() {
        return this.$getClass().getServer();
    }

    $getTable() {
        return this.$getClass().getTable();
    }

    $getPK() {
        return this.$getClass().getPK();
    }

    async $getConnection() {
        if (!this.connection)
            this.connection = await this.$getServer().connect();
        return this.connection;
    }

    async $beginTransaction() {
        const con = await this.$getConnection();
        await con.beginTransaction();
    }

    async $commit() {
        const con = await this.$getConnection();
        await con.commit();
        delete this.connection;
    }

    async $rollback() {
        const con = await this.$getConnection();
        await con.rollback();
        delete this.connection;
    }

    $query() {
        if (this.connection)
            return this.connection.table(this.$getTable(), this.$getClass());
        return this.$getServer().table(this.$getTable(), this.$getClass());
    }

    async $all() {
        return await this.$getClass().all();
    }

    async $find(value) {
        return await this.$getClass().find(value);
    }

    async $save() {
        if (this.$query().where(this.$getPK(), this[this.$getPK()]).first())
            return await this.$query().where(this.$getPK(), this[this.$getPK()]).update(this);
        return await this.$query().insert(this);
    }

}

exports = module.exports = Model;