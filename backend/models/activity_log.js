import { Model } from 'objection';

export default class ActivityLog extends Model {
  static get tableName() {
    return 'activity_log';
  }

  $beforeInsert() {
    this.created_on = new Date().toISOString();
  }
}
