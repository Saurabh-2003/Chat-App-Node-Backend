const express = require('express');
const middleware = require("./middleware/error.js");
const cors = require('cors');
const user = require('./routes/userRoute');
const message = require('./routes/messageRoute.js');


const app = express();
app.use(express.json());
app.use(cors());
app.use('/api/new', user);
app.use('/api/mes', message);
app.use(middleware);

module.exports = app;