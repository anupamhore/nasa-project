const {parse} = require('csv-parse');
const fs = require('fs');
const path = require('path');

const planets = require('./planets.mongo');

// const habitablePlanets = [];

function isHabitablePlanet(planet){
    return planet['koi_disposition'] === 'CONFIRMED'
    && planet['koi_insol'] > 0.36 && planet['koi_insol'] < 1.11
    && planet['koi_prad'] < 1.6;
}

function loadPlanets(){

    return new Promise((resolve, reject)=>{

        fs.createReadStream(path.join(__dirname,'..','..','data','kepler_data.csv'))
        .pipe(parse({
            comment:'#',
            columns:true,
        }))
        .on('data',async (data)=>{
            if(isHabitablePlanet(data)){
                // habitablePlanets.push(data);

                //save in mongoDB
                //insert + update = upsert
                savePlanet(data);

            }
        
        })
        .on('error',(err)=>{
            console.log(err);
            reject(err);
        })
        .on('end',async ()=>{
            const countPlanetsFound = (await getAllPlanets()).length;
            console.log(`${countPlanetsFound} habitable planets!!`);
            resolve();
        });
    });
}


async function getAllPlanets() {
    return await planets.find({},{
        '__v':0, //exclude
        '_id':0  //exclude
    });//returns all the planets
}

async function savePlanet(planet){
    try {
            // UPSERT = INSERT + UPDATE
            await planets.updateOne({
                keplerName:planet.kepler_name,// this is the filter operation to check for th kepler name
            },{
                keplerName: planet.kepler_name // if already present this part will not work
            },{
                upsert:true
            });
    } catch (error) {
        console.error(`Could not save planet ${error}`);
    }

}

/*
 Filtering from Mongo DB FIND OPS

 //This will first filter the planet with the name and then it will include only two fields which
 //will be returned from the database
 planets.find({
    keplerName:'Name of the planet'
 },'keplerName another field')

  //This will first filter the planet with the name and then it will include only one fields which
 //will be returned from the database which is another field, putting a "-" in keplerName will exclude it in the list
 planets.find({
    keplerName:'Name of the planet'
 },'-keplerName another field')

 We are creating pipeline
*/

module.exports={
    loadPlanets,
    getAllPlanets,
}