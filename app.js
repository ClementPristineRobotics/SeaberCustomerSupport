const express = require('express');
const {Client} = require('@notionhq/client');
require('dotenv').config();
const path = require('path');
const app = express();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize the Notion API client
const notion = new Client({auth: process.env.NOTION_API_KEY});
// Define the database IDs as environment variables
const SYMPTOMS_DATABASE_ID = process.env.SYMPTOMS_NOTION_DB_ID;
const CAUSES_DATABASE_ID = process.env.CAUSES_NOTION_DB_ID;
const TREATMENTS_DATABASE_ID = process.env.TREATMENTS_NOTION_DB_ID;

// Define a function to fetch and process data from a Notion database
async function fetchDataFromDatabase(databaseId, extractInfo) {
  const response = await notion.databases.query({database_id: databaseId});
  const data = response.results.map(extractInfo);
  return data;
}
function concatenateTextArray(textArray) {
  return textArray.map((text) => text.text.content).join(' ');
}
// Processes the symptom data
function extractSymptomInfo(symptom) {
  const id = symptom.id;
  // concatenate in name the complete symptom.properties.Detail.title array
  const name = concatenateTextArray(symptom.properties.Name.title);
  const causesIds = symptom.properties.Causes.relation.map((cause) => cause.id);
  const category = symptom.properties.Category.select.name;
  const description = symptom.properties.Description.rich_text.length != 0 ?
      concatenateTextArray(symptom.properties.Description.rich_text) :
      '';

  return {id, name, description, category, causesIds};
}

// Processes the cause data
function extractCauseInfo(cause) {
  const id = cause.id;
  const name = concatenateTextArray(cause.properties.Name.title);
  const symptomIds =
      cause.properties.Symptoms.relation.map((symptom) => symptom.id);
  const treatmentIds =
      cause.properties.Treatments.relation.map((treatment) => treatment.id);
  return {id, name, symptomIds, treatmentIds};
}

// Processes the treatment data
function extractTreatmentInfo(treatment) {
  const id = treatment.id;
  const name = concatenateTextArray(treatment.properties.Name.title);
  const pageId = treatment.url.split('/').pop();
  const pageUrl = `https://seaber-faq.notion.site/${pageId}`;

  return {id, name, pageUrl};
}

// API endpoint to fetch data from Notion
app.get('/api/data', async (req, res) => {
  try {
    // Fetch and process data from the Notion databases
    const symptomData =
        await fetchDataFromDatabase(SYMPTOMS_DATABASE_ID, extractSymptomInfo);
    const causeData =
        await fetchDataFromDatabase(CAUSES_DATABASE_ID, extractCauseInfo);
    const treatmentData = await fetchDataFromDatabase(
        TREATMENTS_DATABASE_ID, extractTreatmentInfo);

    res.json(
        {symptoms: symptomData, causes: causeData, treatments: treatmentData});
  } catch (error) {
    console.error(error);
    res.status(500).json(
        {error: 'An error occurred while fetching data from Notion'});
  }
});

// Start the server
const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});