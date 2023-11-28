const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8000;


// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Travel Guide Server Running...')
});



// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c1xkumu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const overviewCollection = client.db("tourPackages").collection("overview");
    const packagesCollection = client.db("tourPackages").collection("packages");
    const reviewsCollection = client.db("tourPackages").collection("reviews");
    const guideCollection = client.db("tourPackages").collection("guide");

    // Overview Data Collection
    app.get('/overview', async(req, res) => {
      const result = await overviewCollection.find().toArray();
      res.send(result);
    });

    // Packages Data Collection
    app.get('/packages', async(req, res) => {
      const result = await packagesCollection.find().toArray();
      res.send(result);
    });

    // Guide Data Collection
    app.get('/guide', async(req, res) => {
      const result = await guideCollection.find().toArray();
      res.send(result);
    });

    // Reviews Data Collection
    app.get('/reviews', async(req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




// Specified Host And Port
app.listen(port, () => {
    console.log(`Travel Guide Server Is Running On Port ${port}`);
})