const express = require("express");

const server = express()

server.all("/", (req, res) => {
  res.send("Bot is running!")
})

//Creating the function to keep the bot up

function keepAlive() {
  server.listen(3000, () => {
    console.log("Server is ready.")
  })
}

//Exporting the function to use in `index.js`
module.exports = keepAlive
