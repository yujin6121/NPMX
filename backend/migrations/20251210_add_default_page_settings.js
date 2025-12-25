/**
 * Add default page settings
 */
export async function up(knex) {
    // Create a new table for default page configurations
    await knex.schema.createTable('default_page', (table) => {
        table.increments('id').primary();
        table.timestamp('created_on').notNullable().defaultTo(knex.fn.now());
        table.timestamp('modified_on').notNullable().defaultTo(knex.fn.now());
        table.integer('is_deleted').notNullable().defaultTo(0);
        table.enu('port_type', ['http', 'https']).notNullable();
        table.enu('action_type', ['html', 'redirect', 'not_found']).notNullable().defaultTo('html');
        table.text('html_content').nullable();
        table.string('redirect_url', 2048).nullable();
        table.index(['is_deleted', 'port_type']);
    });
}

export async function down(knex) {
    await knex.schema.dropTableIfExists('default_page');
}
