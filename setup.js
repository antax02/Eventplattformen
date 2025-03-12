const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 Event Platform Setup Script');
console.log('==============================\n');

function runCommand(command) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    return false;
  }
}

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createEnvFile() {
  console.log('\n📝 Setting up environment variables...');
  
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await askQuestion('An .env file already exists. Overwrite it? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Skipping .env file creation.');
      return;
    }
  }

  const sendgridKey = await askQuestion('Enter your SendGrid API key (or press enter to skip): ');
  
  let envContent = '';
  if (sendgridKey) {
    envContent += `SENDGRID_API_KEY=${sendgridKey}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created.');
  
  const functionsEnvPath = path.join(__dirname, 'functions', '.env');
  fs.writeFileSync(functionsEnvPath, envContent);
  console.log('✅ functions/.env file created.');
}

async function setup() {
  try {
    console.log('\n📦 Installing project dependencies...');
    if (!runCommand('npm install')) {
      throw new Error('Failed to install project dependencies');
    }
    
    console.log('\n🔥 Checking Firebase CLI installation...');
    try {
      execSync('firebase --version', { stdio: 'ignore' });
      console.log('✅ Firebase CLI is already installed.');
    } catch (error) {
      console.log('Firebase CLI not found, installing globally...');
      if (!runCommand('npm install -g firebase-tools')) {
        throw new Error('Failed to install Firebase CLI globally');
      }
    }
    
    if (fs.existsSync(path.join(__dirname, 'functions'))) {
      console.log('\n📦 Installing Cloud Functions dependencies...');
      if (!runCommand('cd functions && npm install')) {
        throw new Error('Failed to install Cloud Functions dependencies');
      }
    }
    
    await createEnvFile();
    
    console.log('\n🔑 Checking Firebase login status...');
    let loggedIn = false;
    try {
      execSync('firebase projects:list', { stdio: 'ignore' });
      loggedIn = true;
    } catch (error) {
      console.log('Not logged in to Firebase.');
    }
    
    if (!loggedIn) {
      const shouldLogin = await askQuestion('Would you like to log in to Firebase now? (y/n): ');
      if (shouldLogin.toLowerCase() === 'y') {
        if (!runCommand('firebase login')) {
          throw new Error('Failed to log in to Firebase');
        }
      } else {
        console.log('⚠️ You will need to run "firebase login" before deploying.');
      }
    } else {
      console.log('✅ Already logged in to Firebase.');
    }
    
    console.log('\n🎉 Setup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:');
    console.error(error.message);
    console.log('\nPlease fix the errors and try again.');
    process.exit(1);
  } finally {
    rl.close();
  }
}

setup();