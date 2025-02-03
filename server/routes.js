const express = require('express');
const auth = require('./auth');

const router = express.Router();

// User registration route
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await auth.register(username, password);
        res.status(201).json({ user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// User login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const token = await auth.login(username, password);
        res.json({ token });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

module.exports = router;