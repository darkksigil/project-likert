const bcrypt = require('bcrypt');
bcrypt.hash('password', 10).then(h => console.log(h));