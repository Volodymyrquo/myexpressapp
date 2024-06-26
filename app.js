const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');
const NodeCache = require('node-cache')
const bcrypt = require('bcrypt')
const {authenticateToken, generateToken} = require('./security')
const prisma = new PrismaClient();
const cache = new NodeCache();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});



app.get('/users/:id', async (req, res) => {
    const { id } = req.params;
    const cachedData = cache.get(id);

    try {
        if(!cachedData){
            const user = await prisma.user.findUnique({
                where: {
                    id: Number(id),
                },
            });
            if (user) {
                cache.set(user.id,user,60)

                res.status(200).json(user);
            } else {
                res.status(404).json({ message: 'Користувача не знайдено' });
            }
        } else {
            res.status(200).json(cachedData);
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/users', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    try {
        const users = await prisma.user.findMany();
        const usersSlice = users.slice(startIndex, endIndex);
        res.json(usersSlice);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/books', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    try {
        const books = await prisma.user.findMany();
        const booksSlice = books.slice(startIndex, endIndex);
        res.json(booksSlice);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

const userSchema = Joi.object({
    name: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password:Joi.string()
});

app.post('/users',authenticateToken, async (req, res) => {
    const userData = req.body;
    const { value, error } = userSchema.validate(userData);
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    const { name, email } = value;
    try {
        const user = await prisma.user.create({
            data: {
                name,
                email,
            },
        });
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/users/:id',authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.delete({
            where: {
                id: parseInt(id),
            },
        });
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/users/:id',authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;
    try {
        const user = await prisma.user.update({
            where: {
                id: Number(id),
            },
            data: {
                name,
                email,
            },
        });
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/',authenticateToken, (req, res) => {
    res.send('Welcome to my Express App!');
});

app.get('/status',authenticateToken,(req,res)=>{
    res.status(200).send('Server is working')
})

app.post('/register', async (req,res)=>{
    const userData = req.body;
    const { value, error } = userSchema.validate(userData);
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    const {password, name, email} = value;
    try {
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        await prisma.user.create({
            data:{
                email,
               hashedPassword,
                name
            }
        })

        res.status(200).send("User was created")
    } catch (error) {
        res.status(500).json({ error: err.message });
    }
})

app.post('/login',async(req,res)=>{
    const {email, password}= req.body;
    try {
        const user = await prisma.user.findUnique({
            where:{
                email
            }
        })
        if(!user){
            return res.status(401).send("No user found");
        }
        const isValid = await bcrypt.compare(password,user.hashedPassword);
        if(!isValid){
            return res.status(401).send("Invalid password");
        }
       const token = generateToken(user)
        res.status(200).send({message:"Login successful", token})
    } catch (error) {
        res.status(500).send("Login error");
        console.log(error)
 
    }
})
app.get('/profile',authenticateToken, async (req,res)=>{
    if(req.user){
        res.send(`Hi, ${req.user.username}`)
    } else {res.send("Please log in")}
})
app.post('/change-password',authenticateToken,async(req,res)=>{
    const {email, password,newPassword}= req.body;
    try {
        const user = await prisma.user.findUnique({
            where:{
                email
            }
        })
        if(!user){
            return res.status(401).send("No user found");
        }
        const isValid =  bcrypt.compare(password,user.hashedPassword);

        if(!isValid){
            return res.status(401).send("Invalid password");
        }
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newPassword, salt)
        await prisma.user.update({
            where:{
                email,
            },
            data:{
                hashedPassword,
                }
        })
        res.status(200).send("Password changed successfully")
    } catch (error) {
        res.status(500).send("Change password error");
        console.log(error)
 
    }
})

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Example app listening at http://localhost:${PORT}`);
    });
}

module.exports = app;
