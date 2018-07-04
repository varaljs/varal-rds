const Query = require('./mysqlQuery');
const OP_ACCEPT = ['=', '<>', '>', '>=', '<', '<=', 'like', 'in', 'not in', 'between', 'not between',
    '&&', '<<', '>>', '&<', '&>', '<<|', '|>>', '&<|', '|&>', '<^', '>^', '?#', '?-', '?|', '?-|', '?||', '@>', '<@', '~='];

class PgQuery extends Query {

    async insert(values) {
        this._method = 'INSERT';
        for (let key in values)
            if (values.hasOwnProperty(key)) {
                let value = values[key];
                this._insertFields.push(`"${key}"`);
                this._insertPlaceholder.push(`$${this._values.length + 1}`);
                this._values.push(value);
            }
        this.buildQuery();
        const collection = await this.server.query(this._query, this._values, this._model);
        return collection.get(1);
    }

    async update(values) {
        this._method = 'UPDATE';
        for (let key in values)
            if (values.hasOwnProperty(key)) {
                let value = values[key];
                let index = this._values.length + this._whereValues.length + 1;
                this._updatePlaceholder.push(`"${key}" = $${index}`);
                this._values.push(value);
            }
        this.buildQuery();
        return await this.server.query(this._query, this._values);
    }

    select(...fields) {
        this._fields = [];
        for (let field of fields)
            if (field.indexOf('.*') > 0)
                this._fields.push(`"${field.replace('.', '".')}`);
            else if (Array.isArray(field)) {
                const [name, alias] = field;
                this._fields.push(`"${name.replace('.', '"."')}" AS "${alias}"`);
            } else
                this._fields.push(`"${field.replace('.', '"."')}"`);
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
                const res = buildWhere(_key, _op, _value, false, this._whereValues.length + values.length);
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
            const res = buildWhere(key, op, value, or, this._whereValues.length);
            this._wherePlaceholder.push(res[0]);
            this._whereValues.push(...res[1]);
        }
        return this;
    }

    orderBy(key, type = 'ASC') {
        this._orderPlaceholder.push(`"${key.replace('.', '"."')}" ${type.toLocaleUpperCase()}`);
        return this;
    }

    limit(start, end = null) {
        let limitStr = ` LIMIT ${start}`;
        if (end) {
            limitStr += ` OFFSET ${end}`;
        }
        this._limitPlaceholder = limitStr;
        return this;
    }

    paginate(page, per) {
        per = per || 10;
        return this.limit(per, (page - 1) * per);
    }

    join(table, type = 'INNER') {
        this._joinPlaceholder.push(`${type} JOIN "${table}"`);
        this._joinOnPlaceholder.push([]);
        this._joinIndex++;
        return this;
    }

    on(key1, key2) {
        try {
            this._joinOnPlaceholder[this._joinIndex].push(`"${key1.replace('.', '"."')}" = "${key2.replace('.', '"."')}"`);
            return this;
        } catch (e) {
            throw new Error('Use function \'on\' before \'join\'');
        }
    }

    buildQuery() {
        if (!this._table || typeof this._table !== 'string')
            throw new Error('Build query with invalid table name');
        let query = '';
        if (this._method === 'SELECT') {
            query += `SELECT ${this._fields.join()} FROM "${this._table}"`;
            if (this._joinPlaceholder.length > 0)
                for (let joinIndex in this._joinPlaceholder)
                    query += ` ${this._joinPlaceholder[joinIndex]} ON ${this._joinOnPlaceholder[joinIndex].join(' AND ')}`;
        }
        else if (this._method === 'INSERT')
            query += `INSERT INTO "${this._table}"(${this._insertFields.join(',')}) VALUES(${this._insertPlaceholder.join(',')}) RETURNING *`;
        else if (this._method === 'UPDATE')
            query += `UPDATE "${this._table}" SET ${this._updatePlaceholder.join(',')}`;
        else if (this._method === 'DELETE')
            query += `DELETE FROM "${this._table}"`;
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
        if (this._orderPlaceholder.length > 0)
            query += ` ORDER BY ${this._orderPlaceholder.join(', ')}`;
        if (this._limitPlaceholder)
            query += this._limitPlaceholder;
        query += ';';
        this._query = query;
        this._values = this._whereValues.concat(this._values);
    }

}

function buildWhere(key, op, value, or, whereIndex) {
    key = key.replace('.', '"."');
    if (value === undefined) {
        value = op;
        op = '=';
    }
    const type = or === true ? 1 : 0;
    if (OP_ACCEPT.indexOf(op) < 0)
        throw new Error('Build query with invalid operator');
    if ((op === 'between' || op === 'not between') && Array.isArray(value))
        return [{
            value: `"${key}" ${op.toLocaleUpperCase()} $${++whereIndex} AND $${++whereIndex}`,
            type
        }, [value[0], value[1]]];
    else if ((op === 'in' || op === 'not in') && Array.isArray(value)) {
        const placeholder = [];
        for (let i = 0; i < value.length; i++)
            placeholder.push(`$${++whereIndex}`);
        return [{value: `"${key}" ${op.toLocaleUpperCase()}(${placeholder.join()})`, type}, value];
    } else if (value === null) {
        if (op === '=')
            return [{value: `"${key}" IS NULL`, type}, []];
        else if (op === '<>')
            return [{value: `"${key}" IS NOT NULL`, type}, []];
    } else
        return [{value: `"${key}" ${op} $${++whereIndex}`, type}, [value]];
}

exports = module.exports = PgQuery;