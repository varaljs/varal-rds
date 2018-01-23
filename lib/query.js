class Query {

    constructor(server, table) {
        this.server = server;
        this.opAccept = ['=', '<>', '>', '>=', '<', '<=', 'like'];
        this._table = table;
        this._query = '';
        this._values = [];
        this._method = 'SELECT';
        this._fields = ['*'];
        this._insertFields = [];
        this._insertPlaceholder = [];
        this._updatePlaceholder = [];
        this._wherePlaceholder = [];
        this._whereValues = [];
    }

    async get(num) {
        this.buildQuery();
        let collection = await this.server.query(this._query, this._values);
        if (typeof num === 'number')
            return collection.get(num);
        return collection;
    }

    async first() {
        return await this.get(1);
    }

    async insert(values) {
        this._method = 'INSERT';
        for (let key in values)
            if (values.hasOwnProperty(key)) {
                let value = values[key];
                this._insertFields.push('`' + key + '`');
                this._insertPlaceholder.push('?');
                this._values.push(value);
            }
        this.buildQuery();
        return await this.server.query(this._query, this._values);
    }

    async update(values) {
        this._method = 'UPDATE';
        for (let key in values)
            if (values.hasOwnProperty(key)) {
                let value = values[key];
                this._updatePlaceholder.push('`' + key + '` = ?');
                this._values.push(value);
            }
        this.buildQuery();
        return await this.server.query(this._query, this._values);
    }

    async delete() {
        this._method = 'DELETE';
        this.buildQuery();
        return await this.server.query(this._query, this._values);
    }

    select(fields) {
        if (typeof fields === 'string' && fields !== '*')
            this._fields = ['`' + fields + '`'];
        else if (Array.isArray(fields)) {
            this._fields = [];
            for (let field of fields)
                this._fields.push('`' + field + '`');
        }
        return this;
    }

    where(key, op, value) {
        if (value === undefined) {
            value = op;
            op = '=';
        }
        if (this.opAccept.indexOf(op) < 0)
            throw new Error('Build query with invalid operator');
        this._wherePlaceholder.push('`' + key + '` ' + op + ' ?');
        this._whereValues.push(value);
        return this;
    }

    buildQuery() {
        if (!this._table || typeof this._table !== 'string')
            throw new Error('Build query with invalid table name');
        let query = this._method + ' ';
        if (this._method === 'SELECT') {
            query += this._fields.join() + ' FROM `' + this._table + '`';
            if (this._wherePlaceholder.length > 0)
                query += ' WHERE ' + this._wherePlaceholder.join(' AND ');
            query += ';';
        } else if (this._method === 'INSERT') {
            query += 'INTO `' + this._table + '`(';
            query += this._insertFields.join(', ') + ') VALUES(';
            query += this._insertPlaceholder.join(', ') + ')';
            query += ';';
        } else if (this._method === 'UPDATE') {
            query += '`' + this._table + '` SET ';
            query += this._updatePlaceholder.join(', ');
            if (this._wherePlaceholder.length > 0)
                query += ' WHERE ' + this._wherePlaceholder.join(' AND ');
            query += ';';
        } else if (this._method === 'DELETE') {
            query += 'FROM `' + this._table + '`';
            if (this._wherePlaceholder.length > 0)
                query += ' WHERE ' + this._wherePlaceholder.join(' AND ');
            query += ';';
        }
        this._query = query;
        this._values = this._values.concat(this._whereValues);
    }

}

exports = module.exports = Query;