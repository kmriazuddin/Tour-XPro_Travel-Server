const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    const paymentCollection = client.db("tourPackages").collection("payments");

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
    app.post('/users', async (req, res) => {
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

    // Packages Data Insert a Add Tour Package
    app.post('/packages', verifyToken, verifyAdmin, async(req, res) => {
      const tourItem = req.body;
      const result = await packagesCollection.insertOne(tourItem);
      res.send(result);
    });

    // Delete Booking
    app.delete('/packages/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await packagesCollection.deleteOne(query);
      res.send(result);
    });

    // Booking Data Update
    app.get('/packages/:id', async (req, res) => {
      const id = req.params.id;
      const result = await packagesCollection.findOne({_id: id});
      res.send(result);
    });

    // Booking Data Update
    app.patch('/packages/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = {_id: id}
      const updateDoc = {
        $set: {
          tourName: item.tourName,
          tourType: item.tourType,
          price: item.price,
          details: item.details,
          rating: item.rating,
          image: item.image
        }
      }
      const result = await packagesCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    ///////////////
    // 
    app.get('/packages', async (req, res) => {
      const cursor = packagesCollection.find();
      const result = await cursor.toArray()
      res.send(result);
    });

    // Create Booking
    app.post('/packages', async (req, res) => {
      const services = req.body;
      const result = await packagesCollection.insertOne(services);
      res.send(result);
    });

    // Booking Delete
    app.delete('/cancel-booking/:bookingId', async (req, res) => {
      const id = req.params.bookingId;
      const query = {
        _id: new ObjectId(id)
      };
      const result = await packagesCollection.deleteOne(query);
      res.send(result);
    });

    // 
    app.get('/packages', verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log('Token Owner Info', req.user);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await packagesCollection.find(query).toArray();
      res.send(result);
    });

    // ***
    // Payment Intent
    app.post('/create-payment-intent', async(req, res) => {
      const {price} = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'Amount Inside The Intent');

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      });
    });

    // Payment History Save
    app.post('/payments', async(req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      // Carefully Delete Each Item From The Cart
      console.log('Payment Info', payment);
      const query = {_id: {
        $in: payment.cartIds.map(id => new ObjectId(id))
      }}
      const deleteResult = await paymentCollection.deleteMany(query);
      res.send({paymentResult, deleteResult});
    });

    // Display The Payment History
    app.get('/payments/:email', verifyToken, async(req, res) => {
      const query = {email: req.params.email}
      console.log(query);
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({message: 'Forbidden Access'});
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    // Stats Or Analytics
    app.get('/admin-stats',  async(req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const menuItems = await bookingCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();
      // Total Revenue
      const result = await paymentCollection.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: '$price'
            }
          }
        }
      ]).toArray();
      const revenue = result.length > 0 ? result[0].totalRevenue : 0;
      res.send({users, menuItems, orders, revenue});
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