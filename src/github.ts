'use strict';

import * as core from '@actions/core';
import * as github from '@actions/github';
import { PullsListReviewsResponseData } from '@octokit/types/dist-types/generated/Endpoints.d'
import { Context } from '@actions/github/lib/context';
import { GitHub } from '@actions/github/lib/utils';
import 'lodash/partition';
import yaml from 'yaml';
import { Config } from './config';


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


async function get_reviews(): Promise<PullsListReviewsResponseData> {
  const octokit = get_octokit();
  const context = get_context();
  if (!context.payload.pull_request) {
    throw 'No pull request found.';
  }

  let reviewsResult = await octokit.pulls.listReviews({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request.number
  });
  return reviewsResult.data;
}

async function explainStatus(group: string, approvers: { [key:string]: boolean }, totalRequired: number): Promise<void> {
  const octokit = get_octokit();
  const context = get_context();
  let missingRequired = totalRequired;
  let fullText = "";
  for (let member in approvers) {
    if (approvers[member]) {
      missingRequired--;
    }
    fullText += `${member} ${approvers[member]? '✅' : '❌'}\n`;
  }
  await octokit.checks.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    head_sha: context.sha,
    name: "my-check-name",
    status: "completed",
    conclusion: missingRequired > 0 ? 'failure' : 'success',
    output: {
      title: 'Required Approvers',
      summary: 'Missing',
      text: fullText
    }
  })
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
  explainStatus
};
