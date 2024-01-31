// All database functionality is in here and exported. This enables the database type to be changed and
// only this file needs to change if the function names are kep the same. e.g., decide to use mongo instead of mysql

const mysql = require('mysql2')    // Needs newer mysql package for the version of container used
const fs = require('fs').promises  // File system package now has promise built-in on request

const HOST = process.env.MYSQL_CONTAINER_SERVICE || 'localhost'
const USER = process.env.MYSQL_CONTAINER_USER || 'admin'
const PASSWORD = process.env.MYSQL_CONTAINER_PASSWORD || 'admin' // obviously different for prod
const DATABASE = process.env.MYSQL_CONTAINER_DATABASE || 'triv'
const MYSQL_PORT = process.env.MYSQL_PORT || 3306

let conStr = {
  host: HOST,
  user: USER,
  password: PASSWORD,
  database: DATABASE,
  port: MYSQL_PORT
}

console.log(`Connecting with: `)
console.log(conStr) // to dump whole object, need to list only the object

const db = mysql.createConnection(conStr)

db.connect((err) => {
  if (err) {
    console.log(`Failed to start MySql server`)
    throw(err)
  } else {
    console.log(`Connected to MySQL database: ${conStr.database} at ${conStr.host}:${conStr.port}`)
  }
})


async function getData(table) {
  let sql = `SELECT * FROM ${table}`
  const response = await new Promise((resolve, reject) => {
    db.query(sql, (err, result) => {
      if (err) reject(err.message)
      else resolve(result)
    })
  })
  return response
}
async function countRows(tableName) {
  const sql = `SELECT COUNT(*) FROM ${tableName};`

  const response = await new Promise((resolve, reject) => {
    db.query(sql, (err, result) => {
      if (err) reject(err.message)
      else resolve(result)
    })
  })
  return response[0]['COUNT(*)']
}


async function createTable(tableName) {
  // Recreate during testing. 
  const sql = 'CREATE TABLE ' + tableName + '( \
  `id` INT NOT NULL AUTO_INCREMENT,              \
  `question` TEXT NOT NULL,                      \
  `answer` TEXT NOT NULL,                        \
  PRIMARY KEY (`id`),                            \
  UNIQUE INDEX `id_UNIQUE` (`id` ASC) VISIBLE);'

  const response = await new Promise((resolve, reject) => {
    db.query(sql, (err, result) => {
      if (err) {
        reject(err) // Throws an exception so needs to be caught
      }
      else {
        resolve(`Table '${tableName}' created.`) // Assigned to response
      }
    })
  })
  return response
}


// Note: this function looks for tabs between Q and A and CR for end of question
// so last question in the data file must end with a CR 
async function etl(tableName, filename) {
  const data = await fs.readFile(filename, "binary") // Uses built-in promise
  let question = ''
  let answer = ''
  let isQuestion = true // Determine if reading a q or a
  let qArr = []         // Build up the extracted questions
  let ansArr = []       // Build up the extracted answers
  const TAB = '\t'  // Tab char delimiter for question
  const CR = '\r'  // Carriage return delimiter for answer
  const LF = '\n'   // Line Feed

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

  let sql = `insert into ${tableName} (question, answer) values`
  let i = 0
  while (i < qArr.length - 1) {               // Treat last one differently
    sql += `('${qArr[i]}','${ansArr[i]}'),`
    i++
  }
  sql += `('${qArr[i]}','${ansArr[i]}');` // Don't want a comma on this one

  const result = await new Promise((resolve, reject) => {
    db.query(sql, (err, results) => {
      if (err) {
        reject(`Error in etl function: ${err.message}`)
      } else {
        resolve(`(${results.affectedRows}) rows inserted into "${tableName}" from row ${results.insertId}`)
      }
    })
  })
  return result
}

async function dropTable(tableName) {
  const sql = `DROP TABLE IF EXISTS ${tableName};`

  const response = await new Promise((resolve, reject) => {
    db.query(sql, (err, results) => {
      if (err) {
        reject(`Error in dropTable(): ${err.message}`)
      } else {
        resolve(`"${tableName}" dropped.`)
      }
    })
  })
  return response
}

module.exports = {
  getData,
  countRows,
  createTable,
  etl,
  dropTable
}