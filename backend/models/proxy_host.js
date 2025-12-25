import { Model } from 'objection';

export default class ProxyHost extends Model {
    static get tableName() {
        return 'proxy_host';
    }

    static get jsonAttributes() {
        return ['domain_names', 'meta'];
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['domain_names', 'forward_host', 'forward_port'],
            properties: {
                id: { type: 'integer' },
                created_on: { type: 'string' },
                modified_on: { type: 'string' },
                domain_names: { type: 'array', items: { type: 'string' } },
                forward_host: { type: 'string' },
                forward_port: { type: 'integer' },
                forward_scheme: { type: 'string', default: 'http' },
                certificate_id: { type: ['integer', 'null'] },
                ssl_forced: { type: 'boolean', default: false },
                http3_support: { type: 'boolean', default: false },
                block_exploits: { type: 'boolean', default: false },
                caching_enabled: { type: 'boolean', default: false },
                allow_websocket_upgrade: { type: 'boolean', default: false },
                advanced_config: { type: 'string' },
                enabled: { type: 'boolean', default: true },
                meta: { type: 'object' }
            }
        };
    }

    static get relationMappings() {
        return {
            owner: {
                relation: Model.BelongsToOneRelation,
                modelClass: `${import.meta.dirname}/user.js`,
                join: {
                    from: 'proxy_host.owner_user_id',
                    to: 'user.id',
                },
            },
            certificate: {
                relation: Model.BelongsToOneRelation,
                modelClass: `${import.meta.dirname}/certificate.js`,
                join: {
                    from: 'proxy_host.certificate_id',
                    to: 'certificate.id',
                },
            },
            custom_locations: {
                relation: Model.HasManyRelation,
                modelClass: `${import.meta.dirname}/custom_location.js`,
                join: {
                    from: 'proxy_host.id',
                    to: 'custom_locations.proxy_host_id'
                }
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
