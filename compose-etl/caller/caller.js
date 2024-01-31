const express = require('express')
const app = express()
const axios = require('axios')

// .env is generally used for env vars in an application. However, when using compose, a common .env in the top level 
// folder is used to enable all env vars to be kept in one place for ease of maintenence and security.
// Compose will reference the .env for each of the service it is building so don't need it in this file.
// However, when running the code in vscode, we don't use compose so need to either reference .env in the higher
// directory (../.env) then comment it out in this file when using compose (or let if fail to find .env) or, as I have 
// done here, simply add default env vars needed to run standalone using || default_val. E.g., env var ETL_PORT will not 
// be found if not using compose so it's default value will be used just for local testing and debugging in vscode.
// This approach enables the code to run in vscode for debugging, local containers for testing and remote containers 
// in prod with no code changes needed. The require is shown below if that approach is preferred.
// require('dotenv').config({debug:true, path: '../.env'})  // Use debug if env vars are not being loaded for some reason

app.use(express.urlencoded({ extended: false })) // use this for standard text post from a form using application/x-www-form-urlencoded

// Note, these are initialised by docker compose so if not using containers, need a fallback port as in ||
const PORT = process.env.CALLER_PORT || 3002  // Set as env var in docker compose to keep them all in one place
const ETL_PORT = process.env.ETL_PORT || 3001 // Need to make sure this is in the caller environment vars in compose
const ETL_CONT_SERVICE = process.env.ETL_CONT_SERVICE || 'localhost'

// Get the load table html file to enable the user to specify the table and filename
app.get('/', (req, res) => {
  res.sendFile('read_table.html', { root: __dirname })
})

// Route calls the etl service and passes the posted table name to get the data from 
app.post('/read-table', async (req, res) => {
  try {
    const response = await axios.get(`http://${ETL_CONT_SERVICE}:${ETL_PORT}/data/${req.body.table}`)
    res.send(response.data)
  } catch (err) {
    res.send(err)
  }
})

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))




