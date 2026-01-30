require('dotenv').config();

module.exports = {
    development: {
        username: 'postgres',
        password: 'postgres',
        database: 'fire',
        host: 'localhost',
        port: 5432,
        dialect: 'postgres',
    },
};
