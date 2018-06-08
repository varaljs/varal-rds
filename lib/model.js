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

    $getTable() {
        return null;
    }

    $getPK() {
        return 'id';
    }

    $query() {
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