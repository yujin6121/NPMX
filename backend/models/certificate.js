import { Model } from 'objection';

export default class Certificate extends Model {
    static get tableName() {
        return 'certificate';
    }

    static get jsonAttributes() {
        return ['domain_names', 'meta'];
    }

    static get relationMappings() {
        return {
            owner: {
                relation: Model.BelongsToOneRelation,
                modelClass: `${import.meta.dirname}/user.js`,
                join: {
                    from: 'certificate.owner_user_id',
                    to: 'user.id',
                },
            },
            proxy_hosts: {
                relation: Model.HasManyRelation,
                modelClass: `${import.meta.dirname}/proxy_host.js`,
                join: {
                    from: 'certificate.id',
                    to: 'proxy_host.certificate_id',
                },
            },
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
