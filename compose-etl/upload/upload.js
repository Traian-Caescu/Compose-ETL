// Root endpoint serves up an html file as a UI to enter the source data file
// endpoint: /upload saves data posted into this app into a file on the server 
// in a folder called uploads with the sane filename
// Uses multer package to handle multipart post

const express = require('express')
const app = express()
const path = require('path')      // Form reliable absolute paths from parts
const multer = require('multer')  // Handle multi-part upload. i.e. files and data
const axios = require('axios')
//require('dotenv').config({path: './.env'})        // Pull in the env vars
app.use(express.urlencoded({ extended: false })) // use this for standard text post from a form using application/x-www-form-urlencoded

// Note, this is initialised by docker compose so if not using containers, need a fallback port as in ||
const ETL_PORT = process.env.ETL_PORT || 3001 // Need to make sure this is in the caller environment vars in compose
const ETL_CONT_SERVICE = process.env.ETL_CONT_SERVICE || 'localhost'
const PORT = process.env.UPLOAD_PORT || 3000 // Set as env var in docker compose to keep them all in one place
const STAGING_FOLDER = process.env.STAGING_AREA || '../data' // Get the folder name to avoid fixed file paths

// Quick and dirty - create an upload dir if there isn't one as multer needs one
const fs = require('fs')

console.log(`Staging: ${STAGING_FOLDER}`)
if (!fs.existsSync(STAGING_FOLDER)) {
  fs.mkdirSync(STAGING_FOLDER);
}

//Set up storage for uploaded files - uploads needs to already exist!
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STAGING_FOLDER)
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
})


// Create the multer instance
const upload = multer({ storage: storage })

app.get(['/','/upload'], (req, res) => {
  console.log(`In upload path`)
  res.sendFile('upload.html', { root: __dirname }) // Form to post the file. Needs to be multipart
})

app.get('/load', (req, res) => {
  console.log(`In load path`)
  res.sendFile('load.html', { root: __dirname }) // Form to post the file. Needs to be multipart
})

// Note: 'file' here is the name field value from the form: <input type="file" name="file" required>
app.post('/upload', upload.single('file'), (req, res) => {
  // req has file and other multipart added to it by multer
  res.send(`Sucessful upload: ${req.file.destination}${req.file.filename}`)
})

app.post('/load-table', async (req, res) => {
  console.log(`In load path`)
  try {
    const response = await axios.get(`http://${ETL_CONT_SERVICE}:${ETL_PORT}/etl/${req.body.table}/${req.body.filename}`)
    res.send(response.data)
  } catch (err) {
    res.send(err)
  }
})

app.listen(PORT, () => {
  console.log(`Upload is running on port ${PORT}`)
})