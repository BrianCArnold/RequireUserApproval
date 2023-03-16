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

  let requirementCounts: { [group: string]: number } = {};
  let requirementMembers: { [group: string]: { [user: string]: boolean } } = {};
  core.info('Retrieving required group configurations...');
  for (let req in config.groups) {
    core.info(` - Group: ${req}`);
    core.info(` - Required: ${config.groups[req].required}`);
    requirementCounts[req] = config.groups[req].required;
    requirementMembers[req] = {};
    core.info(` - Requiring ${config.groups[req].required} of the following:`);
    for (let i in config.groups[req].members) {
      let member = config.groups[req].members[i];
      requirementMembers[req][member] = false;
      core.info(`   - ${member}`);
    }
  }
  
  let reviewerState: { [group:string] : string } = {};

  core.info('Getting most recent review for each reviewer...')
  for (let i = 0; i < reviews.length; i++) {
    let review = reviews[i];
    let userName = review.user.login;
    let state = review.state;
    reviewerState[userName] = state;
  }

  core.info('Processing reviews...')
  for (let userName in reviewerState) {
    let state =  reviewerState[userName];
    if (state == 'APPROVED')
    {
      for (let group in requirementMembers) {
        for (let member in requirementMembers[group]) {
          if (member == userName) {
            requirementMembers[group][member] = true;
          }
        }
      }
    }
  }
  let failed = false;
  let failedStrings: string = "";
  core.info('Checking for required reviewers...');

  for (let group in requirementMembers) {
    let groupCount = 0;
    for (let member in requirementMembers[group]) {
      if (requirementMembers[group][member]) {
        groupCount++;
      }
    }
    if (groupCount >= requirementCounts[group]) {
      //Enough Approvers
      core.info(`Required Approver count met from group: ${group}.`);
    } else {
      failed = true;
      //Not enough approvers.
      failedStrings += `Missing ${requirementCounts[group] - groupCount} Required Approvers from group: ${group}:\n`;
      for (let member in requirementMembers[group]) {
        let status = requirementMembers[group][member] ? '✅' : '❌';
        failedStrings += ` - ${member} ${status}\n`;
      }
    }
  }
  if (failed) {
    core.setFailed(failedStrings);
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
