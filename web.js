var express = require('express');
var morgan = require('morgan');
var app = express();
var port = process.env.PORT || 5000;

app.use(morgan('combined'));
app.use('/', express.static(__dirname));
app.listen(port, function() {
    console.log('Server started on ' + port);
});
