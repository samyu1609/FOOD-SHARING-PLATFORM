import axios from 'axios';
import FormData from 'form-data';

async function test() {
  try {
    // 1. Register Donor
    const regRes = await axios.post('http://localhost:5000/api/auth/register', {
      name: 'Test Donor',
      email: 'testdonor@example.com',
      phone: '1234567890',
      password: 'password123',
      role: 'donor',
      subRole: 'Individual'
    });
    console.log('Registered User Role:', regRes.data.role);
    const token = regRes.data.token;

    // 2. Add Food
    const formData = new FormData();
    formData.append('foodType', 'Test Food');
    formData.append('totalQuantity', 10);
    formData.append('expiryTime', new Date(Date.now() + 86400000).toISOString());
    formData.append('description', 'Test desc');
    formData.append('locationName', 'Test Location');

    const foodRes = await axios.post('http://localhost:5000/api/food/addFood', formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Food added successfully:', foodRes.data.message);
  } catch (error) {
    console.error('Error:', error.response?.data?.message || error.message);
  }
}

test();
