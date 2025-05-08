const axios = require('axios');

const BASE_URL = "https://api.rugcheck.xyz/v1";

/**
 * @typedef {Object} Risk
 * @property {string} name
 * @property {string} level
 * @property {string} description
 * @property {number} score
 */

/**
 * @typedef {Object} TokenCheck
 * @property {string} tokenProgram
 * @property {string} tokenType
 * @property {Risk[]} risks
 * @property {number} score
 */

/**
 * Fetches a summary report for a specific token.
 * @param {string} mint - The mint address of the token.
 * @returns {Promise<TokenCheck>}
 */
async function fetchTokenReportSummary(mint) {
  try {
    const { data } = await axios.get(`${BASE_URL}/tokens/${mint}/report/summary`);
    return data;
  } catch (error) {
    console.error(`Error fetching report summary for token ${mint}:`, error.message);
    throw new Error(`Failed to fetch report summary for token ${mint}.`);
  }
}

/**
 * Fetches a detailed report for a specific token.
 * @param {string} mint - The mint address of the token.
 * @returns {Promise<TokenCheck>}
 */
async function fetchTokenDetailedReport(mint) {
  try {
    const { data } = await axios.get(`${BASE_URL}/tokens/${mint}/report`);
    return data;
  } catch (error) {
    console.error(`Error fetching detailed report for token ${mint}:`, error.message);
    throw new Error(`Failed to fetch detailed report for token ${mint}.`);
  }
}

module.exports = {
  fetchTokenReportSummary,
  fetchTokenDetailedReport,
};
