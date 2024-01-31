const mongoose = require('mongoose')
const fs = require('fs').promises  // File system package now has promise built-in on request

// Can test the mongo database container from vs code by connecting to the container port at localhost
const DB_NAME = process.env.MONGO_DB_NAME || 'triv'
const MONGO_HOST = process.env.MONGO_HOST || 'localhost' // Local host just for testing. Use seervice name when etl is in a container
const MONGO_PORT = process.env.MONGO_PORT || 4004        // Use 4004 for container, or 27017 for local mongodb when debugging in vscode

const trivSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  }
})

mongoose.connect(`mongodb://${MONGO_HOST}:${MONGO_PORT}/${DB_NAME}`) // Connection string
const db = mongoose.connection

// Register mongoose events using on(). This registers connection error and executes the callback if triggered. Could register 'connected' too
db.on('error', (error) => {
  console.log(`Failed to connect to mongo database: ${DB_NAME}. Error: ${error.message}`)
  throw error
})

// .once registers a listener like on, but once triggered, it unregisters it. The 'open' event is triggered when the connection to mongo is opened sucessfully
db.once('open', (res) =>
  console.log(`Connected to Mongo database: ${DB_NAME} at ${MONGO_HOST}:${MONGO_PORT}`))


async function getData(collectionName) {
  // model - creates a javascript object we work with and Mongoose checks against the schema and reads / writes the collection mapping to document atttributes
  //const trivModel = mongoose.model('question', trivSchema) // Expects to find a collection called questions - i.e. plural
  const collection = mongoose.model(`${collectionName}`, trivSchema)
  try {
    const questions = await collection.find() // Get all of them
    if (questions.length == 0) throw ('Not found')
    else
      return questions
  } catch (err) {
    throw (err)
  }
}

async function dropTable(collectionName) {
  try {
    const collection = mongoose.model(`${collectionName}`, trivSchema)
    let result = await collection.collection.drop()
    return false // as in no error
  } catch (err) {
    throw (err)
  }
}

// This is a function stub just to avoid changing the calling program
// It does nothnig as there is no need to explicitly create a collection as one is
// created when data is saved to it if it doesn't exist
async function createTable(tableName) {
  return true
}

// Note: this function looks for tabs between Q and A and CR for end of question
// so last question in the data file must end with a CR 
async function etl(collectionName, filename) {
  const data = await fs.readFile(filename, "binary") // Uses built-in promise
  const collection = mongoose.model(`${collectionName}`, trivSchema)
  let question = ''
  let answer = ''
  let isQuestion = true // Determine if reading a q or a
  let qArr = []         // Build up the extracted questions
  let ansArr = []       // Build up the extracted answers
  const TAB = '\t'  // Tab char delimiter for question
  const CR = '\r'   // Carriage return delimiter for answer
  const LF = '\n'   // Line Feed
  let docArray = [] // Add all the q and a objects to the array

  // Extract all questions and answers into arrays. These are tab and oel delimited
  for (let i = 0; i < data.length; i++) {
    if (isQuestion) {
      if (data[i] != TAB) {
        question += data[i]
      } else {
        isQuestion = false
        qArr.push(question)
        question = ''
      }
    } else {
      if (data[i] != CR && data[i] != LF) {
        answer += data[i]
      } else {
        // No need to jump CR as loop will do that
        if (data[i+1] == LF) i++ // But if next is LF, i.e. Windows, need to force a jump
        isQuestion = true
        ansArr.push(answer)
        answer = ''
      }
    }
  }

  //  Create an array of objects
  let i = 0
  while (i < qArr.length) {
    let doc = {}
    doc.question = qArr[i]
    doc.answer = ansArr[i]
    docArray.push(doc)
    i++
  }
  
  try {
    await collection.insertMany(docArray) // Insert the whole array
    return false // as in no error
  } catch (err) {
    throw (err)
  }
}

// Count the documents in the collection
async function countRows(collectionName) {
  try {
    const collection = mongoose.model(`${collectionName}`, trivSchema)
    return await collection.countDocuments() // Return the count
  } catch (err) {
    throw (err)
  }
}

module.exports = {
  getData,
  countRows,
  createTable,
  etl,
  dropTable
}