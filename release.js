// release.js
const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

// Function to execute shell commands synchronously
const executeCommand = (command) => {
  try {
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
};

// Function to increment the version
const incrementVersion = (version) => {
  const [vPartVersion, vPartRC, ...vPartRest] = version.split('-');
  const [rcText, rcVersion, ...rcRest] = vPartRC.split('.');
  const newRCVersion = parseInt(rcVersion) + 1;
  const rcString = `${rcText}.${newRCVersion}${rcRest.length ? `.${rcRest.join('.')}` : ''}`;
  return `${vPartVersion}-${rcString}-${vPartRest.join('.')}`;
};

// Function to prompt user for input
const promptInput = (question, defaultValue) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (${defaultValue}): `, (answer) => {
      rl.close();
      resolve(answer || defaultValue);
    });
  });
};

async function main() {
  // Read the npm package version
  const packageVersion = process.env.npm_package_version;
  if (!packageVersion) {
    console.error('npm package version not found.');
    process.exit(1);
  }

  // Ask the user for a version (with a default of the package version incremented)
  const newVersion = await promptInput('Enter the new version', incrementVersion(packageVersion));

  // Update package.json with the new version
  const packageJsonPath = './package.json';
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`Updated package.json with version ${newVersion}`);
  } catch (error) {
    console.error('Error updating package.json:', error);
    process.exit(1);
  }

  // Ask the user for a commit message
  const commitMessage = await promptInput(
    'Enter a commit message',
    `Release version ${newVersion}`,
  );

  // Commit all changes
  executeCommand('git add .');
  executeCommand(`git commit -m "${commitMessage}"`);

  // Push the changes to the repo
  executeCommand('git push origin master');

  // Create a tag with the new version
  executeCommand(`git tag v${newVersion}`);

  // Push the new tag to the repo
  executeCommand(`git push origin v${newVersion}`);
}

main().catch(console.error);
