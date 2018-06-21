const CollectionObj = require('varal-collection').CollectionObj;

class Model extends CollectionObj {

    $isModel() {
        return true;
    }

    $getClass() {
        return Model;
    }

    $getServer() {
        return null;
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

    $getTable() {
        return null;
    }

    $getPK() {
        return 'id';
    }

    $query() {
        if (this.connection)
            return this.connection.table(this.$getTable(), this.$getClass());
        return this.$getServer().table(this.$getTable(), this.$getClass());
    }

    async $all() {
        return await this.$query().get();
    }

    async $find(value) {
        return await this.$query().where(this.$getPK(), value);
    }

    async $save() {
        return await this.$query().where(this.$getPK(), this[this.$getPK()]).update(this);
    }

}

exports = module.exports = Model;