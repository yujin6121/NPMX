/**
 * Add WAF (Web Application Firewall) columns to proxy_host table
 */
export async function up(knex) {
    await knex.schema.table('proxy_host', (table) => {
        table.integer('waf_enabled').notNullable().defaultTo(1);
        table.string('waf_mode', 20).notNullable().defaultTo('DetectionOnly'); // 'DetectionOnly' or 'On'
        table.integer('waf_paranoia_level').notNullable().defaultTo(1); // 1-4
    });
}

export async function down(knex) {
    await knex.schema.table('proxy_host', (table) => {
        table.dropColumn('waf_enabled');
        table.dropColumn('waf_mode');
        table.dropColumn('waf_paranoia_level');
    });
}
