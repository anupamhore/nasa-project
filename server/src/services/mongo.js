const mongoose = require('mongoose');

require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL;

mongoose.connection.once('open',()=>{
    console.log('Mongo DB Connection ready!')
});

mongoose.connection.on('error',(err)=>{
    console.error(err)
})

async function mongoConnect(){
    await mongoose.connect(MONGO_URL)
}

async function mongoDisconnect(){
    setTimeout(async() => {
        await mongoose.disconnect();
    }, 1500);
    
}

module.exports = {
    mongoConnect,
    mongoDisconnect
}
