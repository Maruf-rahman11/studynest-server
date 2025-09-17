const express = require('express')
const cors = require('cors')
const app = express()
const cookieParser = require('cookie-parser')
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors ());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k7yk1rn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const verifyFireBaseToken = async (req, res, next) => {
	const authHeader = req.headers?.authorization

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).send({ message: 'unauthorized access' })
	}

	const token = authHeader.split(' ')[1]

	try {
		const decoded = await admin.auth().verifyIdToken(token)
		// console.log('decoded token', decoded)
		req.decoded = decoded
		next()
	} catch (error) {
		return res.status(401).send({ message: 'unauthorized access' })
	}
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    

    const coursesCollection = client.db('studynest-web').collection('courses')
    const applicantCollection = client.db('studynest-web').collection('applicants')


    app.post('/courses', async (req, res) => {
      const newCourse = req.body;
      // console.log(newCourse);
      const result = await coursesCollection.insertOne(newCourse);
      res.send(result);
    })
    
    app.post('/applicants', async(req,res)=>{
      const newApplicant = req.body;
      // console.log(newApplicant);
      const result = await applicantCollection.insertOne(newApplicant);
      res.send(result);
    })
    app.get('/applicants',verifyFireBaseToken, async(req,res)=>{
      const email = req.query.email;
      if(email !== req.decoded.email){
        return res.status(403).send({ message: 'forbidden access' })
      }
      
  
      const query = {
        applicant : email
      }
      const result = await applicantCollection.find(query).toArray();
      for(const applicant of result){
        const applicantId = applicant.course_id;
        const applicantQuery = {_id: new ObjectId(applicantId)}
        const course = await coursesCollection.findOne(applicantQuery);
        applicant.course_name =  course?.courseName
        applicant.Course_image = course?.photoURL
        applicant.Course_price = course?.price
        applicant.Course_duration = course?.duration
        

      }
      res.send(result);
    })



    app.get('/courses', async (req,res)=>{
      const email = req.query.email;
      const query = {};
      if(email){
        query.addedBy = email;
      }
      const cursor = coursesCollection.find(query).sort({ createdAt: -1 }); 
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get('/courses/:id', async(req,res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await coursesCollection.findOne(query);
      res.send(result)
    })
    app.delete('/courses/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await coursesCollection.deleteOne(query);
      res.send(result);
  })
    app.delete('/applicants/:id',verifyFireBaseToken, async (req, res) => {
      const courseId = req.params.id;
      const email = req.decoded.email;
      console.log(email)
      const query = { course_id: courseId, applicant: email };
      const result = await applicantCollection.deleteOne(query);
      res.send(result);
  })
    app.patch('/courses/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id) }
      const updateDoc = {
        $set:{
          seats: req.body.seats
        }
      }
      const result= await coursesCollection.updateOne(filter,updateDoc)
      res.send(result);
    } )
    app.put('/courses/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedCourse = req.body;
      const updatedDoc = {
          $set: updatedCourse
      }
      const result = await coursesCollection.updateOne(filter, updatedDoc, options);

      res.send(result);
  })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Hello sohan!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
