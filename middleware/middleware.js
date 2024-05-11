var jsend = require('jsend');
const fs = require('fs');
const path = require('path');

const basicAuth = async (req, res, next) => {
    // Get the Authorization header
    const authHeader = req.headers.authorization;
    var validUsername, validPassword;

    // Check if the header exists and starts with 'Basic'
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).jsend.fail('Unauthorized');
    }

    try{
         // Retrieve username and password from the parsed credentials
        const credentialsFilePath = path.join(__dirname, '..', 'credentials.json');
        const jsonData = await fs.promises.readFile(credentialsFilePath);
         var validCredentials = JSON.parse(jsonData);
         validUsername = validCredentials.username;
         validPassword = validCredentials.password;
    }catch(error){
        console.error('Error reading credentials file:', error);
        return res.status(500).jsend.fail('Internal Server Error');
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [username, password] = credentials.split(':');

    if (username === validUsername && password === validPassword) {
        console.log("Valid login credentials")
        return next();
    } else {
        return res.status(401).jsend.fail('Unauthorized');
    }
};

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

module.exports = basicAuth;