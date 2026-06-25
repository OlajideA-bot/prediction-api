'use strict';

const express = require('express');
const predictionRouter = require('./routes/prediction');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Prediction API is running' });
});

app.use('/api/prediction', predictionRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
