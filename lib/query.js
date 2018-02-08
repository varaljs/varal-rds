class Query {

    constructor(server, table) {
        this.server = server;
        this.opAccept = ['=', '<>', '>', '>=', '<', '<=', 'like', 'in', 'between'];
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
                this._insertFields.push(`\`${key}\``);
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
                this._updatePlaceholder.push(`\`${key}\` = ?`);
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

    select(...fields) {
        this._fields = [];
        for (let field of fields)
            if (Array.isArray(field)) {
                const [name, alias] = field;
                this._fields.push(`\`${name}\` AS ${alias}`);
            } else
                this._fields.push(`\`${field}\``);
        return this;
    }

    where(key, op, value, value2) {
        if (Array.isArray(key)) {
            for (let condition of key) {
                const [_key, _op, _value] = condition;
                this.where(_key, _op, _value);
            }
            return this;
        }
        if (value === undefined) {
            value = op;
            op = '=';
        }
        if (this.opAccept.indexOf(op) < 0)
            throw new Error('Build query with invalid operator');
        if (op === 'between' && value2 !== undefined) {
            this._wherePlaceholder.push(`\`${key}\` BETWEEN ? AND ?`);
            this._whereValues.push(value, value2);
        } else if (op === 'in' && Array.isArray(value)) {
            const placeholder = [...value].fill('?');
            this._wherePlaceholder.push(`\`${key}\` IN(${placeholder.join()})`);
            this._whereValues.push(...value);
        } else if (value === null) {
            if (op === '=')
                this._wherePlaceholder.push(`\`${key}\` IS NULL`);
            else if (op === '<>')
                this._wherePlaceholder.push(`\`${key}\` IS NOT NULL`);
        } else {
            this._wherePlaceholder.push(`\`${key}\` ${op} ?`);
            this._whereValues.push(value);
        }
        return this;
    }

    buildQuery() {
        if (!this._table || typeof this._table !== 'string')
            throw new Error('Build query with invalid table name');
        let query = '';
        if (this._method === 'SELECT')
            query += `SELECT ${this._fields.join()} FROM \`${this._table}\``;
        else if (this._method === 'INSERT')
            query += `INSERT INTO \`${this._table}\`(${this._insertFields.join(',')}) VALUES(${this._insertPlaceholder.join(',')})`;
        else if (this._method === 'UPDATE')
            query += `UPDATE \`${this._table}\` SET ${this._updatePlaceholder.join(',')}`;
        else if (this._method === 'DELETE')
            query += `DELETE FROM \`${this._table}\``;
        if (this._wherePlaceholder.length > 0)
            query += ` WHERE ${this._wherePlaceholder.join(' AND ')}`;
        query += ';';
        this._query = query;
        this._values = this._values.concat(this._whereValues);
    }

}

exports = module.exports = Query;