const express = require('express');
const express_graphql = require('express-graphql');
//const { buildSchema } = require('graphql');
const {
    buildASTSchema
} = require("graphql");
const graphql = require("graphql-tag");
const MongoClient = require("mongodb").MongoClient;

const imdb = require('./imdb');
const DENZEL_IMDB_ID = 'nm0000243';
//Connect to MongoDB Atlas
// TODO: Put ids in env file
const uri = "mongodb+srv://GBZ73:Tiplouf3foulpit@webdevdenzel-c735r.azure.mongodb.net/test?retryWrites=true";
const DATABASE_NAME = "Denzel";

// GraphQL schema
let schema = buildASTSchema(graphql`
    type Query {
        populate: Populate
        getRandom: Movie
        getMovieById(id: String) : Movie
        getMovies(metascore: Int, limit: Int): [Movie]
        AddReview(id: String, review: Review): Movie
    },
    type Movie {
        link: String
        id: String
        metascore: Int
        poster: String
        rating: Float
        synopsis: String
        title: String
        votes: Float
        year: Int
        date: String
        review: String
    },
    type Populate{
        total: String
    },
    input Review{
        date: String
        review: String
    }
`);

// Root resolver
let root = {
    populate: async (source, args) => {
        const movies = await populate(DENZEL_IMDB_ID);
        const insertion = await collection.insertMany(movies);
        return {
            total: insertion.movie.n
        };
    },
    getRandom: async () => {
        let query = {
            "metascore": {
                $gte: 70
            }
        };
        let count = await collection.countDocuments(query);
        let random = Math.floor(Math.random() * count);
        let options = {
            "limit": 1,
            "skip": random
        };
        return await collection.findOne(query, options);
    },
    getMovieById: async (args) => {
        const movie = await collection.findOne({
            "id": args.id
        });
        return movie;
    },
    getMovies: async (args) => {
        let query = {
            "metascore": {
                $gte: args.metascore
            }
        };
        let options = {
            "limit": args.limit,
            "sort": [
                ['metascore', 'desc']
            ]
        };
        return await collection.find(query, options).toArray();
    },
    AddReview: async (args) => {
        let selector = {
            "id": args.id
        };
        let document = {
            $set: args.review
        };
        let options = {
            "upsert": true
        };
        const post = await collection.updateMany(selector, document, options);
        return await collection.findOne(selector);
    }
};

async function populate(actor) {
    try {
        console.log(`📽️  fetching filmography of ${actor}...`);
        return await imdb(actor);
    } catch (e) {
        console.error(e);
    }
}

//Initialise Express Framework
let appGraph = express();
appGraph.use('/graphql', express_graphql({
    schema: schema,
    rootValue: root,
    graphql: true
}));

let database, collection;

appGraph.listen(9292, () => {
    console.log("Running a GraphQL API server at localhost:9292/graphql");
    MongoClient.connect(uri, {
        useNewUrlParser: true
    }, (error, client) => {
        if (error) {
            throw error;
        }
        database = client.db(DATABASE_NAME);
        collection = database.collection("Denzel");
        console.log("Connected to " + DATABASE_NAME + "!");
        console.log("Listening...");
    })
});

// Create an express server and a GraphQL endpoint
let app = express();
app.use('/graphql', express_graphql({
    schema: schema,
    rootValue: root,
    graphql: true
}));
app.listen(4000, () => console.log('Express GraphQL Server Now Running On localhost:4000/graphql'));
