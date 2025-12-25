
export async function up(knex) {
    await knex.schema.createTable('custom_locations', (table) => {
        table.increments('id').primary();
        table.string('created_on').notNullable();
        table.string('modified_on').notNullable();
        table.integer('proxy_host_id').unsigned().notNullable().references('id').inTable('proxy_host').onDelete('CASCADE');
        table.string('path').notNullable();
        table.string('forward_scheme').defaultTo('http');
        table.string('forward_host').notNullable();
        table.integer('forward_port').notNullable();
        table.text('advanced_config');
    });
}

export async function down(knex) {
    await knex.schema.dropTableIfExists('custom_locations');
}
