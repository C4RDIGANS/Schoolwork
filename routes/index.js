var express = require('express');
var router = express.Router();
var jsend = require('jsend');
router.use(jsend.middleware);
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
const basicAuth = require('../middleware/middleware');
const fs = require('fs');
const path = require('path');

var participants = [];


/* GET home page. */
router.get('/', basicAuth, function(req, res, next) {
  console.log(JSON.stringify(req.headers));
  res.render('index', { title: 'Express' });
});

router.post('/participants/add', basicAuth, async function(req, res, next) {
  var response = "";
  try {
    const { participant } = req.body;
    var error = await validateInput(participant);
    if(error) return res.status(400).jsend.fail(error)

    participants.push(participant);
    return res.status(201).jsend.success({ message: 'Participant added successfully'});
  } catch (error) {
      response = createFailResponse({"result": error.toString()})
      return res.status(400).jsend.fail(response);
  }
});

router.get('/participants', basicAuth, function(req, res, next) {
  if(participants.length > 0){
    return res.status(200).jsend.success(participants);
  }else{
    return res.status(400).jsend.success("There are no participants");
  }
});

router.get('/participants/details', basicAuth, function(req, res, next) {
  var allPersonalDetails = [];

  participants.forEach(participant => {
    console.log(participant)
    const {firstname, lastname, dob, email} = participant;
    allPersonalDetails.push({firstname, lastname, dob, email})
  });
  if(allPersonalDetails.length > 0){
    return res.status(200).jsend.success(allPersonalDetails);
  }else{
    return res.status(400).jsend.fail("There are no participants");
  }
});

router.get('/participants/details/:email', basicAuth, function(req, res, next) {
var result = null;
  
  participants.forEach(participant => {
    if(participant.email === req.params.email){
      const {firstname, lastname, dob, email} = participant;
      result = {firstname, lastname, dob, email}
    }
  });
  
  if(result){
    return res.status(200).jsend.success(result);
  }else {
    return res.status(404).jsend.fail("Did not find participant with email: "+ req.params.email);
  }
});

router.get('/participants/work/:email', basicAuth, function(req, res, next) {
  var result = null;
  
  participants.forEach(participant => {
    if(participant.email === req.params.email){
      const {companyname, salary, currency} = participant.work;
      result = {companyname, salary, currency}
    }
  });
  
  if(result){
    return res.status(200).jsend.success(result);
  }else {
    return res.status(404).jsend.fail("Did not find participant with email: "+ req.params.email);
  }
});

router.get('/participants/home/:email', basicAuth, function(req, res, next) {
  var result = null;
  
  participants.forEach(participant => {
    if(participant.email === req.params.email){
      const {country, city} = participant.home;
      result = {country, city}
    }
  });
  
  if(result){
    return res.status(200).jsend.success(result);
  }else {
    return res.status(404).jsend.fail("Did not find participant with email: "+ req.params.email);
  }
});

router.delete('/participants/:email', basicAuth, function(req, res, next) {
  var participantToDelete = null;
  
  participants.forEach(participant => {
    if(participant.email === req.params.email){
      participantToDelete = participant;
    }
  });
  var prePushLength = participants.length;
  participants.pop(participantToDelete);
  var postPushLength = participants.length;
  
  if(postPushLength < prePushLength && participants.length != 0){ // If list is shorter after pop, we deleted successfully
    return res.status(200).jsend.success("Successfully deleted participant.");
  }
  else if(participantToDelete == null){
    return res.status(404).jsend.fail("Did not find participant with email: "+ req.params.email);
  }else{
    return res.status(404).jsend.fail("Failed to delete participant");
  }
});

router.put('/participants/:email', basicAuth, function(req, res, next) {
  var result = null;
  
  //TODO One way of doing it: Updating the existing object/participant in the list.
  try {
    var foundParticipant = false;
    if(participants.length == 0){
      return res.status(400).jsend.fail("There are no participants to update")
    }

    for(i = 0; i < participants.length; i++){
      if(participants[i].email === req.params.email){
        if(validateInput(req.body)){
          foundParticipant = true;
          const { participant } = req.body;
          participants[i].firstname = participant.firstname;
          participants[i].lastname = participant.lastname;
          participants[i].dob = participant.dob;
          participants[i].work.companyname = participant.work.companyname;
          participants[i].work.salary = participant.work.salary;
          participants[i].work.currency = participant.work.currency;
          participants[i].home.country = participant.home.country;
          participants[i].home.city = participant.home.city;
          return res.status(200).jsend.success("Successfully updated participant with email " + req.params.email)
        }
      }
    }
    if(!foundParticipant){
      res.status(404).jsend.fail("Did not find participant with email " + req.params.email)
    }
  } catch (error) {
    return res.status(400).jsend.success("Bad request. " + error)
  }
  
//TODO The second way: Popping the original object and an pushing a new one. I.e "update" the whole object.
  // participants.forEach(participant => {
  //   if(participant.email === req.params.email){
  //     result = participant;
  //   }
  // });

  // if(result) {
  //   try{
  //     if(validateInput(req.body)){
  //       participants.pop(result);
  //       participants.push(req.body)
  //       return res.status(200).jsend.success("Successfully updated participant.")
  //     }
  //   }catch(error){
  //     return res.status(400).jsend.fail("TODO ERROR " + error);
  //   }
  // }
});

async function validateInput(participant){
  if (!participant || !participant.email || !participant.firstname || !participant.lastname || !participant.dob ||
    !participant.work.companyname || !participant.work.salary || !participant.work.currency || !participant.home.country || !participant.home.city) {
    return {error: 'Missing required properties in request body'};
  }

  if (!validateName(participant.firstname)) {
    return { error: 'Firstname has invalid characters or is too short.' };
  }

  if (!validateName(participant.lastname)) {
    return { error: 'Lastname has invalid characters or is too short.' };
  } 

  if (!validateEmail(participant.email)) {
    return { error: 'Invalid email format' };
  }

  if (!validateDOB(participant.dob)) {
    return { error: 'Invalid date of birth format. Use YYYY/MM/DD' };
  }

  if (!validateName(participant.work.companyname)) {
    return { error: 'Companyname has invalid characters or is too short.' };
  } 

  if(Number.isNaN(participant.work.salary)){
    return { error: 'Salary is not a valid number.' };
  }

  if(!validateCurrency(participant.work.currency)){
    return { error: 'Currency is not a valid format, please enter format according to ISO 4217.' };
  }

  var countryValidation = await validateCountry(participant.home.country);

  if(!countryValidation){
    return { error: `${participant.home.country} is not a valid country` };
  }

  var cityValidation = await validateCity(participant.home.city, participant.home.country);

  if(!cityValidation){
    return { error: `${participant.home.city} is not a valid city in ${participant.home.country}` };
  }
}

const validateCity = async (city, country) => {
  // Checks for cities in country and then validates if city exists in pre-existing dataset.
  const countries = path.join(__dirname, '../countrydata', 'countries.json');
  const parsedCountries = JSON.parse(fs.readFileSync(countries, 'utf8'));

  const cities = path.join(__dirname, '../countrydata', 'cities.json');
  const parsedCities = JSON.parse(fs.readFileSync(cities, 'utf8'));
  var retrievedCountry = parsedCountries.find(parsedCountry => parsedCountry.name.toUpperCase() === country.toString().toUpperCase())
  
  if(!retrievedCountry){
    console.log("Error finding country")
    return false;
  }

  var countryCode = retrievedCountry.code;
  var allCitiesInCountry = parsedCities.filter((city) => city.country.toUpperCase() === countryCode.toUpperCase());

  if(allCitiesInCountry.some(parsedCity => parsedCity.name.toUpperCase() === city.toString().toUpperCase())){
    return true;
  }
  return false;
}

const validateCountry = async (country) => {
  const countries = path.join(__dirname, '../countrydata', 'countries.json');
  const parsedCountries = JSON.parse(fs.readFileSync(countries, 'utf8'));
  if(parsedCountries.some(parsedCountry => parsedCountry.name.toUpperCase() === country.toString().toUpperCase()) 
  || parsedCountries.some(parsedCountry => parsedCountry.code.toUpperCase() === country.toString().toUpperCase())){
    return true;
  }
  return false;
}

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex do identify invalid email
  return emailRegex.test(email);
};

const validateName = (name) => {
  const nameRegex = /^[a-zA-Z]{2,}$/;
  return nameRegex.test(name);
};

const validateDOB = dob => {
  const dobRegex = /^\d{4}\/\d{2}\/\d{2}$/;
  return dobRegex.test(dob);
};

const validateCurrency = (currency) => {
  const currencyRegex = /^[A-Z]{3}$/;
  return currencyRegex.test(currency);
};


//Response functions
function createSuccessResponse(result){
  const response = {
      status: 'success',
      data: {
          statusCode: 200,
          result: result
      }
  }
  return response;
  }
  
  function createFailResponse(result){
  const response = {
      status: 'fail',
      data: {
          statusCode: 400,
          result: result
      }
  }
  return response;
  }

module.exports = router;
