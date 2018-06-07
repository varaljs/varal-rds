const OP_ACCEPT = ['=', '<>', '>', '>=', '<', '<=', 'like', 'in', 'between'];

class MysqlQuery {

    constructor(server, table, model) {
        this.server = server;
        this._table = table;
        this._model = model;
        this._query = '';
        this._values = [];
        this._method = 'SELECT';
        this._fields = ['*'];
        this._insertFields = [];
        this._insertPlaceholder = [];
        this._updatePlaceholder = [];
        this._wherePlaceholder = [];
        this._whereValues = [];
        this._orderPlaceholder = [];
        this._limitPlaceholder = null;
    }

    async get(num) {
        this.buildQuery();
        let collection = await this.server.query(this._query, this._values, this._model);
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

    where(key, op, value, or) {
        if (Array.isArray(key)) {
            const type = or === true ? 1 : 0;
            let placeholder = '(';
            let values = [];
            let index = 0;
            for (let condition of key) {
                const [_key, _op, _value] = condition;
                const res = buildWhere(_key, _op, _value);
                if (index > 0)
                    placeholder += ' AND ';
                placeholder += res[0].value;
                values.push(...res[1]);
                index++;
            }
            placeholder += ')';
            this._wherePlaceholder.push({value: placeholder, type});
            this._whereValues.push(...values);
        } else {
            const res = buildWhere(key, op, value, or);
            this._wherePlaceholder.push(res[0]);
            this._whereValues.push(...res[1]);
        }
        return this;
    }

    orWhere(key, op, value) {
        return this.where(key, op, value, true);
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
        if (this._wherePlaceholder.length > 0) {
            let whereValue = this._wherePlaceholder.shift().value;
            for (let value of this._wherePlaceholder) {
                if (value.type === 1)
                    whereValue += ` OR ${value.value}`;
                else
                    whereValue += ` AND ${value.value}`;
            }
            query += ` WHERE ${whereValue}`;
        }
        query += ';';
        this._query = query;
        this._values = this._values.concat(this._whereValues);
    }

}

function buildWhere(key, op, value, or) {
    if (value === undefined) {
        value = op;
        op = '=';
    }
    const type = or === true ? 1 : 0;
    if (OP_ACCEPT.indexOf(op) < 0)
        throw new Error('Build query with invalid operator');
    if (op === 'between' && Array.isArray(value))
        return [{value: `\`${key}\` BETWEEN ? AND ?`, type}, [value[0], value[1]]];
    else if (op === 'in' && Array.isArray(value)) {
        const placeholder = [...value].fill('?');
        return [{value: `\`${key}\` IN(${placeholder.join()})`, type}, value];
    } else if (value === null) {
        if (op === '=')
            return [{value: `\`${key}\` IS NULL`, type}, []];
        else if (op === '<>')
            return [{value: `\`${key}\` IS NOT NULL`, type}, []];
    } else
        return [{value: `\`${key}\` ${op} ?`, type}, [value]];
}

exports = module.exports = MysqlQuery;