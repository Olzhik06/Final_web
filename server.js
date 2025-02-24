require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require("mongodb");
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
const db = client.db("final_exam_db");
const app = express();
const PORT = 3000;

mongoose.connect('mongodb://localhost:27017/final_exam_db', { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
});
const User = mongoose.model('User', UserSchema);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: '6a830975069bdebc25d2c759f4f64f31568b739cb059c9eb8a2e1e2d2a848e45', resave: false, saveUninitialized: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({ username: req.body.username, password: hashedPassword });
    await user.save();
    res.redirect('/');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await db.collection('users').findOne({ username });

    if (!user) {
        return res.send('User not found');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.send('Invalid password');
    }
    req.session.user = { username: user.username };
    res.redirect('/dashboard');
});


app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('dashboard', { user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const QRCode = require('qrcode');
app.get('/qr-code', (req, res) => {
    res.render('qr-code', { qrImage: null });
});

app.post('/generate-qr', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.send("Enter text!");

    try {
        const qrImage = await QRCode.toDataURL(text);
        res.render('qr-code', { qrImage });
    } catch (err) {
        console.error("Error when generating QR code:", err);
        res.send("Error creating QR code");
    }
});


const nodemailer = require('nodemailer');

app.get('/nodemailer', (req, res) => res.render('nodemailer'));
app.post('/send-email', async (req, res) => {
    const { to, subject, text } = req.body;

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: "olzaskarabekov71@gmail.com", pass: "rdrs vfhb uhol lpny" }
    });

    let info = await transporter.sendMail({ from: "olzaskarabekov71@gmail.com", to, subject, text });
    res.send("\n" + "Email sent: " + info.response);
});

app.get('/bmi', (req, res) => {
    res.render('bmi', { bmi: null, error: null });
});

app.post('/bmi', (req, res) => {
    let { weight, height } = req.body;
    if (!weight || !height) {
        return res.render('bmi', { bmi: null, error: "Enter weight and height" });
    }
    let bmi = (weight / ((height / 100) ** 2)).toFixed(2);
    res.render('bmi', { bmi, error: null });
});

app.get('/weather', (req, res) => {
    res.render('weather', { weather: null, error: null });
});
const axios = require('axios');

app.post('/weather', async (req, res) => {
    const apiKey = process.env.API_KEY;
    const city = req.body.city;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.cod === 200) {
                return res.render('weather', { weather: data });
            }
            return res.render('weather', { weather: null, error: '\n' + 'City not found!' });
        })
        .catch(error => {
            console.error('Request Error:', error);
            return res.render('weather', { weather: null, error: '\n' + 'Server error!' });
        });
    try {
        const response = await axios.get(url);
        res.render('weather', { weather: response.data, error: null });
    } catch (error) {
        res.render('weather', { weather: null, error: 'City not found!' });
    }
});


app.get('/crud', async (req, res) => {
    const items = await db.collection('items').find().toArray();
    res.render('crud', { items });
});

app.post("/add", async (req, res) => {
    await db.collection("items").insertOne({ name: req.body.name });
    res.redirect("/crud");
});

app.post("/edit/:id", async (req, res) => {
    await db.collection("items").updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { name: req.body.newName } }
    );
    res.redirect("/crud");
});

app.post("/delete/:id", async (req, res) => {
    await db.collection("items").deleteOne({ _id: new ObjectId(req.params.id) });
    res.redirect("/crud");
});

app.listen(PORT, () => {
    console.log(`The server is running on http://localhost:${PORT}`);
});
