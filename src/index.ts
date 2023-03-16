'use strict';

import * as core from '@actions/core';
import github from './github';

async function run() {
  core.info('Fetching configuration file from input "config"...');

  let config;

  try {
    config = await github.fetch_config();
  } catch (error: any) {
    if (error.status === 404) {
      core.warning('No configuration file is found in the base branch; terminating the process');
      return;
    }
    throw error;
  }

  core.info('Getting reviews...');
  let reviews = await github.get_reviews();

  let requirementCounts: { [key: string]: number } = {};
  let requirementMembers: { [key: string]: string[] } = {};
  core.info('Retrieving required group configurations...');
  for (let req in config.groups) {
    requirementCounts[req] = config.groups[req].required;
    requirementMembers[req] = config.groups[req].members;
    core.info(`Requiring ${config.groups[req].required} of the following:`);
    for (let mem in config.groups[req].members) {
      core.info(`  ${mem}`);
    }
  }
  
  let processedReviewers: string[] = [];

  for (let i = 0; i < reviews.length; i++) {
    let review = reviews[i];
    let userName = review.user.login;
    let state = review.state;
    core.info(`Processing ${state} review by ${userName}...`);
    if (!processedReviewers.includes(userName) && state == 'APPROVED')
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
  run().catch((error) => {
    console.log(error);
    core.setFailed(error)
  });
}
