const express = require('express')
const app = express()
const path = require('path')
const fetch = require('node-fetch')
const fs = require('fs');
const readline = require("readline");
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

const key = 'afdc4f8bad1a71f008d1c53bb6d0cb56'

const getWeatherDataPromise = (url) => {
	return new Promise((resolve, reject) => {
		fetch(url)
			.then(response => {
				return response.json()
			})
			.then(data => {
				let description = data.weather[0].description
				let city = data.name
				let temp = Math.round(parseFloat(data.main.temp) - 273.15)
				let result = {
					description: description,
					city: city,
					temp: temp,
					error: null
				}
				resolve(result)
			})
			.catch(error => {
				reject(error)
			})
	})
}

app.all('/', function (req, res) {
	let city
	if (req.method == 'GET') {
		city = 'Tartu'
	}
	if (req.method == 'POST') {
		city = req.body.cityname
		log("city", city, req.headers['x-forwarded-for'] || req.socket.remoteAddress);
	}
	let url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}`
	getWeatherDataPromise(url)
		.then(data => {
			res.render('index', data)
		})
		.catch(error => {
			res.render('index', { error: 'Problem with getting data, try again' })
		})
})

function log(eventName, extraData, userIp) {

	// Create timestamp
	const timeStamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')

	// Parse extraData and eventName to JSON and escape the delimiter with backslash
	extraData = JSON.stringify(extraData).replace(/　/g, '\\　');

	// trim only quotes from extraData
	extraData = extraData.replace(/^"(.*)"$/, '$1');

	// Write to file
	fs.appendFile('./log.txt', timeStamp + '　' + userIp + '　' + eventName + '　' + extraData + ' \r\n', function (err) {
		if (err) throw err;
	});
}
app.get('/logs', async (req, res) => {
	// Read the log file
	const lines = [];
	const lineReader = readline.createInterface({
		input: fs.createReadStream('./log.txt'), crlfDelay: Infinity
	});

	// Parse the log file
	for await (const line of lineReader) {

		// Split the line into array with '　' as delimiter, except when the delimiter is escaped with backslash
		const fields = line.match(/(\\.|[^　])+/g)

		// Iterate over result
		for (let i = 0; i < fields.length; i++) {

			// Remove backslash from escaped '　'
			fields[i] = fields[i].replace(/\\/g, '');
		}

		// Add the line to the lines array
		lines.push({
			timeStamp: fields[0], userIp: fields[1], eventName: fields[2], extraData: fields[3]
		});
	}

	// Return the lines array
	return res.send(lines);
});

app.listen(process.env.PORT || 3000)