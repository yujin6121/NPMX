import { Model } from 'objection';

export default class Setting extends Model {
    static get tableName() {
        return 'setting';
    }

    static get jsonAttributes() {
        return ['meta'];
    }

    $beforeInsert() {
        this.created_on = new Date().toISOString();
        this.modified_on = new Date().toISOString();
    }

    $beforeUpdate() {
        this.modified_on = new Date().toISOString();
    }
}
