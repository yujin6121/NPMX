export async function up(knex) {
  await knex.schema.alterTable('activity_log', (table) => {
    table.text('user_agent').nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('activity_log', (table) => {
    table.dropColumn('user_agent');
  });
}
