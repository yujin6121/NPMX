import { Model } from 'objection';

export default class User extends Model {
    static get tableName() {
        return 'user';
    }

    static get jsonAttributes() {
        return ['roles'];
    }

    static get relationMappings() {
        return {
            proxy_hosts: {
                relation: Model.HasManyRelation,
                modelClass: `${import.meta.dirname}/proxy_host.js`,
                join: {
                    from: 'user.id',
                    to: 'proxy_host.owner_user_id',
                },
            },
            certificates: {
                relation: Model.HasManyRelation,
                modelClass: `${import.meta.dirname}/certificate.js`,
                join: {
                    from: 'user.id',
                    to: 'certificate.owner_user_id',
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
