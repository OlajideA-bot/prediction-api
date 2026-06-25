'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../data/store');
const auth = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'prediction_dev_secret';
const SALT_ROUNDS = 10;

function paginate(list, page, pageSize) {
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
}

function parsePageParams(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const page_size = Math.max(1, parseInt(query.page_size, 10) || 10);
  return { page, page_size };
}

// POST /api/prediction/create/user/
router.post('/create/user/', async (req, res) => {
  const { number, pin, confirm_pin } = req.body;

  if (!number || !pin || !confirm_pin) {
    return res.status(400).json({ error: 'number, pin, and confirm_pin are required' });
  }
  if (pin !== confirm_pin) {
    return res.status(400).json({ error: 'pin and confirm_pin do not match' });
  }
  if (store.findUserByNumber(number)) {
    return res.status(400).json({ error: 'A user with this number already exists' });
  }

  const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
  const id = store.nextId();
  const user = { id, number, pinHash, createdAt: new Date().toISOString() };
  store.users.push(user);

  return res.status(200).json({
    message: 'User created successfully',
    number: user.number,
    id: user.id,
  });
});

// POST /api/prediction/login/user/
router.post('/login/user/', async (req, res) => {
  const { number, pin } = req.body;

  if (!number || !pin) {
    return res.status(400).json({ error: 'number and pin are required' });
  }

  const user = store.findUserByNumber(number);
  if (!user) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(pin, user.pinHash);
  if (!match) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, number: user.number }, JWT_SECRET, { expiresIn: '7d' });

  return res.status(200).json({ message: 'Login successful', token });
});

// POST /api/prediction/change/password/
router.post('/change/password/', auth, async (req, res) => {
  const { old_pin, new_pin } = req.body;

  if (!old_pin || !new_pin) {
    return res.status(400).json({ error: 'old_pin and new_pin are required' });
  }

  const user = store.findUserById(req.user.id);
  const match = await bcrypt.compare(old_pin, user.pinHash);
  if (!match) {
    return res.status(400).json({ error: 'Old PIN is incorrect' });
  }

  user.pinHash = await bcrypt.hash(new_pin, SALT_ROUNDS);

  return res.status(200).json({ message: 'Password changed successfully' });
});

// POST /api/prediction/forgot/password/
router.post('/forgot/password/', (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({ error: 'phone_number is required' });
  }

  const user = store.findUserByNumber(phone_number);
  if (user) {
    const reset_code = String(Math.floor(100000 + Math.random() * 900000));
    return res.status(200).json({
      message: 'Reset code generated. Use it to reset your password.',
      reset_code,
    });
  }

  return res.status(200).json({ message: 'If an account with that number exists, a reset code has been sent.' });
});

// POST /api/prediction/reset/password/
router.post('/reset/password/', async (req, res) => {
  const { phone_number, pin } = req.body;

  if (!phone_number || !pin) {
    return res.status(400).json({ error: 'phone_number and pin are required' });
  }

  const user = store.findUserByNumber(phone_number);
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  user.pinHash = await bcrypt.hash(pin, SALT_ROUNDS);

  return res.status(200).json({ message: 'Password reset successfully' });
});

// POST /api/prediction/update/password/
router.post('/update/password/', async (req, res) => {
  const { number, pin, confirm_pin } = req.body;

  if (!number || !pin || !confirm_pin) {
    return res.status(400).json({ error: 'number, pin, and confirm_pin are required' });
  }
  if (pin !== confirm_pin) {
    return res.status(400).json({ error: 'pin and confirm_pin do not match' });
  }

  const user = store.findUserByNumber(number);
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  user.pinHash = await bcrypt.hash(pin, SALT_ROUNDS);

  return res.status(200).json({ message: 'Password updated successfully' });
});

// GET /api/prediction/general/
router.get('/general/', (req, res) => {
  const { search } = req.query;
  const { page, page_size } = parsePageParams(req.query);

  let list = store.generalPredictions;
  if (search) {
    const term = search.toLowerCase();
    list = list.filter(
      p => p.home_team.toLowerCase().includes(term) || p.away_team.toLowerCase().includes(term)
    );
  }

  const count = list.length;
  const items = paginate(list, page, page_size);

  return res.status(200).json({ items, count });
});

// GET /api/prediction/general/today/
router.get('/general/today/', auth, (req, res) => {
  const { search } = req.query;
  const { page, page_size } = parsePageParams(req.query);

  const todayStr = new Date().toISOString().slice(0, 10);
  let list = store.generalPredictions.filter(p => p.date_time === todayStr);

  if (search) {
    const term = search.toLowerCase();
    list = list.filter(
      p => p.home_team.toLowerCase().includes(term) || p.away_team.toLowerCase().includes(term)
    );
  }

  const count = list.length;
  const rawItems = paginate(list, page, page_size);
  const items = rawItems.map(({ game_id, home_team, away_team, prediction, is_finished, date, date_created, date_time, prediction_probability }) => ({
    game_id, home_team, away_team, prediction, is_finished, date, date_created, date_time, prediction_probability,
  }));

  return res.status(200).json({ items, count });
});

// GET /api/prediction/general/vip/
router.get('/general/vip/', auth, (req, res) => {
  const { search } = req.query;
  const { page, page_size } = parsePageParams(req.query);

  let list = store.vipPredictions;
  if (search) {
    const term = search.toLowerCase();
    list = list.filter(
      p =>
        p.home_name.toLowerCase().includes(term) ||
        p.away_name.toLowerCase().includes(term) ||
        p.competition_name.toLowerCase().includes(term)
    );
  }

  const count = list.length;
  const items = paginate(list, page, page_size);

  return res.status(200).json({ items, count });
});

// GET /api/prediction/accumulator/
router.get('/accumulator/', auth, (req, res) => {
  const { search } = req.query;
  const { page, page_size } = parsePageParams(req.query);

  let list = store.accumulator;
  if (search) {
    const term = search.toLowerCase();
    list = list.filter(
      p =>
        p.home_name.toLowerCase().includes(term) ||
        p.away_name.toLowerCase().includes(term) ||
        p.competition_name.toLowerCase().includes(term)
    );
  }

  const count = list.length;
  const items = paginate(list, page, page_size);

  return res.status(200).json({ items, count });
});

// GET /api/prediction/bet_of_day/
router.get('/bet_of_day/', auth, (req, res) => {
  return res.status(200).json({
    message: 'Bet of the day retrieved successfully',
    data: store.betOfDay,
  });
});

module.exports = router;
