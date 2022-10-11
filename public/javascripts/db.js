const mysql = require('mysql')
const db_info = {
    host : 'localhost',
    port : '3306',
    user : 'root',
    password : '@ahtmxmwpem12',
    database : 'Service'
}

module.exports = {
    init : function() {
        return mysql.createConnection(db_info);
    },
    connect : (conn) => {
        conn.connect((err) => {
            if(err) console.error('mysql connection error!');
            else console.log('mysql is connected successfully!');
        });
    }
}