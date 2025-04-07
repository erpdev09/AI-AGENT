const cron = require('node-cron');
const { exec } = require('child_process');

// Function to execute the main.js script
const runMainScript = () => {
    console.log('Running main.js script...');
    
    exec('node main.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing main.js: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
};

// Run the main.js script immediately when the cron job starts
runMainScript();

// Schedule the job to run every 3 minutes
cron.schedule('*/3 * * * *', () => {
    console.log('Scheduled task running...');
    runMainScript();
});

console.log('Cron job scheduled to trigger main.js every 3 minutes, and will run immediately on start.');
