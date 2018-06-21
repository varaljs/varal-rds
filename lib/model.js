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

    $getConnection() {
        if (!this.connection)
            this.connection = this.$getServer().connect();
        return this.connection;
    }

    async $beginTransaction() {
        const con = this.$getConnection();
        await con.beginTransaction();
    }

    async $commit() {
        const con = this.$getConnection();
        await con.commit();
    }

    async $rollback() {
        const con = this.$getConnection();
        await con.rollback();
    }

    $getTable() {
        return null;
    }

    $getPK() {
        return 'id';
    }

    $query() {
        if (this.connection)
            return this.$getConnection().table(this.$getTable(), this.$getClass());
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