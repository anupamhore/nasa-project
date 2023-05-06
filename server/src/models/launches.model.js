const axios = require('axios');


const launchesDatabase = require('./launches.mongo');
const planets = require('./planets.mongo');

const launches = new Map();
const DEFAULT_FLIGHT_NUMBER = 100;
// let latestFlightNumber = 100;

// const launch = {
//     flightNumber:100,
//     mission:'Kepler Exploration X',
//     rocket:'Explorer IS1',
//     launchDate: new Date('December 27, 2030'),
//     target:'Kepler-442 b',
//     customers:['ZTM','NASA'],
//     upcoming:true,
//     success:true
// }

// launches.set(launch.flightNumber,launch);

async function findLaunch(filter){
    return await launchesDatabase.findOne(filter);
}


async function existsLaunchWithId(launchId){
    return await findLaunch({
        flightNumber:launchId
    });
}

async function getLatesFlightNumber(){

    const latestLaunch = await launchesDatabase
    .findOne()
    .sort('-flightNumber');///sorting descending order
    if(!latestLaunch){
        return DEFAULT_FLIGHT_NUMBER;
    }
    return latestLaunch.flightNumber;
}

async function getAllLaunches(skip, limit){
    //return Array.from(launches.values());
    return await launchesDatabase
    .find({},{'_id':0,'__v':0})//second argument is called 'projection' where we exclude id and version key
    .sort({flightNumber:1}) //ascending for descending use -1
    .skip(skip) //pagination
    .limit(limit); //pagination
}

async function saveLaunch(launch){

   //*** updateOne will add new field @setoninsert in the API response so we use planets.findOneAndUpdate
    await launchesDatabase.findOneAndUpdate({
        flightNumber: launch.flightNumber,
    },launch,{
        upsert: true
    })
}

async function scheduleNewLaunch(launch){

    const planet = await planets.findOne({
        keplerName: launch.target,
     });
  
     if(!planet){
          throw new Error('No matching planet was found');
     }

    const newFlightNumber = await getLatesFlightNumber() + 1;

    const newLaunch = Object.assign(launch,{
        success:true,
        upcoming:true,
        customers:['ZTM','NASA'],
        flightNumber: newFlightNumber,
    });


    await saveLaunch(newLaunch);

}


async function abortLaunchById(launchId){

    const aborted =  await launchesDatabase.updateOne({
        flightNumber:launchId
    },{
        upcoming: false,
        success: false,
    });

    return aborted.modifiedCount === 1;

}


const SPACEX_API = 'https://api.spacexdata.com/v4/launches/query';
async function populateDLaunches(){
   const response = await axios.post(SPACEX_API,{
        query:{},
        options:{
        pagination:false,
        populate:[
            {
                path:'rocket',
                select:{
                    name:1
                }
            },
            {
                path:'payloads',
                select:{
                    customers:1
                }
            }
        ]
        }
    });

    if(response.status != 200){
        console.log('Problem downloading launch data');
        throw new Error('Launch data download failed');
    }
    const launchDocs = response.data.docs;
        for(const launchDoc of launchDocs){
            const payloads = launchDoc['payloads'];
            const customers = payloads.flatMap((payload)=>{
                return payload['customers'];
            })
            const launch = {
                flightNumber: launchDoc['flight_number'],
                mission: launchDoc['name'],
                rocket: launchDoc['rocket']['name'],
                launchDate: launchDoc['date_local'],
                upcoming:launchDoc['upcoming'],
                success:launchDoc['success'],
                customers:customers
            };

             //console.log(`${launch.flightNumber}  ${launch.mission}`);
             await saveLaunch(launch);
             
        }
        console.log('SpaceX data loaded succesfully...')
}

async function loadLaunchData(){

    const isLaunchExist = await findLaunch({
        flightNumber:1,
        mission:'FalconSat',
        rocket:'Falcon 1'
    })

    if(isLaunchExist){
        console.log('Launch data already loaded..')
    }else{
        await populateDLaunches();
    }
 

}

//saveLaunch(launch);


module.exports = {
    getAllLaunches,
    scheduleNewLaunch,
    existsLaunchWithId,
    abortLaunchById,
    loadLaunchData
}