const mongoose = require("mongoose");

const connectDatabase = ()=> {
    mongoose.connect(process.env.DB_URL ,{
    }).then((data) => {
        console.log(`Mongodb is connected to the server data : ${data.connection.host}`);
    })
}

module.exports = connectDatabase;