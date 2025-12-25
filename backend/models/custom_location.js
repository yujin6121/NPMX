import { Model } from 'objection';
import db from '../db.js';

Model.knex(db);

class CustomLocation extends Model {
    static get tableName() {
        return 'custom_locations';
    }

    static get idColumn() {
        return 'id';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['path', 'forward_host', 'forward_port', 'proxy_host_id'],

            properties: {
                id: { type: 'integer' },
                created_on: { type: 'string' },
                modified_on: { type: 'string' },
                path: { type: 'string' },
                forward_scheme: { type: 'string', default: 'http' },
                forward_host: { type: 'string' },
                forward_port: { type: 'integer' },
                advanced_config: { type: 'string' },
                proxy_host_id: { type: 'integer' }
            }
        };
    }

    $beforeInsert() {
        this.created_on = new Date().toISOString();
        this.modified_on = new Date().toISOString();
    }

    $beforeUpdate() {
        this.modified_on = new Date().toISOString();
    }
}

export default CustomLocation;
