const {
    fetchTokenReportSummary,
    fetchTokenDetailedReport,
  } = require('./tokencheck'); 
  
  const mintAddress = 'HMRh9ksQTe2SXWLxaNTd2u8PTX9mcodUgzedDMaLbonk'; 
  
  async function runTokenCheck() {
    try {
      const summary = await fetchTokenReportSummary(mintAddress);
      console.log('--- Summary Report ---');
      console.log(summary);
  
      const detailed = await fetchTokenDetailedReport(mintAddress);
      console.log('--- Detailed Report ---');
      console.log(detailed);
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
  
  runTokenCheck();
  