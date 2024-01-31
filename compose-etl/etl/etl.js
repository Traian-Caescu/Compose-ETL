const databaseFunctions = process.env.DATABASE_FNS_FILENAME || './mysql-database-fns' // './mongo-database-fns'
const dbfn = require(`${databaseFunctions}`) // import all my database functions as an object
const express = require('express')
const app = express()

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

// Note, this is initialised by docker compose so if not using containers, need a fallback port as in ||
// process.env is native to node - not the dotenv packege. dotenv is used to read a .env file and write the values to the envronment
const PORT = process.env.ETL_PORT || 3001 // Set as env var in docker compose to keep them all in one place
const STAGING_AREA = process.env.STAGING_AREA || '../data'


// Used to just check the app is alive
app.get('/', (req, res) => {
  res.send('ETL Service is responding')
})

app.get('/etl/:table/:filename', async (req, res) => {
  try {
    await dbfn.dropTable(req.params.table)
    await dbfn.createTable(req.params.table)
    await dbfn.etl(req.params.table, STAGING_AREA + '/' + req.params.filename)
    let result = await dbfn.countRows(req.params.table)
    res.send(`Added ${result} rows.`)
  } catch (err) {
    res.send(`Failed: ${err.message}`)
  }
})

// Return all data from the table. 
app.get('/data/:table', async (req, res) => {
  try {
    response = await dbfn.getData(req.params.table)
    res.send(response)
  } catch (err) {
    res.send(err)
  }
})

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))




