'use strict';

import * as core from '@actions/core';
import { SummaryTableRow } from '@actions/core/lib/summary';
import github from './github';

async function run() {
  core.info('Fetching configuration...');

  let config;

  try {
    config = await github.fetch_config();
  } catch (error: any) {
    if (error.status === 404) {
      core.warning('No configuration file is found in the base branch; terminating the process');
    }
    throw error;
  }

  core.debug("Config: ");
  core.debug(JSON.stringify(config, null, '\t'));

  core.info('Getting reviews...');
  let reviews = await github.get_reviews();

  let requirementCounts: { [group: string]: number } = {};
  let requirementMembers: { [group: string]: { [user: string]: boolean } } = {};
  core.debug('Retrieving required group configurations...');
  for (let req in config.groups) {
    core.debug(` - Group: ${req}`);
    requirementCounts[req] = config.groups[req].required;
    requirementMembers[req] = {};
    core.debug(` - Requiring ${config.groups[req].required} of the following:`);
    for (let i in config.groups[req].members) {
      let member = config.groups[req].members[i];
      requirementMembers[req][member] = false;
      core.debug(`   - ${member}`);
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

  core.debug('Processing reviews...')
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
  let failedGroups: string[] = [];
  core.info('Checking for required reviewers...');

  for (let group in requirementMembers) {
    let groupApprovalRequired = requirementCounts[group];
    let groupMemberApprovals = requirementMembers[group];
    let groupApprovalCount = 0;
    let groupNotApprovedStrings = "";
    let groupApprovedStrings = "";
    for (let member in groupMemberApprovals) {
      if (groupMemberApprovals[member]) {
        groupApprovalCount++;
        groupApprovedStrings += ` - ${member} ✅\n`;
      }
      for (let member in groupMemberApprovals) {
        groupNotApprovedStrings += ` - ${member} ❌\n`;
      }
    }
    // await github.explainStatus(group, groupMemberApprovals, groupCountRequired);
    if (groupApprovalCount >= groupApprovalRequired) {
      //Enough Approvers
      core.summary.addHeading(`Required Approver count met from group: ${group}.`);
    } else {
      failed = true;
      failedGroups.push(group);
      core.summary.addHeading(`Missing ${groupApprovalRequired - groupApprovalCount} approval(s) from group: ${group}.`);
    }
    let table: SummaryTableRow[] = [];
    table.push([ { header: true, data: 'Member'},{ header: true, data: 'Status'} ]);
    for (let member in groupMemberApprovals){
      table.push([ { data: member }, {data: groupMemberApprovals[member] ? '✅' :'❌' }])
    }
    core.summary.addTable(table);
  }
  if (failed) {
    core.setFailed(`Need approval from these groups: ${failedGroups.join(', ')}`);
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
