import { Model } from 'objection';

export default class Auth extends Model {
    static get tableName() {
        return 'auth';
    }

    static get relationMappings() {
        return {
            user: {
                relation: Model.BelongsToOneRelation,
                modelClass: `${import.meta.dirname}/user.js`,
                join: {
                    from: 'auth.user_id',
                    to: 'user.id',
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
