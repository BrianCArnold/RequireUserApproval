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

  core.info("Config: ");
  core.info(config);

  core.info('Getting reviews...');
  let reviews = await github.get_reviews();

  let requirementCounts: { [key: string]: number } = {};
  let requirementMembers: { [key: string]: string[] } = {};
  core.info('Retrieving required group configurations...');
  for (let req in config.groups) {
    core.info(` - Group: ${req}`);
    core.info(` - Required: ${config.groups[req].required}`);
    requirementCounts[req] = config.groups[req].required;
    requirementMembers[req] = config.groups[req].members;
    core.info(` - Requiring ${config.groups[req].required} of the following:`);
    for (let mem in config.groups[req].members) {
      core.info(`   - ${config.groups[req].members[mem]}`);
    }
  }
  
  let reviewerState: { [key:string] : string } = {};

  let processedReviewers: string[] = [];

  core.info('Getting most recent review for each reviewer...')
  for (let i = 0; i < reviews.length; i++) {
    let review = reviews[i];
    let userName = review.user.login;
    let state = review.state;
    reviewerState[userName] = state;
    core.info(` - Processing ${state} review by ${userName}...`);
  }

  core.info('Processing most review from each user...')
  for (let userName in reviewerState) {
    let state =  reviewerState[userName];
    core.info(` - ${userName}: ${state}`)
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
