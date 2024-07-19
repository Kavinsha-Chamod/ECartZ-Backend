const express = require('express');
const bodyParser = require('body-parser');
const UserRoutes = require('./routes/UserRoutes');

const app = express();
const port = 4000;

app.use(bodyParser.json());

app.use('/users', UserRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
