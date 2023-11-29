const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
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
    const userCollection = client.db("tourPackages").collection("users");
    const overviewCollection = client.db("tourPackages").collection("overview");
    const packagesCollection = client.db("tourPackages").collection("packages");
    const reviewsCollection = client.db("tourPackages").collection("reviews");
    const guideCollection = client.db("tourPackages").collection("guide");
    const bookingCollection = client.db("tourPackages").collection("bookings");

    // MiddleWares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    };

    // Use Verify Admin After VerifyToken
    const verifyAdmin = async(req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message: 'Forbidden Access'});
      }
      next();
    }

    // JWT Related API
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '20h'
      });
      res.send({ token })
    });

    // User Related Api
    app.post('/users', verifyToken, verifyAdmin, async (req, res) => {
      const user = req.body;
      // Insert Email If User Doesn't Exists:
      // You Can Display this Many Ways (1. Email Unique, 2. Upsert, 3. Simple Checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User Already Exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // All Users Display On Admin Dashboard
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // User Delete
    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // User Update Admin Role
    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Admin
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden Access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    // Overview Data Collection
    app.get('/overview', async (req, res) => {
      const result = await overviewCollection.find().toArray();
      res.send(result);
    });

    // Packages Data Collection
    app.get('/packages', async (req, res) => {
      const result = await packagesCollection.find().toArray();
      res.send(result);
    });

    // Guide Data Collection
    app.get('/guide', async (req, res) => {
      const result = await guideCollection.find().toArray();
      res.send(result);
    });

    // Reviews Data Collection
    app.get('/reviews', async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // Booking Collection
    app.post('/bookings', async (req, res) => {
      const bookingItem = req.body;
      const result = await bookingCollection.insertOne(bookingItem);
      res.send(result);
    });

    // Booking Data Display
    app.get('/bookings', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // Booking Data Delete
    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
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