const fs = require('fs')
const Ftp = require('ftp')
const csv = require('fast-csv')
const request = require('request')

const ftp = new Ftp()
ftp.on('ready', () => {
    console.log('Ftp connected')
})

ftp.connect({
	host: "feeds.futonland.com",
	port: 21,
	user: "constructorio",
	password: "XFSrd0UFZSzG"
});