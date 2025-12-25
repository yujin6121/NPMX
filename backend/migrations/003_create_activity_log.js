export async function up(knex) {
  await knex.schema.createTable('activity_log', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.string('action').notNullable();
    table.text('details').notNullable();
    table.string('ip').nullable();
    table.timestamp('created_on').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('activity_log');
}
