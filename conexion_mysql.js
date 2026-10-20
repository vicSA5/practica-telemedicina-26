const mysql = require('mysql');
const database = {
    host : 'localhost',
    user : 'victor',
    password : '1234',
    database : 'telemedicina2026'
};

const bd = mysql.createConnection(database);

bd.connect(function (err) {
    if (err) {
        console.error('Error en la conexión de la base de datos:',err);
        process.exit();
    }
});

module.exports = bd;