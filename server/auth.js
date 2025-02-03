const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const config = require('./config');

// Register a new user
const register = async (username, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
        [username, hashedPassword]
    );
    return result.rows[0];
};

// Log in an existing user
const login = async (username, password) => {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error('Invalid credentials');
    }

    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '1h' });
    return token;
};

module.exports = { register, login };