const Query = require('./query');

class QueryPg extends Query {

    async insert(values) {
        this._method = 'INSERT';
        for (let key in values)
            if (values.hasOwnProperty(key)) {
                let value = values[key];
                this._insertFields.push(key);
                this._insertPlaceholder.push('$' + (this._values.length + 1));
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
                this._updatePlaceholder.push(key + ' = $' + index);
                this._values.push(value);
            }
        this.buildQuery();
        return await this.server.query(this._query, this._values);
    }

    select(fields) {
        if (typeof fields === 'string')
            this._fields = [fields];
        else if (Array.isArray(fields))
            this._fields = fields;
        return this;
    }

    where(key, op, value) {
        if (value === undefined) {
            value = op;
            op = '=';
        }
        if (this.opAccept.indexOf(op) < 0)
            throw new Error('Build query with invalid operator');
        this._wherePlaceholder.push(key + op + '$' + (this._whereValues.length + 1));
        this._whereValues.push(value);
        return this;
    }

    buildQuery() {
        if (!this._table || typeof this._table !== 'string')
            throw new Error('Build query with invalid table name');
        let query = this._method + ' ';
        if (this._method === 'SELECT') {
            query += this._fields.join() + ' FROM "' + this._table + '"';
            if (this._wherePlaceholder.length > 0)
                query += ' WHERE ' + this._wherePlaceholder.join(' AND ');
            query += ';';
        } else if (this._method === 'INSERT') {
            query += 'INTO "' + this._table + '"(';
            query += this._insertFields.join(', ') + ') VALUES(';
            query += this._insertPlaceholder.join(', ') + ')';
            query += 'RETURNING *;';
        } else if (this._method === 'UPDATE') {
            query += '"' + this._table + '" SET ';
            query += this._updatePlaceholder.join(', ');
            if (this._wherePlaceholder.length > 0)
                query += ' WHERE ' + this._wherePlaceholder.join(' AND ');
            query += ';';
        } else if (this._method === 'DELETE') {
            query += 'FROM "' + this._table + '"';
            if (this._wherePlaceholder.length > 0)
                query += ' WHERE ' + this._wherePlaceholder.join(' AND ');
            query += ';';
        }
        this._query = query;
        this._values = this._whereValues.concat(this._values);
    }

}

exports = module.exports = QueryPg;