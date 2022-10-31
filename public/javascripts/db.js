const mysql = require('mysql')
const db_info = mysql.createConnection({
    host : 'localhost',
    port : '3306',
    user : 'root',
    password : '@Altmxpfl12',
    database : 'Autor'
});
db_info.connect();

module.exports = db_info;