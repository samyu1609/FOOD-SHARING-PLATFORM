import express from 'express';

const app = express();
app.use(express.json());

app.post('/addFood', (req, res) => {
  try {
    const user = null; // simulating what protect does if user not found
    if (user.role !== 'donor') {
      return res.status(403).json({ message: 'Only donors can add food' });
    }
    res.json({ message: 'Success' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(5001, async () => {
  const axios = (await import('axios')).default;
  try {
    const res = await axios.post('http://localhost:5001/addFood');
    console.log(res.data);
  } catch (err) {
    console.log(err.response.status, err.response.data);
  }
  process.exit(0);
});
