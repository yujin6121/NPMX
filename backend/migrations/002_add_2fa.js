/**
 * Add TOTP-based 2FA fields
 */
export async function up(knex) {
    const hasTotpEnabled = await knex.schema.hasColumn('user', 'totp_enabled');
    const hasTotpSecret = await knex.schema.hasColumn('user', 'totp_secret');

    if (!hasTotpEnabled) {
        await knex.schema.table('user', (table) => {
            table.integer('totp_enabled').notNullable().defaultTo(0);
        });
    }

    if (!hasTotpSecret) {
        await knex.schema.table('user', (table) => {
            table.string('totp_secret', 255).notNullable().defaultTo('');
        });
    }
}

export async function down(knex) {
    const hasTotpEnabled = await knex.schema.hasColumn('user', 'totp_enabled');
    const hasTotpSecret = await knex.schema.hasColumn('user', 'totp_secret');

    if (hasTotpSecret) {
        await knex.schema.table('user', (table) => {
            table.dropColumn('totp_secret');
        });
    }

    if (hasTotpEnabled) {
        await knex.schema.table('user', (table) => {
            table.dropColumn('totp_enabled');
        });
    }
}
