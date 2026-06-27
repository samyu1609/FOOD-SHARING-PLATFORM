import axios from 'axios';
import jwt from 'jsonwebtoken';
import FormData from 'form-data';

const token = jwt.sign({ id: '64f0b2f5c1d3a91f58b091a1' }, 'your-secret-key-here-change-in-production', { expiresIn: '30d' }); // Generate fake token

async function test() {
  try {
    const formData = new FormData();
    formData.append('foodType', 'Test');
    formData.append('totalQuantity', 1);
    formData.append('expiryTime', new Date().toISOString());
    formData.append('description', 'Test');
    formData.append('locationName', 'Test');

    const res = await axios.post('http://localhost:5000/api/food/addFood', formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.log('Error:', err.response?.status, err.response?.data);
  }
}

test();
