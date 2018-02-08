const Query = require('./query');

class QueryPg extends Query {

    async insert(values) {
        this._method = 'INSERT';
        for (let key in values)
            if (values.hasOwnProperty(key)) {
                let value = values[key];
                this._insertFields.push(key);
                this._insertPlaceholder.push(`$${this._values.length + 1}`);
                this._values.push(value);
            }
        this.buildQuery();
        const collection = await this.server.query(this._query, this._values);
        return collection.get(1);
    }

    async update(values) {
        this._method = 'UPDATE';
        for (let key in values)
            if (values.hasOwnProperty(key)) {
                let value = values[key];
                let index = this._values.length + this._whereValues.length + 1;
                this._updatePlaceholder.push(`${key} = $${index}`);
                this._values.push(value);
            }
        this.buildQuery();
        return await this.server.query(this._query, this._values);
    }

    select(...fields) {
        this._fields = [];
        for (let field of fields)
            if (Array.isArray(field)) {
                const [name, alias] = field;
                this._fields.push(`${name} AS ${alias}`);
            } else
                this._fields.push(field);
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
            this._wherePlaceholder.push(`${key} ${op} $${this._whereValues.length + 1} AND $${this._whereValues.length + 2}`);
            this._whereValues.push(value, value2);
        } else if (op === 'in' && Array.isArray(value)) {
            const placeholder = [];
            for (let i = 1; i <= value.length; i += 1)
                placeholder.push(`$${i}`);
            this._wherePlaceholder.push(`${key} IN(${placeholder.join()})`);
            this._whereValues.push(...value);
        } else if (value === null) {
            if (op === '=')
                this._wherePlaceholder.push(`${key} IS NULL`);
            else if (op === '<>')
                this._wherePlaceholder.push(`${key} IS NOT NULL`);
        } else {
            this._wherePlaceholder.push(`${key} ${op} $${this._whereValues.length + 1}`);
            this._whereValues.push(value);
        }
        return this;
    }

    buildQuery() {
        if (!this._table || typeof this._table !== 'string')
            throw new Error('Build query with invalid table name');
        let query = '';
        if (this._method === 'SELECT')
            query += `SELECT ${this._fields.join()} FROM "${this._table}"`;
        else if (this._method === 'INSERT')
            query += `INSERT INTO "${this._table}"(${this._insertFields.join(',')}) VALUES(${this._insertPlaceholder.join(',')})`;
        else if (this._method === 'UPDATE')
            query += `UPDATE "${this._table}" SET ${this._updatePlaceholder.join(',')}`;
        else if (this._method === 'DELETE')
            query += `DELETE FROM "${this._table}"`;
        if (this._wherePlaceholder.length > 0)
            query += ` WHERE ${this._wherePlaceholder.join(' AND ')}`;
        query += ';';
        this._query = query;
        this._values = this._whereValues.concat(this._values);
    }

}

exports = module.exports = QueryPg;