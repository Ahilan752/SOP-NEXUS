import mongoose from 'mongoose';
import { User } from './src/models/User';
import { Department } from './src/models/Department';
import { Role } from './src/models/Role';
import { SOP } from './src/models/SOP';

const inspect = async () => {
  // Read target URI from the running task log or fallback to default
  const uri = 'mongodb://127.0.0.1:21343/local'; 
  console.log('Connecting to URI:', uri);
  
  try {
    await mongoose.connect(uri);
    console.log('\n--- ROLES ---');
    const roles = await Role.find({});
    console.log(JSON.stringify(roles, null, 2));

    console.log('\n--- DEPARTMENTS ---');
    const depts = await Department.find({});
    console.log(JSON.stringify(depts, null, 2));

    console.log('\n--- USERS ---');
    const users = await User.find({}).populate('department');
    console.log(JSON.stringify(users.map(u => ({
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department ? (u.department as any).name : 'None'
    })), null, 2));

    console.log('\n--- SOPS ---');
    const sops = await SOP.find({}).populate('department');
    console.log(JSON.stringify(sops.map(s => ({
      title: s.title,
      department: s.department ? (s.department as any).name : 'None',
      category: s.category
    })), null, 2));

  } catch (err) {
    console.error('Error connecting or reading database:', err);
  } finally {
    await mongoose.disconnect();
  }
};

inspect();
