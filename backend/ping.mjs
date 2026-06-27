import axios from 'axios';

console.log('Checking Backend Port 5001...');
axios.get('http://localhost:5001/api/food/available')
  .then(res => console.log('✅ BACKEND IS RUNNING PERFECTLY ON PORT 5001!'))
  .catch(err => {
    console.log('❌ Backend is NOT running on 5001. Error:', err.message);
    
    console.log('\nChecking Backend Port 5000...');
    axios.get('http://localhost:5000/api/food/available')
      .then(res => console.log('⚠️ BACKEND IS RUNNING ON PORT 5000 INSTEAD!'))
      .catch(err => console.log('❌ Backend is NOT running on 5000 either. Error:', err.message));
  });
