import * as core from '@actions/core';
import * as github from '@actions/github';
import { PullsListReviewsResponseData } from '@octokit/types/dist-types/generated/Endpoints.d';
import { Context } from '@actions/github/lib/context';
import { GitHub } from '@actions/github/lib/utils';
import partition from 'lodash/partition';
import yaml from 'yaml';
import { Config, ConfigGroup } from './config';

const teams: { [team: string]: string[] } = {};

async function getTeamMembers(teamName: string): Promise<string[]> {
  const context = get_context();
  const octokit = get_octokit();

  
  const members = await octokit.teams.listMembersInOrg({
    org: context.repo.owner,
    team_slug: teamName
  });

  let teamMembers: string[] = [];

  for (let i = 0; i < members.data.length; i++) {
    let member = members.data[i];
    teamMembers.push(member.login);
  }

  teams[teamName] = teamMembers;

  return teamMembers;
}

async function assign_reviewers(group: ConfigGroup) {
  const context = get_context();
  const octokit = get_octokit();

  if (context.payload.pull_request == undefined) {
    throw 'Pull Request Number is Null';
  }

  const [ teams_with_prefix, individuals ] = partition(group.members, member => member.startsWith('team:'));
  const teams = teams_with_prefix.map((team_with_prefix) => team_with_prefix.replace('team:', ''));

  return octokit.pulls.requestReviewers({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request.number,
    reviewers: individuals,
    team_reviewers: teams,
  });
}

async function fetch_config(): Promise<Config> {
  const context = get_context();
  const octokit = get_octokit();
  const config_path = get_config_path();

  const { data: response_body } = await octokit.repos.getContent({
    owner: context.repo.owner,
    repo: context.repo.repo,
    path: config_path,
    ref: context.ref,
  });

  var ymlContent = Buffer.from(response_body.content, 'base64').toString();

  return yaml.parse(ymlContent);
}

async function fetch_changed_files(): Promise<string[]> {
  const context = get_context();

  if (!context.payload.pull_request) {
    throw 'No pull request found.';
  }
  const octokit = get_octokit();

  const changed_files: string[] = [];

  const per_page = 100;

  let page = 0;

  let number_of_files_in_current_page: number;

  do {
    page += 1;

    const { data: response_body } = await octokit.pulls.listFiles({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.payload.pull_request.number,
      page,
      per_page,
    });

    number_of_files_in_current_page = response_body.length;

    changed_files.push(...response_body.map((file) => file.filename));

  } while (number_of_files_in_current_page === per_page);

  return changed_files;
}

async function get_reviews(): Promise<PullsListReviewsResponseData> {
  const octokit = get_octokit();

  const context = get_context();

  if (!context.payload.pull_request) {
    throw 'No pull request found.';
  }

  const result: PullsListReviewsResponseData = [];

  const per_page = 100;

  let page = 0;

  let number_of_files_in_current_page: number;

  do {
    page += 1;

    const reviewsResult = await octokit.pulls.listReviews({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.payload.pull_request.number,
      page: page,
      per_page: per_page
    });

    number_of_files_in_current_page = reviewsResult.data.length;

    result.push(...reviewsResult.data);

  } while (number_of_files_in_current_page === per_page);

  return result;
}

let cacheContext: Context | null = null;

let cacheToken: string | null = null;

let cacheConfigPath: string | null = null;

let cacheOctoKit: InstanceType<typeof GitHub> | null = null;

let get_context: () => Context = () => cacheContext || (cacheContext = github.context);

let get_token: () => string = () => cacheToken || (cacheToken =core.getInput('token'));

let get_config_path:() => string = () => cacheConfigPath || (cacheConfigPath = core.getInput('config'));

let get_octokit:() => InstanceType<typeof GitHub> = () => cacheOctoKit || (cacheOctoKit = github.getOctokit(get_token()));

export default {
  fetch_config,
  get_reviews,
  fetch_changed_files,
  assign_reviewers,
  getTeamMembers
};
