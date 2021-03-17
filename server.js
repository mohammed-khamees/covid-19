'use strict';

const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const methodOverride = require('method-override');
const cors = require('cors');

//server setup
const app = express();

//middlewares
require('dotenv').config();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('./public'));
app.set('view engine', 'ejs');

//database setup
// const client = new pg.Client(process.env.DATABASE_URL);

//heroku database setup
const client = new pg.Client({
	connectionString: process.env.DATABASE_URL,
	ssl: { rejectUnauthorized: false },
});

//routes
app.get('/', homeHandler);
app.get('/getCountryResult', getCountryResultHandler);
app.get('/allCountries', allCountriesHandler);
app.post('/myRecords', addMyRecordsHandler);
app.get('/myRecords', myRecordsViewHandler);
app.get('/details/:id', detailsHandler);
app.delete('/details/:id', deleteDetailsHandler);

//handlers
function homeHandler(req, res) {
	let url = 'https://api.covid19api.com/world/total';
	superagent.get(url).then((data) => {
		// res.send(data.body);
		res.render('pages/home', { data: data.body });
	});
}

function getCountryResultHandler(req, res) {
	let { country, from, to } = req.query;
	let url = `https://api.covid19api.com/country/${country}/status/confirmed?from=${from}T00:00:00Z&to=${to}T00:00:00Z`;
	superagent.get(url).then((data) => {
		let countryData = data.body.map((item) => {
			return new Country(item);
		});
		res.render('pages/getCountryResult', { data: countryData });
	});
}

function allCountriesHandler(req, res) {
	let url = `https://api.covid19api.com/summary`;
	superagent.get(url).then((data) => {
		let countriesData = data.body.Countries.map((item) => {
			return new AllCountries(item);
		});
		res.render('pages/allCountries', { data: countriesData });
	});
}

function addMyRecordsHandler(req, res) {
	let { country, totalConfirmed, totalDeaths, totalRecovered, date } = req.body;
	let sql =
		'INSERT INTO countries (country,totalconfirmed,totaldeaths,totalrecovered,date) VALUES ($1,$2,$3,$4,$5);';
	let safeValues = [country, totalConfirmed, totalDeaths, totalRecovered, date];
	client.query(sql, safeValues).then((results) => {
		res.redirect('/myRecords');
	});
}

function myRecordsViewHandler(req, res) {
	let sql = 'SELECT * FROM countries ;';
	client.query(sql).then((results) => {
		res.render('pages/myRecords', { data: results.rows });
	});
}

function detailsHandler(req, res) {
	let id = req.params.id;
	let sql = 'SELECT * FROM countries WHERE id=$1;';
	let value = [id];
	client.query(sql, value).then((results) => {
		res.render('pages/details', { data: results.rows[0] });
	});
}

function deleteDetailsHandler(req, res) {
	let id = req.params.id;
	let sql = 'DELETE FROM countries WHERE id=$1;';
	let value = [id];
	client.query(sql, value).then((results) => {
		res.redirect('/myRecords');
	});
}

//construtors
function Country(data) {
	this.country = data.Country;
	this.date = data.Date;
	this.cases = data.Cases;
}

function AllCountries(data) {
	this.country = data.Country;
	this.totalConfirmed = Number(data.TotalConfirmed) + Number(data.NewConfirmed);
	this.totalDeaths = Number(data.TotalDeaths) + Number(data.NewDeaths);
	this.totalRecovered = Number(data.TotalRecovered) + Number(data.NewRecovered);
	this.date = data.Date;
}

//listening
const PORT = process.env.PORT || 3000;

client.connect().then(() => {
	app.listen(PORT, () => {
		console.log(`listening on PORT ${PORT}`);
	});
});
