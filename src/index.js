'use strict';

const core = require('@actions/core');
const { LOCAL_FILE_MISSING } = require('./constants');
const github = require('./github'); // Don't destructure this object to stub with sinon in tests


async function run() {
  core.info('Fetching configuration file from input "config"...');

  let config;

  try {
    config = await github.fetch_config();
  } catch (error) {
    if (error.status === 404) {
      core.warning('No configuration file is found in the base branch; terminating the process');
      return;
    }
    throw error;
  }

  const { title, is_draft, author } = github.get_pull_request();

  let reviews = await github.get_reviews();

  let requirementCounts = {};
  let requirementMembers = {};

  for (let req in config.groups) {
    requirementCounts[req] = config.groups[req].required;
    requirementMembers[req] = config.groups[req].members;
  }

  let processedReviewers = [];

  for (let i = 0; i < reviews.length; i++) {
    let review = reviews[i];
    let userName = review.user.login;
    if (!processedReviewers.includes(userName))
    {
      processedReviewers.push(userName);
      for (let req in requirementMembers) {
        if (requirementMembers[req].includes(userName)) {
          requirementCounts[req]--;
        }
      }
    }
  }

  for (let req in requirementCounts) {
    if (requirementCounts[req] > 0) {
      core.setFailed('Missing one or more required approvers.');
    }
  }
}

module.exports = {
  run,
};

// Run the action if it's not running in an automated testing environment
if (process.env.NODE_ENV !== 'automated-testing') {
  run().catch((error) => core.setFailed(error));
}
