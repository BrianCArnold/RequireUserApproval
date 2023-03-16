import * as core from '@actions/core';
import { group } from 'console';
import * as minimatch from 'minimatch';
import { Config, ConfigGroup } from './config';
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

  let { affected: affectedGroups, unaffected: unaffectedGroups } = identifyGroupsByChangedFiles(config, await github.fetch_changed_files());

  for (let groupName in affectedGroups) {
    await github.assign_reviewers(affectedGroups[groupName]);
    core.debug(` - Group: ${groupName}`);
    if (affectedGroups[groupName].required == undefined) {
      core.warning(' - Group Required Count not specified, assuming 1 approver from group required.');
      affectedGroups[groupName].required = 1;
    } else {
      requirementCounts[groupName] = affectedGroups[groupName].required ?? 1;
    }
    requirementMembers[groupName] = {};
    core.debug(` - Requiring ${affectedGroups[groupName].required} of the following:`);
    for (let i in affectedGroups[groupName].members) {

      let member = affectedGroups[groupName].members[i];
      
      if (member.startsWith('team:')) { // extract teams.
        
        let teamMembers = await github.getTeamMembers(member.substring(5));

        for (let j in teamMembers) {
          let teamMember = teamMembers[j];

          requirementMembers[groupName][teamMember] = false;

          core.debug(`   - ${teamMember}`);
        }

      } else {
        requirementMembers[groupName][member] = false;

        core.debug(`   - ${member}`);
      }
    }
  }
  
  let reviewerState: { [group:string] : string } = {};

  core.debug('Getting most recent review for each reviewer...')
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

  core.debug('Checking for required reviewers...');

  for (let groupName in requirementMembers) {
    let groupApprovalRequired = requirementCounts[groupName];
    let groupMemberApprovals = requirementMembers[groupName];
    let groupApprovalCount = 0;
    let groupNotApprovedStrings: string[] = [];
    let groupApprovedStrings: string[] = [];
    for (let member in groupMemberApprovals) {
      if (groupMemberApprovals[member]) {
        groupApprovalCount++;
        groupApprovedStrings.push(member);
      }else {
        groupNotApprovedStrings.push(member);
      }
    }
    // await github.explainStatus(group, groupMemberApprovals, groupCountRequired);
    if (groupApprovalCount >= groupApprovalRequired) {
      //Enough Approvers
      core.startGroup(`✅ ${groupName}: (${groupApprovalCount}/${groupApprovalRequired}) approval(s).`);
      let appCount = 0;
      for (let approval in groupApprovedStrings) {
        core.info(`(${++appCount}/${groupApprovalRequired}) ✅ ${groupApprovedStrings[approval]}`);
      }
      for (let unapproval in groupNotApprovedStrings) {
        core.info(`(${appCount}/${groupApprovalRequired})    ${groupNotApprovedStrings[unapproval]}`);
      }
      core.endGroup();
    } else {
      failed = true;
      failedGroups.push(groupName);
      core.startGroup(`❌ ${groupName}: (${groupApprovalCount}/${groupApprovalRequired}) approval(s).`);
      let appCount = 0;
      for (let approval in groupApprovedStrings) {
        core.info(`(${++appCount}/${groupApprovalRequired}) ✅ ${groupApprovedStrings[approval]}`);
      }
      for (let unapproval in groupNotApprovedStrings) {
        core.info(`(${appCount}/${groupApprovalRequired}) ❌ ${groupNotApprovedStrings[unapproval]}`);
      }
      core.endGroup();
    }
  }
  if (failed) {
    core.setFailed(`Need approval from these groups: ${failedGroups.join(', ')}`);
  }
}

function identifyGroupsByChangedFiles(config: Config, changedFiles: string[]): { affected: { [name: string]:ConfigGroup }, unaffected: { [name: string]:ConfigGroup } } {
  const affected: { [name: string]:ConfigGroup } = {};
  const unaffected: { [name: string]:ConfigGroup } = {};
  for (let groupName in config.groups) {
    const group = config.groups[groupName];
    const fileGlobs = group.paths;
    if (fileGlobs == null || fileGlobs == undefined || fileGlobs.length == 0)
    {
      core.warning(`No specific path globs assigned for group ${groupName}, assuming global approval.`);
      affected[groupName] = group;
    }
    else if (fileGlobs.filter(glob => minimatch.match(changedFiles, glob, {nonull: false,matchBase: true}).length > 0).length > 0){
      affected[groupName] = group;
    } else {
      unaffected[groupName] = group;
    }
  }
  return { affected, unaffected };
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
