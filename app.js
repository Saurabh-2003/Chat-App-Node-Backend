const express = require('express');
const bodyParser = require('body-parser');
const middleware = require("./middleware/error.js");
const cors = require('cors');
const user = require('./routes/userRoute');
const message = require('./routes/messageRoute.js');

const app = express();
const fileUpload = require('express-fileupload');

app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(fileUpload());

app.use(cors());
app.use('/api/new', user);
app.use('/api/mes', message);
app.use(middleware);

module.exports = app;